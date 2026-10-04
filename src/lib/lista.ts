import type { Categoria, Item, PrioridadeItem, StatusItem } from "@/lib/types/database";

export const STATUS: StatusItem[] = ["a_comprar", "comprado", "ganhamos"];
export const PRIORIDADES: PrioridadeItem[] = ["essencial", "pode_esperar"];
export const TAMANHOS_PADRAO = ["RN", "P", "M", "G"] as const;
export const MAX_IMAGENS = 4;

export const resolvido = (s: StatusItem) => s !== "a_comprar";

export type Filtros = {
  categoria: string | null; // null = Todos
  status: StatusItem | null;
  prioridade: PrioridadeItem | null;
  busca: string;
};

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** A comprar primeiro; dentro disso essenciais primeiro; depois os mais novos. Resolvidos no fim. */
export function ordenarItens<T extends Pick<Item, "status" | "prioridade" | "criado_em">>(itens: T[]): T[] {
  return [...itens].sort((a, b) => {
    const r = Number(resolvido(a.status)) - Number(resolvido(b.status));
    if (r) return r;
    const p = PRIORIDADES.indexOf(a.prioridade) - PRIORIDADES.indexOf(b.prioridade);
    if (p) return p;
    return b.criado_em.localeCompare(a.criado_em);
  });
}

export function filtrarItens<T extends Pick<Item, "category_id" | "status" | "prioridade" | "nome">>(
  itens: T[],
  f: Filtros,
): T[] {
  const termo = semAcento(f.busca.trim());
  return itens.filter(
    (i) =>
      (!f.categoria || i.category_id === f.categoria) &&
      (!f.status || i.status === f.status) &&
      (!f.prioridade || i.prioridade === f.prioridade) &&
      (!termo || semAcento(i.nome).includes(termo)),
  );
}

export type Resumo = {
  total: number;
  resolvidos: number;
  previsto: number;
  gasto: number;
  falta: number;
};

/** Valores = preço × quantidade. "Ganhamos" conta no progresso, mas não em valores. */
export function calcularResumo(itens: Pick<Item, "status" | "preco" | "quantidade">[]): Resumo {
  let gasto = 0;
  let falta = 0;
  let resolvidos = 0;
  for (const i of itens) {
    const valor = (i.preco ?? 0) * i.quantidade;
    if (i.status === "comprado") gasto += valor;
    if (i.status === "a_comprar") falta += valor;
    if (resolvido(i.status)) resolvidos++;
  }
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return { total: itens.length, resolvidos, previsto: r2(gasto + falta), gasto: r2(gasto), falta: r2(falta) };
}

/** Contador das abas: resolvidos/total por categoria (e "Todos"). */
export function contadoresPorCategoria(itens: Pick<Item, "category_id" | "status">[]) {
  const mapa = new Map<string | null, { feitos: number; total: number }>();
  const somar = (chave: string | null, feito: boolean) => {
    const c = mapa.get(chave) ?? { feitos: 0, total: 0 };
    c.total++;
    if (feito) c.feitos++;
    mapa.set(chave, c);
  };
  for (const i of itens) {
    somar(null, resolvido(i.status));
    somar(i.category_id, resolvido(i.status));
  }
  return (chave: string | null) => mapa.get(chave) ?? { feitos: 0, total: 0 };
}

/** Peças por tamanho (soma das quantidades). Tamanhos fora de RN/P/M/G vão para "outros". */
export function pecasPorTamanho(itens: Pick<Item, "tamanho" | "quantidade">[]) {
  const contagem: Record<string, number> = { RN: 0, P: 0, M: 0, G: 0, outros: 0 };
  for (const i of itens) {
    const tam = (i.tamanho ?? "").trim().toUpperCase();
    if (!tam) continue;
    if ((TAMANHOS_PADRAO as readonly string[]).includes(tam)) contagem[tam] += i.quantidade;
    else contagem.outros += i.quantidade;
  }
  return contagem;
}

export function ordenarCategorias<T extends Pick<Categoria, "ordem" | "nome">>(cats: T[]): T[] {
  return [...cats].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR"));
}
