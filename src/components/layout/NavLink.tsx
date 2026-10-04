"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

export function NavLink({
  href,
  rotulo,
  exato,
  children,
}: {
  href: string;
  rotulo: string;
  exato?: boolean;
  children: ReactNode;
}) {
  const caminho = usePathname();
  const ativo = exato ? caminho === href : caminho.startsWith(href);
  return (
    <Link
      href={href}
      aria-label={rotulo}
      title={rotulo}
      aria-current={ativo ? "page" : undefined}
      className={cn(
        "flex size-11 items-center justify-center rounded-controle transition-colors",
        ativo ? "bg-destaque-suave text-destaque-forte" : "text-texto-suave hover:bg-superficie-suave hover:text-texto",
      )}
    >
      {children}
    </Link>
  );
}
