"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { t } from "@/i18n";
import { aceitarConvite } from "./actions";

export function AceitarConvite({ token }: { token: string }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <Button
        tamanho="lg"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await aceitarConvite(token);
            if (r?.erro) setErro(true);
          })
        }
      >
        {pendente ? t.convite.aceitando : t.convite.aceitar}
      </Button>
      {erro && (
        <p role="alert" className="text-perigo">
          {t.convite.invalido}
        </p>
      )}
    </div>
  );
}
