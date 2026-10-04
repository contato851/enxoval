"use client";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, IconButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { campoClasses, SelectField } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/components/ui/cn";
import { t } from "@/i18n";
import { ordenarCategorias } from "@/lib/lista";
import { createClient } from "@/lib/supabase/client";
import type { Categoria } from "@/lib/types/database";
import { CategoryIcon, ICONES } from "./CategoryIcon";

type Props = { listId: string; categorias: Categoria[]; itensPorCategoria: Record<string, number> };

export function CategoryManager({ listId, categorias: iniciais, itensPorCategoria }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const avisar = useToast();
  const [categorias, setCategorias] = useState(() => ordenarCategorias(iniciais));
  const [nova, setNova] = useState("");
  const [erroNova, setErroNova] = useState<string | null>(null);
  const [escolhendoIcone, setEscolhendoIcone] = useState<Categoria | null>(null);
  const [excluindo, setExcluindo] = useState<Categoria | null>(null);
  const [destino, setDestino] = useState("");

  async function atualizar(id: string, campos: Partial<Pick<Categoria, "nome" | "icone" | "ordem" | "mostra_tamanhos">>) {
    setCategorias((cs) => cs.map((c) => (c.id === id ? { ...c, ...campos } : c)));
    const { error } = await supabase.from("categories").update(campos).eq("id", id);
    if (error) {
      avisar(t.comum.erroGenerico, "erro");
      setCategorias(ordenarCategorias(iniciais));
    }
    router.refresh();
  }

  async function mover(indice: number, delta: number) {
    const alvo = indice + delta;
    if (alvo < 0 || alvo >= categorias.length) return;
    const nova = [...categorias];
    [nova[indice], nova[alvo]] = [nova[alvo], nova[indice]];
    const renumerada = nova.map((c, i) => ({ ...c, ordem: i + 1 }));
    setCategorias(renumerada);
    const mudaram = renumerada.filter((c) => categorias.find((o) => o.id === c.id)?.ordem !== c.ordem);
    const resultados = await Promise.all(
      mudaram.map((c) => supabase.from("categories").update({ ordem: c.ordem }).eq("id", c.id)),
    );
    if (resultados.some((r) => r.error)) avisar(t.comum.erroGenerico, "erro");
    router.refresh();
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    const nome = nova.trim();
    if (!nome) return setErroNova(t.categorias.nomeObrigatorio);
    setErroNova(null);
    const ordem = (categorias.at(-1)?.ordem ?? 0) + 1;
    const { data, error } = await supabase
      .from("categories")
      .insert({ list_id: listId, nome: nome.slice(0, 40), icone: "package", ordem })
      .select("*")
      .single();
    if (error || !data) return avisar(t.comum.erroGenerico, "erro");
    setCategorias((cs) => [...cs, data]);
    setNova("");
    router.refresh();
  }

  const qtdExcluindo = excluindo ? (itensPorCategoria[excluindo.id] ?? 0) : 0;
  const outras = categorias.filter((c) => c.id !== excluindo?.id);

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={criar} className="flex flex-col gap-1.5">
        <label htmlFor="nova-categoria" className="text-sm font-semibold">
          {t.categorias.nova}
        </label>
        <div className="flex gap-2">
          <input
            id="nova-categoria"
            value={nova}
            maxLength={40}
            onChange={(e) => setNova(e.target.value)}
            placeholder={t.categorias.placeholderNova}
            aria-invalid={erroNova ? true : undefined}
            className={cn(campoClasses, "h-11 flex-1")}
          />
          <Button type="submit" icone={<Plus aria-hidden className="size-5" />}>
            {t.categorias.adicionar}
          </Button>
        </div>
        {erroNova && (
          <p role="alert" className="text-sm font-medium text-perigo">
            {erroNova}
          </p>
        )}
      </form>

      {categorias.length === 0 ? (
        <EmptyState titulo={t.categorias.vazia} />
      ) : (
        <ol className="flex flex-col gap-2">
          {categorias.map((c, i) => (
            <li key={c.id} className="flex flex-col gap-2 rounded-card border border-borda bg-superficie p-3 shadow-card">
              <div className="flex items-center gap-2">
                <IconButton rotulo={t.categorias.escolherIcone(c.nome)} variante="secundario" onClick={() => setEscolhendoIcone(c)}>
                  <CategoryIcon icone={c.icone} className="size-5" />
                </IconButton>
                <label className="min-w-0 flex-1">
                  <span className="sr-only">{t.categorias.nome}</span>
                  <input
                    defaultValue={c.nome}
                    maxLength={40}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (!v) e.target.value = c.nome;
                      else if (v !== c.nome) void atualizar(c.id, { nome: v });
                    }}
                    onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
                    className={cn(campoClasses, "h-11 font-semibold")}
                  />
                </label>
                <IconButton rotulo={t.categorias.subir(c.nome)} disabled={i === 0} onClick={() => mover(i, -1)}>
                  <ArrowUp aria-hidden className="size-5" />
                </IconButton>
                <IconButton rotulo={t.categorias.descer(c.nome)} disabled={i === categorias.length - 1} onClick={() => mover(i, 1)}>
                  <ArrowDown aria-hidden className="size-5" />
                </IconButton>
                <IconButton
                  rotulo={`${t.comum.excluir}: ${c.nome}`}
                  variante="perigo"
                  onClick={() => {
                    setDestino(categorias.find((o) => o.id !== c.id)?.id ?? "");
                    setExcluindo(c);
                  }}
                >
                  <Trash2 aria-hidden className="size-5" />
                </IconButton>
              </div>
              <div className="flex items-center justify-between gap-2 pl-13 text-sm text-texto-suave">
                <span>{t.categorias.itens(itensPorCategoria[c.id] ?? 0)}</span>
                <label className="flex min-h-11 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={c.mostra_tamanhos}
                    onChange={(e) => atualizar(c.id, { mostra_tamanhos: e.target.checked })}
                    className="size-5 accent-destaque"
                  />
                  {t.categorias.mostraTamanhos}
                </label>
              </div>
            </li>
          ))}
        </ol>
      )}

      <Dialog
        aberto={escolhendoIcone !== null}
        aoFechar={() => setEscolhendoIcone(null)}
        titulo={escolhendoIcone ? t.categorias.escolherIcone(escolhendoIcone.nome) : ""}
      >
        <div role="radiogroup" aria-label={t.categorias.icone} className="grid grid-cols-4 gap-2">
          {Object.keys(ICONES).map((chave) => {
            const ativo = escolhendoIcone?.icone === chave;
            return (
              <button
                key={chave}
                type="button"
                role="radio"
                aria-checked={ativo}
                onClick={() => {
                  if (escolhendoIcone) void atualizar(escolhendoIcone.id, { icone: chave });
                  setEscolhendoIcone(null);
                }}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-controle border p-2 text-xs",
                  ativo ? "border-destaque bg-destaque-suave text-destaque-forte" : "border-borda hover:bg-superficie-suave",
                )}
              >
                <CategoryIcon icone={chave} className="size-6" />
                {t.icones[chave] ?? chave}
              </button>
            );
          })}
        </div>
      </Dialog>

      <ConfirmDialog
        aberto={excluindo !== null}
        aoFechar={() => setExcluindo(null)}
        titulo={t.categorias.excluirTitulo}
        desabilitado={categorias.length <= 1 || (qtdExcluindo > 0 && !destino)}
        aoConfirmar={async () => {
          if (!excluindo) return;
          const { error } = await supabase.rpc("delete_category_moving_items", {
            p_category: excluindo.id,
            p_target: qtdExcluindo > 0 ? destino : null,
          });
          if (error) throw new Error(t.comum.erroGenerico);
          setCategorias((cs) => cs.filter((c) => c.id !== excluindo.id));
          router.refresh();
        }}
      >
        {categorias.length <= 1 ? (
          <p>{t.categorias.ultima}</p>
        ) : qtdExcluindo > 0 && excluindo ? (
          <>
            <p>{t.categorias.excluirComItens(excluindo.nome, qtdExcluindo)}</p>
            <SelectField rotulo={t.categorias.moverPara} value={destino} onChange={(e) => setDestino(e.target.value)}>
              {outras.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </SelectField>
          </>
        ) : (
          <p>{excluindo && t.categorias.excluirVazia(excluindo.nome)}</p>
        )}
      </ConfirmDialog>
    </div>
  );
}
