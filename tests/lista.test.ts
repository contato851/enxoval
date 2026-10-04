import { describe, expect, it } from "vitest";
import {
  calcularResumo,
  contadoresPorCategoria,
  filtrarItens,
  ordenarItens,
  pecasPorTamanho,
} from "@/lib/lista";
import { diasAte, lerReais } from "@/lib/format";
import type { PrioridadeItem, StatusItem } from "@/lib/types/database";

const item = (p: Partial<{ nome: string; status: StatusItem; prioridade: PrioridadeItem; preco: number | null; quantidade: number; category_id: string; criado_em: string; tamanho: string | null }>) => ({
  nome: "x",
  status: "a_comprar" as StatusItem,
  prioridade: "essencial" as PrioridadeItem,
  preco: 10,
  quantidade: 1,
  category_id: "c1",
  criado_em: "2026-10-01T00:00:00Z",
  tamanho: null,
  ...p,
});

describe("regras da lista", () => {
  it("resumo: ganhamos não conta em valores, mas conta no progresso", () => {
    const r = calcularResumo([
      item({ status: "a_comprar", preco: 50, quantidade: 2 }),
      item({ status: "comprado", preco: 30 }),
      item({ status: "ganhamos", preco: 1000 }),
      item({ status: "a_comprar", preco: null }),
    ]);
    expect(r).toEqual({ total: 4, resolvidos: 2, previsto: 130, gasto: 30, falta: 100 });
  });

  it("ordena: a comprar antes, essenciais antes, mais novos antes", () => {
    const ordem = ordenarItens([
      item({ nome: "resolvido", status: "comprado" }),
      item({ nome: "espera", prioridade: "pode_esperar" }),
      item({ nome: "velho", criado_em: "2026-01-01T00:00:00Z" }),
      item({ nome: "novo", criado_em: "2026-10-03T00:00:00Z" }),
    ]).map((i) => i.nome);
    expect(ordem).toEqual(["novo", "velho", "espera", "resolvido"]);
  });

  it("filtra por categoria, status, prioridade e busca sem acento", () => {
    const itens = [
      item({ nome: "Banheira dobrável", category_id: "banho" }),
      item({ nome: "Body manga longa", category_id: "roupas", status: "comprado" }),
      item({ nome: "Bodies RN", category_id: "roupas", prioridade: "pode_esperar" }),
    ];
    const base = { categoria: null, status: null, prioridade: null, busca: "" };
    expect(filtrarItens(itens, { ...base, busca: "DOBRAVEL" })).toHaveLength(1);
    expect(filtrarItens(itens, { ...base, categoria: "roupas" })).toHaveLength(2);
    expect(filtrarItens(itens, { ...base, status: "comprado" })).toHaveLength(1);
    expect(filtrarItens(itens, { ...base, prioridade: "pode_esperar" })).toHaveLength(1);
  });

  it("contadores das abas", () => {
    const c = contadoresPorCategoria([
      item({ category_id: "a", status: "comprado" }),
      item({ category_id: "a" }),
      item({ category_id: "b", status: "ganhamos" }),
    ]);
    expect(c(null)).toEqual({ feitos: 2, total: 3 });
    expect(c("a")).toEqual({ feitos: 1, total: 2 });
    expect(c("z")).toEqual({ feitos: 0, total: 0 });
  });

  it("peças por tamanho somam quantidades", () => {
    expect(
      pecasPorTamanho([
        item({ tamanho: "rn", quantidade: 6 }),
        item({ tamanho: "P", quantidade: 4 }),
        item({ tamanho: "1 ano", quantidade: 2 }),
        item({ tamanho: null, quantidade: 9 }),
      ]),
    ).toEqual({ RN: 6, P: 4, M: 0, G: 0, outros: 2 });
  });

  it("formatação", () => {
    expect(lerReais("R$ 1.299,90")).toBe(1299.9);
    expect(lerReais("89.9")).toBe(89.9);
    expect(lerReais("")).toBeNull();
    expect(diasAte("2026-10-14", new Date(2026, 9, 4))).toBe(10);
    expect(diasAte(null)).toBeNull();
  });
});
