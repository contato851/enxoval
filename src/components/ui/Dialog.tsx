"use client";
import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { t } from "@/i18n";
import { IconButton } from "./Button";

type Props = {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  children: ReactNode;
  rodape?: ReactNode;
};

/** Diálogo modal com <dialog> nativo: foco preso, Esc fecha, foco volta ao botão de origem. */
export function Dialog({ aberto, aoFechar, titulo, children, rodape }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const tituloId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (aberto && !el.open) el.showModal();
    if (!aberto && el.open) el.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={tituloId}
      onClose={aoFechar}
      onClick={(e) => {
        if (e.target === ref.current) aoFechar();
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-card bg-superficie p-0 text-texto shadow-flutuante backdrop:bg-sobreposicao"
    >
      {aberto && (
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex items-start justify-between gap-2 border-b border-borda px-5 py-3">
            <h2 id={tituloId} className="pt-2 text-lg font-semibold">
              {titulo}
            </h2>
            <IconButton rotulo={t.comum.fechar} onClick={aoFechar}>
              <X aria-hidden className="size-5" />
            </IconButton>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {rodape && <div className="flex flex-wrap justify-end gap-2 border-t border-borda px-5 py-3">{rodape}</div>}
        </div>
      )}
    </dialog>
  );
}
