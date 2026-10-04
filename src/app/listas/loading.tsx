import { Skeleton } from "@/components/ui/States";

export default function Carregando() {
  return (
    <main className="mx-auto flex w-full max-w-formulario flex-col gap-4 px-4 py-6" aria-busy="true">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-64 w-full" />
    </main>
  );
}
