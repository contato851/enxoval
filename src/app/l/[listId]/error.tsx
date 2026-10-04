"use client";
import { ErrorState } from "@/components/ui/States";
import { t } from "@/i18n";

export default function ErroLista({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState texto={t.lista.erroCarregar} aoTentar={reset} />;
}
