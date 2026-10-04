"use client";
import { Check, ChevronLeft, ChevronRight, ImagePlus, Link2, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { campoClasses } from "@/components/ui/Field";
import { cn } from "@/components/ui/cn";
import { t } from "@/i18n";
import { MAX_IMAGENS } from "@/lib/lista";

export type ImagemEscolhida =
  | { chave: string; tipo: "existente"; id: string; caminho: string; url: string }
  | { chave: string; tipo: "remota"; url: string }
  | { chave: string; tipo: "arquivo"; arquivo: File; url: string };

type Props = {
  escolhidas: ImagemEscolhida[];
  candidatas: string[];
  aoMudar: (lista: ImagemEscolhida[]) => void;
  /** Para o plano B poder levar o foco até aqui. */
  ancoraId?: string;
};

let contador = 0;
const novaChave = () => `img-${Date.now()}-${contador++}`;

export function ImagePicker({ escolhidas, candidatas, aoMudar, ancoraId }: Props) {
  const arquivoRef = useRef<HTMLInputElement>(null);
  const [colandoUrl, setColandoUrl] = useState(false);
  const [urlImagem, setUrlImagem] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const urlId = useId();
  const cheio = escolhidas.length >= MAX_IMAGENS;

  function adicionar(novas: ImagemEscolhida[]) {
    const espaco = MAX_IMAGENS - escolhidas.length;
    if (novas.length > espaco) setAviso(t.form.limiteImagens(MAX_IMAGENS));
    else setAviso(null);
    if (espaco > 0) aoMudar([...escolhidas, ...novas.slice(0, espaco)]);
  }

  function alternarCandidata(url: string) {
    const existente = escolhidas.find((e) => e.tipo === "remota" && e.url === url);
    if (existente) {
      setAviso(null);
      aoMudar(escolhidas.filter((e) => e !== existente));
    } else {
      adicionar([{ chave: novaChave(), tipo: "remota", url }]);
    }
  }

  function mover(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= escolhidas.length) return;
    const nova = [...escolhidas];
    [nova[i], nova[j]] = [nova[j], nova[i]];
    aoMudar(nova);
  }

  function adicionarUrl() {
    const url = urlImagem.trim();
    if (!/^https?:\/\//i.test(url)) {
      setAviso(t.form.linkInvalido);
      return;
    }
    adicionar([{ chave: novaChave(), tipo: "remota", url }]);
    setUrlImagem("");
    setColandoUrl(false);
  }

  return (
    <fieldset id={ancoraId} tabIndex={-1} className="flex flex-col gap-3">
      <legend className="text-sm font-semibold">{t.form.imagens}</legend>
      <p className="-mt-1 text-sm text-texto-suave">{t.form.imagensDica(MAX_IMAGENS)}</p>

      <ol className="grid grid-cols-4 gap-2">
        {Array.from({ length: MAX_IMAGENS }, (_, i) => {
          const img = escolhidas[i];
          return (
            <li key={img?.chave ?? `vazio-${i}`} className="flex flex-col gap-1">
              <div className="relative aspect-square overflow-hidden rounded-imagem border border-borda bg-superficie-suave">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.url} alt="" referrerPolicy="no-referrer" className="size-full object-contain p-1" />
                ) : (
                  <span className="flex size-full items-center justify-center text-xs text-texto-suave">{i + 1}</span>
                )}
                {img && (
                  <button
                    type="button"
                    onClick={() => aoMudar(escolhidas.filter((e) => e !== img))}
                    aria-label={`${t.form.remover} ${i + 1}`}
                    className="absolute right-0.5 top-0.5 flex size-8 items-center justify-center rounded-pilula bg-superficie/90 text-perigo shadow-card"
                  >
                    <X aria-hidden className="size-4" />
                  </button>
                )}
              </div>
              {img && escolhidas.length > 1 && (
                <div className="flex justify-between">
                  <IconButton rotulo={`${t.form.moverEsquerda} (${i + 1})`} className="size-8" disabled={i === 0} onClick={() => mover(i, -1)}>
                    <ChevronLeft aria-hidden className="size-4" />
                  </IconButton>
                  <IconButton
                    rotulo={`${t.form.moverDireita} (${i + 1})`}
                    className="size-8"
                    disabled={i === escolhidas.length - 1}
                    onClick={() => mover(i, 1)}
                  >
                    <ChevronRight aria-hidden className="size-4" />
                  </IconButton>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {candidatas.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-texto-suave">{t.form.imagensDaLoja}</p>
          <ul className="scroll-sem-barra -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {candidatas.map((url) => {
              const marcada = escolhidas.some((e) => e.tipo === "remota" && e.url === url);
              return (
                <li key={url} className="shrink-0">
                  <button
                    type="button"
                    aria-pressed={marcada}
                    onClick={() => alternarCandidata(url)}
                    className={cn(
                      "relative block size-20 overflow-hidden rounded-imagem border-2 bg-superficie-suave",
                      marcada ? "border-destaque" : "border-borda",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" referrerPolicy="no-referrer" loading="lazy" className="size-full object-contain p-1" />
                    {marcada && (
                      <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-pilula bg-destaque text-superficie">
                        <Check aria-hidden className="size-3.5" />
                        <span className="sr-only">{t.form.selecionada}</span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          variante="secundario"
          tamanho="sm"
          disabled={cheio}
          icone={<ImagePlus aria-hidden className="size-4" />}
          onClick={() => arquivoRef.current?.click()}
        >
          {t.form.enviarFoto}
        </Button>
        <Button
          variante="secundario"
          tamanho="sm"
          disabled={cheio}
          icone={<Link2 aria-hidden className="size-4" />}
          onClick={() => setColandoUrl((v) => !v)}
          aria-expanded={colandoUrl}
          aria-controls={urlId}
        >
          {t.form.colarUrlImagem}
        </Button>
        <input
          ref={arquivoRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const arquivos = Array.from(e.target.files ?? []);
            adicionar(arquivos.map((arquivo) => ({ chave: novaChave(), tipo: "arquivo", arquivo, url: URL.createObjectURL(arquivo) })));
            e.target.value = "";
          }}
        />
      </div>

      {colandoUrl && (
        <div id={urlId} className="flex gap-2">
          <label className="flex-1">
            <span className="sr-only">{t.form.colarUrlImagem}</span>
            <input
              type="url"
              inputMode="url"
              autoFocus
              value={urlImagem}
              onChange={(e) => setUrlImagem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  adicionarUrl();
                }
              }}
              placeholder={t.form.placeholderUrlImagem}
              className={cn(campoClasses, "h-11")}
            />
          </label>
          <Button onClick={adicionarUrl}>{t.form.adicionarUrl}</Button>
        </div>
      )}

      {aviso && (
        <p role="alert" className="text-sm font-medium text-perigo">
          {aviso}
        </p>
      )}
    </fieldset>
  );
}
