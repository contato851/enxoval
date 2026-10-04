"use client";
import { MailCheck } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { t } from "@/i18n";
import { enviarLink, type EstadoLogin } from "./actions";

export function LoginForm({ next, erroInicial }: { next?: string; erroInicial?: string | null }) {
  const [estado, acao, pendente] = useActionState<EstadoLogin, FormData>(enviarLink, {
    ok: false,
    mensagem: erroInicial ?? null,
  });

  if (estado.ok) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-card bg-destaque-suave p-6 text-center">
        <MailCheck aria-hidden className="size-10 text-destaque" />
        <p className="font-medium">{estado.mensagem}</p>
      </div>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <TextField
        rotulo={t.login.email}
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        placeholder={t.login.placeholderEmail}
        defaultValue={estado.email}
        required
        erro={estado.mensagem}
      />
      <Button type="submit" tamanho="lg" disabled={pendente}>
        {pendente ? t.login.enviando : t.login.enviar}
      </Button>
    </form>
  );
}
