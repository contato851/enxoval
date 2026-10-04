import "server-only";
import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import zlib from "node:zlib";
import type { Readable } from "node:stream";
import { ExtractionError } from "./types";

/** Faixas que nunca podem ser acessadas a partir do servidor (SSRF). */
// Listas separadas: o Node trata IPv4 mapeado em IPv6 como equivalente e misturaria as regras.
const BLOQUEADOS_V4 = new net.BlockList();
const BLOQUEADOS_V6 = new net.BlockList();
for (const [rede, prefixo] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  BLOQUEADOS_V4.addSubnet(rede, prefixo, "ipv4");
}
for (const [rede, prefixo] of [
  ["::", 96], // não especificado, loopback e IPv4-compatível
  ["::ffff:0:0", 96], // IPv4 mapeado (bloqueado por inteiro: servidores públicos não respondem assim)
  ["64:ff9b::", 96], // NAT64
  ["64:ff9b:1::", 48],
  ["100::", 64],
  ["2001::", 23], // Teredo, benchmarking, ORCHID etc.
  ["2001:db8::", 32],
  ["2002::", 16], // 6to4 (pode embutir IPv4 privado)
  ["fc00::", 7], // ULA
  ["fe80::", 10], // link-local
  ["fec0::", 10],
  ["ff00::", 8], // multicast
] as const) {
  BLOQUEADOS_V6.addSubnet(rede, prefixo, "ipv6");
}

export function isPublicAddress(ip: string): boolean {
  const tipo = net.isIP(ip);
  if (tipo === 4) return !BLOQUEADOS_V4.check(ip, "ipv4");
  if (tipo === 6) {
    return !BLOQUEADOS_V6.check(ip, "ipv6");
  }
  return false;
}

/** Valida a URL: só http/https, portas padrão, sem usuário/senha, sem nomes internos. */
export function parsePublicUrl(
  entrada: string,
  permitir: { ip?: (ip: string) => boolean; qualquerPorta?: boolean } = {},
): URL {
  const ipPermitido = permitir.ip ?? isPublicAddress;
  let url: URL;
  try {
    url = new URL(entrada.trim());
  } catch {
    throw new ExtractionError("url_invalida");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new ExtractionError("url_invalida");
  if (url.username || url.password) throw new ExtractionError("url_invalida");
  if (!permitir.qualquerPorta && url.port && url.port !== "80" && url.port !== "443") throw new ExtractionError("url_invalida");
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (net.isIP(host)) {
    if (!ipPermitido(host)) throw new ExtractionError("endereco_bloqueado");
  } else if (
    !host.includes(".") ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".home.arpa")
  ) {
    throw new ExtractionError("endereco_bloqueado");
  }
  return url;
}

export type SafeFetchOptions = {
  accept: string;
  /** Tipos aceitos na resposta final (ex.: /^text\/html/). */
  contentType: RegExp;
  timeoutMs?: number;
  maxBytes?: number;
  /** "truncar": guarda só o começo (bom para HTML). "erro": falha (bom para imagens). */
  aoPassarDoLimite?: "truncar" | "erro";
  maxRedirects?: number;
  /** Só para testes: relaxa a regra de IPs e portas permitidos. */
  permitir?: { ip?: (ip: string) => boolean; qualquerPorta?: boolean };
};

export type SafeFetchResult = {
  url: URL;
  status: number;
  contentType: string;
  body: Buffer;
  truncado: boolean;
};

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";

/**
 * Busca uma URL pública com proteção contra SSRF:
 * resolve o DNS, recusa qualquer IP interno e conecta exatamente no IP validado
 * (sem DNS rebinding); revalida cada redirecionamento; limita tempo e tamanho.
 */
export async function safeFetch(entrada: string, opts: SafeFetchOptions): Promise<SafeFetchResult> {
  const timeoutMs = opts.timeoutMs ?? 8000;
  const maxRedirects = opts.maxRedirects ?? 3;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let url = parsePublicUrl(entrada, opts.permitir);
    for (let saltos = 0; ; saltos++) {
      const res = await requisitar(url, opts, controller.signal);
      if ("redirect" in res) {
        if (saltos >= maxRedirects) throw new ExtractionError("falha_rede", "redirecionamentos demais");
        url = parsePublicUrl(new URL(res.redirect, url).toString(), opts.permitir);
        continue;
      }
      return res;
    }
  } catch (err) {
    if (controller.signal.aborted) throw new ExtractionError("tempo_esgotado");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function resolverSeguro(host: string, permitido: (ip: string) => boolean) {
  const limpo = host.replace(/^\[|\]$/g, "");
  if (net.isIP(limpo)) {
    if (!permitido(limpo)) throw new ExtractionError("endereco_bloqueado");
    return { address: limpo, family: net.isIP(limpo) };
  }
  let enderecos: { address: string; family: number }[];
  try {
    enderecos = await dns.lookup(limpo, { all: true, verbatim: true });
  } catch {
    throw new ExtractionError("falha_rede", "não foi possível resolver o endereço");
  }
  if (enderecos.length === 0) throw new ExtractionError("falha_rede");
  // Se qualquer IP do nome for interno, recusa tudo.
  if (enderecos.some((e) => !permitido(e.address))) throw new ExtractionError("endereco_bloqueado");
  return enderecos[0];
}

function requisitar(
  url: URL,
  opts: SafeFetchOptions,
  signal: AbortSignal,
): Promise<SafeFetchResult | { redirect: string }> {
  const permitido = opts.permitir?.ip ?? isPublicAddress;
  const maxBytes = opts.maxBytes ?? 2 * 1024 * 1024;

  return resolverSeguro(url.hostname, permitido).then(
    (destino) =>
      new Promise((resolve, reject) => {
        const modulo = url.protocol === "https:" ? https : http;
        const req = modulo.request(
          url,
          {
            method: "GET",
            signal,
            headers: {
              "User-Agent": USER_AGENT,
              Accept: opts.accept,
              "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.6",
              "Accept-Encoding": "gzip, deflate, br",
            },
            // Conecta no IP já validado; o nome continua sendo usado no TLS (SNI) e no Host.
            lookup: (_host, options, cb) => {
              const o = options as { all?: boolean };
              if (o.all) (cb as unknown as (e: null, a: { address: string; family: number }[]) => void)(null, [destino]);
              else cb(null, destino.address, destino.family);
            },
          },
          (res) => {
            const status = res.statusCode ?? 0;
            if (status >= 300 && status < 400 && res.headers.location) {
              res.resume();
              resolve({ redirect: res.headers.location });
              return;
            }
            const contentType = String(res.headers["content-type"] ?? "");
            if (status < 400 && !opts.contentType.test(contentType)) {
              res.destroy();
              reject(new ExtractionError("tipo_invalido", contentType));
              return;
            }
            const declarado = Number(res.headers["content-length"]);
            if (opts.aoPassarDoLimite === "erro" && declarado > maxBytes) {
              res.destroy();
              reject(new ExtractionError("muito_grande"));
              return;
            }

            let corpo: Readable = res;
            const encoding = String(res.headers["content-encoding"] ?? "").toLowerCase();
            if (encoding === "gzip" || encoding === "x-gzip") corpo = res.pipe(zlib.createGunzip());
            else if (encoding === "deflate") corpo = res.pipe(zlib.createInflate());
            else if (encoding === "br") corpo = res.pipe(zlib.createBrotliDecompress());

            const partes: Buffer[] = [];
            let total = 0;
            let terminou = false;
            const finalizar = (truncado: boolean) => {
              if (terminou) return;
              terminou = true;
              resolve({ url, status, contentType, body: Buffer.concat(partes), truncado });
            };
            corpo.on("data", (chunk: Buffer) => {
              if (terminou) return;
              total += chunk.length;
              if (total > maxBytes) {
                if (opts.aoPassarDoLimite === "erro") {
                  terminou = true;
                  res.destroy();
                  reject(new ExtractionError("muito_grande"));
                  return;
                }
                partes.push(chunk.subarray(0, chunk.length - (total - maxBytes)));
                res.destroy();
                finalizar(true);
                return;
              }
              partes.push(chunk);
            });
            corpo.on("end", () => finalizar(false));
            corpo.on("error", (e) => {
              if (!terminou) {
                terminou = true;
                reject(signal.aborted ? new ExtractionError("tempo_esgotado") : new ExtractionError("falha_rede", e.message));
              }
            });
          },
        );
        req.on("error", (e) => {
          reject(signal.aborted ? new ExtractionError("tempo_esgotado") : new ExtractionError("falha_rede", e.message));
        });
        req.end();
      }),
  );
}
