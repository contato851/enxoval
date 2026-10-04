const PRECO_MAXIMO = 1_000_000;

/**
 * Converte preços em número. Aceita número, "1299.90", "1.299,90", "R$ 89,90", "1.299".
 * Devolve null quando não dá para entender.
 */
export function parsePrice(valor: unknown): number | null {
  if (typeof valor === "number") return normalizar(valor);
  if (typeof valor !== "string") return null;

  const s = valor.replace(/[^\d.,]/g, "");
  if (!/\d/.test(s)) return null;

  const ultimaVirgula = s.lastIndexOf(",");
  const ultimoPonto = s.lastIndexOf(".");
  let numero: string;

  if (ultimaVirgula >= 0 && ultimoPonto >= 0) {
    // O separador que aparece por último é o decimal.
    numero =
      ultimaVirgula > ultimoPonto
        ? s.replace(/\./g, "").replace(",", ".")
        : s.replace(/,/g, "");
  } else if (ultimaVirgula >= 0) {
    const decimais = s.length - ultimaVirgula - 1;
    const virgulas = s.split(",").length - 1;
    numero = decimais === 3 || virgulas > 1 ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (ultimoPonto >= 0) {
    // "1.299" e "12.345.678" são milhares no padrão brasileiro; "1299.9" é decimal.
    numero = /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, "") : s;
  } else {
    numero = s;
  }

  return normalizar(Number(numero));
}

function normalizar(n: number): number | null {
  if (!Number.isFinite(n) || n < 0 || n > PRECO_MAXIMO) return null;
  return Math.round(n * 100) / 100;
}
