import { ChevronDown, ListChecks, Settings, Tags, UserRound } from "lucide-react";
import Link from "next/link";
import { t } from "@/i18n";
import { NavLink } from "./NavLink";

/** Cabeçalho das telas de uma lista: nome (leva à troca de lista) e navegação. */
export function AppHeader({ listId, nome }: { listId: string; nome: string }) {
  const base = `/l/${listId}`;
  return (
    <header className="sticky top-0 z-30 border-b border-borda bg-fundo/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex max-w-conteudo items-center gap-2 px-4 py-2">
        <Link
          href="/listas"
          aria-label={`${nome}. ${t.listas.trocar}`}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-1 rounded-controle px-1 text-lg font-bold"
        >
          <span className="truncate">{nome}</span>
          <ChevronDown aria-hidden className="size-4 shrink-0 text-texto-suave" />
        </Link>
        <nav aria-label={t.comum.menu} className="flex items-center">
          <NavLink href={base} exato rotulo={t.nav.lista}>
            <ListChecks aria-hidden className="size-5" />
          </NavLink>
          <NavLink href={`${base}/categorias`} rotulo={t.nav.categorias}>
            <Tags aria-hidden className="size-5" />
          </NavLink>
          <NavLink href={`${base}/ajustes`} rotulo={t.nav.ajustes}>
            <Settings aria-hidden className="size-5" />
          </NavLink>
          <NavLink href="/conta" rotulo={t.nav.conta}>
            <UserRound aria-hidden className="size-5" />
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
