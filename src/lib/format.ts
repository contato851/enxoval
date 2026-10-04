const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatarReais(valor: number | null | undefined): string {
  return brl.format(valor ?? 0);
}

/** "R$ 1.299,90" → 1299.9; aceita também "1299.90". Vazio → null. */
export function lerReais(texto: string): number | null {
  const limpo = texto.replace(/[^\d,.]/g, "");
  if (!limpo) return null;
  const n = Number(limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

export function dominio(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Dias inteiros de hoje até a data (YYYY-MM-DD), no fuso local. */
export function diasAte(data: string | null | undefined, hoje = new Date()): number | null {
  if (!data) return null;
  const [a, m, d] = data.split("-").map(Number);
  if (!a || !m || !d) return null;
  const alvo = Date.UTC(a, m - 1, d);
  const agora = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((alvo - agora) / 86_400_000);
}

export function formatarData(data: string | null | undefined): string {
  if (!data) return "";
  const [a, m, d] = data.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}
