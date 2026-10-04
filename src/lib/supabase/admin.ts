import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { supabasePublicEnv } from "./env";

/**
 * Cliente com a chave secreta: ignora RLS. Usado SOMENTE para excluir a conta
 * (remover arquivos e o usuário do Auth) e abrir a sessão da conta compartilhada.
 * Nunca importe isto em código de cliente.
 */
export function createAdminClient() {
  const { url } = supabasePublicEnv();
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Configure SUPABASE_SERVICE_ROLE_KEY no servidor.");
  return createClient<Database>(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
