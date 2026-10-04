"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";

let cliente: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Cliente do navegador: usa só a chave pública; a RLS protege os dados. */
export function createClient() {
  if (!cliente) {
    cliente = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
  }
  return cliente;
}
