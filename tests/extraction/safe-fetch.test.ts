import http from "node:http";
import type { AddressInfo } from "node:net";
import zlib from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isPublicAddress, parsePublicUrl, safeFetch } from "@/lib/extraction/safe-fetch";

describe("isPublicAddress", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "192.168.0.10",
    "169.254.169.254", // metadados de nuvem
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "::",
    "fe80::1",
    "fd00::1",
    "::ffff:127.0.0.1",
    "::ffff:a9fe:a9fe",
    "64:ff9b::a00:1",
    "2002:7f00:1::",
  ])("bloqueia %s", (ip) => {
    expect(isPublicAddress(ip)).toBe(false);
  });

  it.each(["8.8.8.8", "200.147.67.142", "2804:14c:65::1", "2606:4700::1111"])("permite %s", (ip) => {
    expect(isPublicAddress(ip)).toBe(true);
  });
});

describe("parsePublicUrl", () => {
  it.each([
    "ftp://exemplo.com/a",
    "file:///etc/passwd",
    "javascript:alert(1)",
    "http://user:senha@exemplo.com/",
    "http://exemplo.com:8080/",
    "não é url",
  ])("recusa %s como inválida", (u) => {
    expect(() => parsePublicUrl(u)).toThrow(expect.objectContaining({ codigo: "url_invalida" }));
  });

  it.each([
    "http://127.0.0.1/",
    "http://[::1]/",
    "http://169.254.169.254/latest/meta-data/",
    "http://localhost/",
    "http://intranet/",
    "http://servidor.local/",
    "http://0x7f000001/",
  ])("recusa %s como endereço interno", (u) => {
    expect(() => parsePublicUrl(u)).toThrow(expect.objectContaining({ codigo: "endereco_bloqueado" }));
  });

  it("aceita URL pública", () => {
    expect(parsePublicUrl(" https://www.amazon.com.br/dp/X ").hostname).toBe("www.amazon.com.br");
  });
});

describe("safeFetch contra servidor local", () => {
  let servidor: http.Server;
  let base: string;
  const soLocal = { ip: (ip: string) => ip === "127.0.0.1", qualquerPorta: true };

  beforeAll(async () => {
    servidor = http.createServer((req, res) => {
      if (req.url === "/html") {
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end("<title>ok</title>");
      } else if (req.url === "/gzip") {
        res.writeHead(200, { "content-type": "text/html", "content-encoding": "gzip" });
        res.end(zlib.gzipSync("<title>comprimido</title>"));
      } else if (req.url === "/grande") {
        res.writeHead(200, { "content-type": "text/html" });
        res.end("a".repeat(5000));
      } else if (req.url === "/para-interno") {
        res.writeHead(302, { location: "http://169.254.169.254/latest/meta-data/" });
        res.end();
      } else if (req.url === "/loop") {
        res.writeHead(302, { location: "/loop" });
        res.end();
      } else if (req.url === "/lento") {
        setTimeout(() => res.end("<title>tarde</title>"), 2000);
      } else if (req.url === "/pdf") {
        res.writeHead(200, { "content-type": "application/pdf" });
        res.end("%PDF");
      } else if (req.url === "/redireciona") {
        res.writeHead(301, { location: "/html" });
        res.end();
      } else {
        res.writeHead(403, { "content-type": "text/html" });
        res.end("bloqueado");
      }
    });
    await new Promise<void>((r) => servidor.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
  });

  afterAll(() => {
    servidor.closeAllConnections();
    servidor.close();
  });

  const html = { accept: "text/html", contentType: /^text\/html/ };

  it("sem liberação explícita, o próprio servidor local é bloqueado", async () => {
    await expect(safeFetch(`${base}/html`, { ...html, permitir: { qualquerPorta: true } })).rejects.toMatchObject({
      codigo: "endereco_bloqueado",
    });
  });

  it("busca HTML", async () => {
    const r = await safeFetch(`${base}/html`, { ...html, permitir: soLocal });
    expect(r.status).toBe(200);
    expect(r.body.toString()).toBe("<title>ok</title>");
  });

  it("descomprime gzip", async () => {
    const r = await safeFetch(`${base}/gzip`, { ...html, permitir: soLocal });
    expect(r.body.toString()).toBe("<title>comprimido</title>");
  });

  it("segue redirecionamento", async () => {
    const r = await safeFetch(`${base}/redireciona`, { ...html, permitir: soLocal });
    expect(r.url.pathname).toBe("/html");
  });

  it("bloqueia redirecionamento para IP interno", async () => {
    await expect(safeFetch(`${base}/para-interno`, { ...html, permitir: soLocal })).rejects.toMatchObject({
      codigo: "endereco_bloqueado",
    });
  });

  it("limita a quantidade de redirecionamentos", async () => {
    await expect(safeFetch(`${base}/loop`, { ...html, permitir: soLocal })).rejects.toMatchObject({
      codigo: "falha_rede",
    });
  });

  it("respeita o timeout", async () => {
    await expect(safeFetch(`${base}/lento`, { ...html, timeoutMs: 300, permitir: soLocal })).rejects.toMatchObject({
      codigo: "tempo_esgotado",
    });
  });

  it("trunca HTML grande ou falha, conforme a opção", async () => {
    const r = await safeFetch(`${base}/grande`, { ...html, maxBytes: 1000, aoPassarDoLimite: "truncar", permitir: soLocal });
    expect(r.body.length).toBe(1000);
    expect(r.truncado).toBe(true);
    await expect(
      safeFetch(`${base}/grande`, { ...html, maxBytes: 1000, aoPassarDoLimite: "erro", permitir: soLocal }),
    ).rejects.toMatchObject({ codigo: "muito_grande" });
  });

  it("recusa tipo de conteúdo inesperado", async () => {
    await expect(safeFetch(`${base}/pdf`, { ...html, permitir: soLocal })).rejects.toMatchObject({
      codigo: "tipo_invalido",
    });
  });

  it("devolve o status de erro da loja", async () => {
    const r = await safeFetch(`${base}/qualquer`, { ...html, permitir: soLocal });
    expect(r.status).toBe(403);
  });
});
