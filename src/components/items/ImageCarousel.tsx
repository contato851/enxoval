"use client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/components/ui/cn";
import { t } from "@/i18n";

/**
 * Área de imagem padronizada: sempre 1:1, object-fit contain, fundo neutro.
 * Com mais de uma imagem vira carrossel (deslizar no celular, setas no teclado/desktop).
 */
export function ImageCarousel({ urls, alt, atenuada }: { urls: string[]; alt: string; atenuada?: boolean }) {
  const trilho = useRef<HTMLDivElement>(null);
  const [atual, setAtual] = useState(0);
  const varias = urls.length > 1;

  function irPara(i: number) {
    const el = trilho.current;
    if (!el) return;
    const alvo = (i + urls.length) % urls.length;
    el.scrollTo({ left: alvo * el.clientWidth, behavior: "smooth" });
    setAtual(alvo);
  }

  return (
    <div
      className={cn(
        "group relative aspect-square w-full overflow-hidden rounded-imagem bg-superficie-suave",
        atenuada && "opacity-60",
      )}
      role={varias ? "region" : undefined}
      aria-roledescription={varias ? "carrossel" : undefined}
      aria-label={varias ? alt : undefined}
      onKeyDown={(e) => {
        if (!varias) return;
        if (e.key === "ArrowRight") irPara(atual + 1);
        if (e.key === "ArrowLeft") irPara(atual - 1);
      }}
    >
      {urls.length === 0 ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/placeholder.svg" alt={t.item.semImagem} className="size-full object-contain p-[18%]" />
      ) : (
        <div
          ref={trilho}
          className="scroll-sem-barra flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
          onScroll={(e) => {
            const el = e.currentTarget;
            const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
            if (i !== atual) setAtual(i);
          }}
        >
          {urls.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt={varias ? `${alt}. ${t.item.imagemDe(i + 1, urls.length)}` : alt}
              loading="lazy"
              decoding="async"
              draggable={false}
              className="size-full shrink-0 snap-center object-contain p-2"
            />
          ))}
        </div>
      )}

      {varias && (
        <>
          <button
            type="button"
            onClick={() => irPara(atual - 1)}
            aria-label={t.item.imagemAnterior}
            className="absolute left-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-pilula bg-superficie/90 text-texto opacity-0 shadow-card transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => irPara(atual + 1)}
            aria-label={t.item.proximaImagem}
            className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-pilula bg-superficie/90 text-texto opacity-0 shadow-card transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            <ChevronRight aria-hidden className="size-5" />
          </button>
          <div aria-hidden className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
            {urls.map((url, i) => (
              <span
                key={url}
                className={cn(
                  "size-2 rounded-pilula border border-superficie transition-colors",
                  i === atual ? "bg-texto" : "bg-borda-forte",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
