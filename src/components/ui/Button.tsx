import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

type Variante = "primario" | "secundario" | "fantasma" | "perigo";
type Tamanho = "md" | "sm" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-controle font-semibold transition-colors select-none disabled:opacity-50";
const variantes: Record<Variante, string> = {
  primario: "bg-destaque text-superficie hover:bg-destaque-forte",
  secundario: "bg-superficie text-texto border border-borda-forte hover:bg-superficie-suave",
  fantasma: "text-texto hover:bg-superficie-suave",
  perigo: "bg-perigo text-superficie hover:opacity-90",
};
const tamanhos: Record<Tamanho, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-base",
  lg: "h-13 px-5 text-lg",
};

export function botaoClasses(variante: Variante = "primario", tamanho: Tamanho = "md", extra?: string) {
  return cn(base, variantes[variante], tamanhos[tamanho], extra);
}

type BotaoProps = ComponentProps<"button"> & { variante?: Variante; tamanho?: Tamanho; icone?: ReactNode };

export function Button({ variante, tamanho, icone, className, children, type = "button", ...props }: BotaoProps) {
  return (
    <button type={type} className={botaoClasses(variante, tamanho, className)} {...props}>
      {icone}
      {children}
    </button>
  );
}

type LinkBotaoProps = ComponentProps<typeof Link> & { variante?: Variante; tamanho?: Tamanho; icone?: ReactNode };

export function LinkButton({ variante, tamanho, icone, className, children, ...props }: LinkBotaoProps) {
  return (
    <Link className={botaoClasses(variante, tamanho, className)} {...props}>
      {icone}
      {children}
    </Link>
  );
}

type IconeProps = ComponentProps<"button"> & { rotulo: string; variante?: "fantasma" | "secundario" | "perigo" };

/** Botão só com ícone: sempre com rótulo acessível e área de toque de 44px. */
export function IconButton({ rotulo, variante = "fantasma", className, children, type = "button", ...props }: IconeProps) {
  return (
    <button
      type={type}
      aria-label={rotulo}
      title={rotulo}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-controle transition-colors disabled:opacity-40",
        variante === "fantasma" && "text-texto-suave hover:bg-superficie-suave hover:text-texto",
        variante === "secundario" && "border border-borda bg-superficie text-texto hover:bg-superficie-suave",
        variante === "perigo" && "text-perigo hover:bg-perigo-suave",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
