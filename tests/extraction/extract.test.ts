import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractFromHtml } from "@/lib/extraction/parse";
import { limparTitulo } from "@/lib/extraction/generic";

// Fixtures com a estrutura das páginas de cada loja (reduzidas a mão).
const fixture = (nome: string) => readFileSync(join(__dirname, "fixtures", nome), "utf8");

describe("extractFromHtml", () => {
  it("Mercado Livre: JSON-LD, preço e galeria", () => {
    const r = extractFromHtml(fixture("mercadolivre.html"), new URL("https://produto.mercadolivre.com.br/MLB-123"));
    expect(r.titulo).toBe("Kit 5 Bodies Bebê Manga Longa Algodão");
    expect(r.preco).toBe(89.9);
    expect(r.loja).toBe("produto.mercadolivre.com.br");
    expect(r.imagens[0]).toBe("https://http2.mlstatic.com/D_NQ_NP_2X_123-MLB-F.jpg");
    expect(r.imagens).toContain("https://http2.mlstatic.com/D_NQ_NP_123-MLB-O.jpg");
    expect(r.imagens.every((u) => u.startsWith("https://"))).toBe(true);
  });

  it("Magalu: JSON-LD em array com AggregateOffer", () => {
    const r = extractFromHtml(fixture("magalu.html"), new URL("https://www.magazineluiza.com.br/carrinho/p/abc/"));
    expect(r.titulo).toBe("Carrinho de Bebê Travel System Preto");
    expect(r.preco).toBe(1299.9);
    expect(r.loja).toBe("magazineluiza.com.br");
    expect(r.imagens).toHaveLength(2);
  });

  it("Amazon: título, preço em reais e maior imagem", () => {
    const r = extractFromHtml(fixture("amazon.html"), new URL("https://www.amazon.com.br/dp/B0TESTE"));
    expect(r.titulo).toBe("Babá Eletrônica com Câmera Wi-Fi e Visão Noturna");
    expect(r.preco).toBe(349);
    expect(r.imagens[0]).toBe("https://m.media-amazon.com/images/I/71abc._AC_SL1500_.jpg");
    expect(r.imagens[1]).toBe("https://m.media-amazon.com/images/I/71abc._AC_SX679_.jpg");
    expect(r.imagens).toContain("https://m.media-amazon.com/images/I/61xyz._AC_SL1200_.jpg");
    expect(r.imagens.some((u) => u.includes("transparent-pixel"))).toBe(false);
  });

  it("Amazon com captcha vira bloqueio", () => {
    expect(() => extractFromHtml(fixture("amazon-captcha.html"), new URL("https://www.amazon.com.br/dp/X"))).toThrow(
      expect.objectContaining({ codigo: "bloqueado_pela_loja" }),
    );
  });

  it("Shopee sem Open Graph não tem dados (plano B)", () => {
    expect(() => extractFromHtml(fixture("shopee.html"), new URL("https://shopee.com.br/produto-i.1.2"))).toThrow(
      expect.objectContaining({ codigo: "sem_dados" }),
    );
  });

  it("Shopee com Open Graph", () => {
    const r = extractFromHtml(fixture("shopee-og.html"), new URL("https://shopee.com.br/produto-i.1.2"));
    expect(r.titulo).toBe("Fralda de Pano Kit 10");
    expect(r.preco).toBe(45.9);
    expect(r.imagens).toHaveLength(1);
  });

  it("JSON-LD com @graph, tipo em array, ImageObject relativo e bloco inválido", () => {
    const r = extractFromHtml(fixture("grafo.html"), new URL("https://loja.exemplo.com/p/1"));
    expect(r.titulo).toBe("Banheira Dobrável");
    expect(r.preco).toBe(199.9);
    expect(r.imagens).toEqual(["https://loja.exemplo.com/img/banheira.jpg"]);
  });
});

describe("limparTitulo", () => {
  it.each([
    ["Produto X | Mercado Livre", "Produto X"],
    ["Produto X - Magazine Luiza", "Produto X"],
    ["Amazon.com.br: Produto X", "Produto X"],
    ["  Produto   X  ", "Produto X"],
    ["Amazon.com.br", null],
    ["", null],
  ])("%j → %j", (entrada, esperado) => {
    expect(limparTitulo(entrada)).toBe(esperado);
  });
});
