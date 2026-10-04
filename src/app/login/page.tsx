import type { Metadata } from "next";
import { Baby } from "lucide-react";
import { t } from "@/i18n";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: { absolute: t.login.titulo } };

const ERROS: Record<string, string> = {
  nao_autorizado: t.login.naoAutorizado,
  link_invalido: t.login.linkInvalido,
};

export default async function Login({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const erro = typeof sp.erro === "string" ? (ERROS[sp.erro] ?? null) : null;
  const excluida = sp.conta === "excluida";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-formulario flex-col justify-center gap-8 px-4 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-16 items-center justify-center rounded-pilula bg-destaque-suave text-destaque">
          <Baby aria-hidden className="size-8" />
        </span>
        <h1 className="text-2xl font-bold">{t.login.titulo}</h1>
        <p className="text-texto-suave">{t.login.subtitulo}</p>
      </div>
      {excluida && (
        <p role="status" className="rounded-controle bg-superficie-suave p-3 text-center text-sm">
          {t.login.contaExcluida}
        </p>
      )}
      <div className="rounded-card bg-superficie p-6 shadow-card">
        <LoginForm next={next} erroInicial={erro} />
      </div>
    </main>
  );
}
