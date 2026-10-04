import { describe, expect, it } from "vitest";
import { parsePrice } from "@/lib/extraction/price";

describe("parsePrice", () => {
  it.each([
    [89.9, 89.9],
    ["89.9", 89.9],
    ["1299.90", 1299.9],
    ["1.299,90", 1299.9],
    ["R$ 1.299,90", 1299.9],
    ["R$ 89,90", 89.9],
    ["1.299", 1299],
    ["12.345.678", 12345678 > 1_000_000 ? null : 12345678],
    ["1,299.90", 1299.9],
    ["49,9", 49.9],
    ["1,299", 1299],
    ["0", 0],
  ])("%j → %j", (entrada, esperado) => {
    expect(parsePrice(entrada)).toBe(esperado);
  });

  it.each([null, undefined, "", "grátis", -5, Number.NaN, {}])("%j → null", (entrada) => {
    expect(parsePrice(entrada)).toBeNull();
  });
});
