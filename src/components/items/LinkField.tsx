"use client";
import { ClipboardPaste, Link as LinkIcon } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { campoClasses } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/States";
import { cn } from "@/components/ui/cn";
import { t } from "@/i18n";

type Props = {
  valor: string;
  aoMudar: (v: string) => void;
  /** Chamado quando há um link completo para buscar (colar, botão ou sair do campo). */
  aoConfirmar: (v: string) => void;
  buscando: boolean;
  mensagem?: { tipo: "ok" | "erro"; texto: string; extra?: React.ReactNode } | null;
};

/** Campo de link em destaque, com botão "Colar link" (um toque no iPhone). */
export function LinkField({ valor, aoMudar, aoConfirmar, buscando, mensagem }: Props) {
  const id = useId();
  const [colarFalhou, setColarFalhou] = useState(false);

  async function colar() {
    setColarFalhou(false);
    try {
      const texto = (await navigator.clipboard.readText()).trim();
      const url = texto.match(/https?:\/\/\S+/)?.[0] ?? texto;
      if (url) {
        aoMudar(url);
        aoConfirmar(url);
      }
    } catch {
      setColarFalhou(true);
      document.getElementById(id)?.focus();
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-card border-2 border-destaque bg-destaque-suave p-4">
      <label htmlFor={id} className="flex items-center gap-2 text-base font-bold text-destaque-forte">
        <LinkIcon aria-hidden className="size-5" />
        {t.form.link}
      </label>
      <p className="text-sm text-texto-suave" id={`${id}-dica`}>
        {t.form.linkDica}
      </p>
      <div className="flex gap-2">
        <input
          id={id}
          type="url"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={valor}
          placeholder={t.form.placeholderLink}
          aria-describedby={`${id}-dica ${id}-msg`}
          onChange={(e) => aoMudar(e.target.value)}
          onPaste={(e) => {
            const colado = e.clipboardData.getData("text").trim();
            const url = colado.match(/https?:\/\/\S+/)?.[0];
            if (url) {
              e.preventDefault();
              aoMudar(url);
              aoConfirmar(url);
            }
          }}
          onBlur={() => valor.trim() && aoConfirmar(valor.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (valor.trim()) aoConfirmar(valor.trim());
            }
          }}
          className={cn(campoClasses, "h-12 min-w-0 flex-1 bg-superficie")}
        />
        <Button onClick={colar} icone={<ClipboardPaste aria-hidden className="size-5" />} className="h-12 shrink-0">
          {t.form.colarLink}
        </Button>
      </div>
      <div id={`${id}-msg`} aria-live="polite" className="min-h-5 text-sm">
        {buscando ? (
          <span className="flex items-center gap-2 text-texto-suave">
            <Spinner rotulo={t.form.buscando} className="text-destaque" />
            {t.form.buscando}
          </span>
        ) : colarFalhou ? (
          <p className="text-texto-suave">{t.form.colarNegado}</p>
        ) : mensagem ? (
          <div className={cn("flex flex-col gap-1", mensagem.tipo === "erro" ? "text-perigo" : "text-destaque-forte")}>
            <p className="font-semibold">{mensagem.texto}</p>
            {mensagem.extra}
          </div>
        ) : null}
      </div>
    </div>
  );
}
