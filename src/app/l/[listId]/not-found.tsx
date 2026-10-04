import { LinkButton } from "@/components/ui/Button";
import { t } from "@/i18n";

export default function ListaNaoEncontrada() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-bold">{t.lista.naoEncontrada}</h1>
      <LinkButton href="/listas">{t.listas.titulo}</LinkButton>
    </main>
  );
}
