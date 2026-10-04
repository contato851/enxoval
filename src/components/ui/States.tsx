"use client";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { t } from "@/i18n";
import { Button } from "./Button";
import { cn } from "./cn";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-controle bg-superficie-suave", className)} />;
}

export function Spinner({ rotulo = t.comum.carregando, className }: { rotulo?: string; className?: string }) {
  return (
    <span role="status" className={cn("inline-flex items-center gap-2 text-texto-suave", className)}>
      <Loader2 aria-hidden className="size-5 animate-spin" />
      <span className="sr-only">{rotulo}</span>
    </span>
  );
}

export function EmptyState({
  icone,
  titulo,
  texto,
  acao,
}: {
  icone?: ReactNode;
  titulo: string;
  texto?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-borda-forte bg-superficie px-6 py-12 text-center">
      {icone && <div className="text-texto-suave">{icone}</div>}
      <p className="text-lg font-semibold">{titulo}</p>
      {texto && <p className="max-w-sm text-texto-suave">{texto}</p>}
      {acao}
    </div>
  );
}

export function ErrorState({ texto = t.comum.erroGenerico, aoTentar }: { texto?: string; aoTentar?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-card border border-perigo bg-perigo-suave px-6 py-10 text-center"
    >
      <AlertTriangle aria-hidden className="size-8 text-perigo" />
      <p className="font-semibold text-perigo">{texto}</p>
      {aoTentar && (
        <Button variante="secundario" onClick={aoTentar}>
          {t.comum.tentarDeNovo}
        </Button>
      )}
    </div>
  );
}
