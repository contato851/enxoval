"use client";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { t } from "@/i18n";
import { excluirConta } from "./actions";

export function ExcluirConta() {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Button variante="perigo" icone={<Trash2 aria-hidden className="size-4" />} onClick={() => setAberto(true)}>
        {t.conta.excluir}
      </Button>
      <ConfirmDialog
        aberto={aberto}
        aoFechar={() => setAberto(false)}
        titulo={t.conta.excluirTitulo}
        rotuloConfirmar={t.conta.excluir}
        exigirTexto={t.conta.palavra}
        rotuloTexto={t.conta.palavra}
        aoConfirmar={() => excluirConta(t.conta.palavra)}
      >
        <p>{t.conta.excluirTexto}</p>
      </ConfirmDialog>
    </>
  );
}
