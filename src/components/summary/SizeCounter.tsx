import { t } from "@/i18n";
import { pecasPorTamanho, TAMANHOS_PADRAO } from "@/lib/lista";
import type { Item } from "@/lib/types/database";

export function SizeCounter({ itens }: { itens: Pick<Item, "tamanho" | "quantidade">[] }) {
  const c = pecasPorTamanho(itens);
  const tamanhos: [string, number][] = [...TAMANHOS_PADRAO.map((tam) => [tam, c[tam]] as [string, number])];
  if (c.outros) tamanhos.push([t.tamanhos.outros, c.outros]);
  return (
    <section aria-label={t.tamanhos.titulo} className="flex flex-wrap items-center gap-2">
      <h2 className="text-sm font-semibold text-texto-suave">{t.tamanhos.titulo}:</h2>
      <ul className="flex flex-wrap gap-2">
        {tamanhos.map(([tam, n]) => (
          <li key={tam} className="rounded-pilula border border-borda bg-superficie px-3 py-1 text-sm">
            <span className="font-semibold">{tam}</span> <span className="tabular-nums text-texto-suave">{n}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
