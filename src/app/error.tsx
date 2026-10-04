"use client";
import { ErrorState } from "@/components/ui/States";
import { t } from "@/i18n";

export default function Erro({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
      <h1 className="sr-only">{t.erros.paginaTitulo}</h1>
      <ErrorState aoTentar={reset} />
    </main>
  );
}
