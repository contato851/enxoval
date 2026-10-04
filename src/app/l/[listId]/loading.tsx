import { Skeleton } from "@/components/ui/States";
import { t } from "@/i18n";

export default function Carregando() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label={t.comum.carregando}>
      <Skeleton className="h-36 w-full rounded-card" />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-20 w-aba shrink-0 rounded-card" />
        ))}
      </div>
      <Skeleton className="h-11 w-full" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="aspect-[3/5] w-full rounded-card" />
        ))}
      </div>
    </div>
  );
}
