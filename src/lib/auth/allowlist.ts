/**
 * Allowlist de cadastro. Com ALLOWED_EMAILS definida, só esses emails entram.
 * Sem a variável (ou vazia), o cadastro fica aberto. Só roda no servidor.
 */
export function emailPermitido(email: string | null | undefined): boolean {
  if (!email) return false;
  const lista = (process.env.ALLOWED_EMAILS ?? "")
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (lista.length === 0) return true;
  return lista.includes(email.trim().toLowerCase());
}

/** Só aceita caminhos internos como destino depois do login (evita open redirect). */
export function destinoSeguro(next: string | null | undefined, padrao = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return padrao;
  return next;
}
