"use client";
import { useState, type ReactNode } from "react";
import { t } from "@/i18n";
import { Button } from "./Button";
import { Dialog } from "./Dialog";

type Props = {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  children: ReactNode;
  rotuloConfirmar?: string;
  /** Texto que o usuário precisa digitar para liberar a confirmação (ações graves). */
  exigirTexto?: string;
  rotuloTexto?: string;
  aoConfirmar: () => Promise<void> | void;
  desabilitado?: boolean;
};

export function ConfirmDialog({
  aberto,
  aoFechar,
  titulo,
  children,
  rotuloConfirmar = t.comum.excluir,
  exigirTexto,
  rotuloTexto,
  aoConfirmar,
  desabilitado,
}: Props) {
  const [ocupado, setOcupado] = useState(false);
  const [digitado, setDigitado] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const liberado = !exigirTexto || digitado.trim() === exigirTexto;

  async function confirmar() {
    setOcupado(true);
    setErro(null);
    try {
      await aoConfirmar();
      setDigitado("");
      aoFechar();
    } catch (e) {
      setErro(e instanceof Error && e.message ? e.message : t.comum.erroGenerico);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Dialog
      aberto={aberto}
      aoFechar={() => {
        if (!ocupado) {
          setDigitado("");
          setErro(null);
          aoFechar();
        }
      }}
      titulo={titulo}
      rodape={
        <>
          <Button variante="secundario" onClick={aoFechar} disabled={ocupado}>
            {t.comum.cancelar}
          </Button>
          <Button variante="perigo" onClick={confirmar} disabled={ocupado || !liberado || desabilitado}>
            {ocupado ? t.comum.excluindo : rotuloConfirmar}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 text-base">
        {children}
        {exigirTexto && (
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {rotuloTexto}
            <input
              value={digitado}
              onChange={(e) => setDigitado(e.target.value)}
              autoComplete="off"
              className="h-11 rounded-controle border border-borda-forte bg-superficie px-3 text-base font-normal"
            />
          </label>
        )}
        {erro && (
          <p role="alert" className="text-sm font-medium text-perigo">
            {erro}
          </p>
        )}
      </div>
    </Dialog>
  );
}
