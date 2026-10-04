import "server-only";
import { headers } from "next/headers";

/** Endereço público do app. Usa NEXT_PUBLIC_SITE_URL; sem ela, deduz dos cabeçalhos (Vercel). */
export async function siteUrl(): Promise<string> {
  const definido = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (definido) return definido;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
