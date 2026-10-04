"use client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { assinarCaminhos, BUCKET_IMAGENS } from "@/lib/imagens";
import { createClient } from "@/lib/supabase/client";
import type { Categoria, Item, ItemImagem, Lista, StatusItem } from "@/lib/types/database";

export type DadosLista = {
  lista: Lista;
  categorias: Categoria[];
  itens: Item[];
  imagens: ItemImagem[];
  urls: Record<string, string>;
};

type ComId = { id: string };

function aplicar<T extends ComId>(lista: T[], payload: RealtimePostgresChangesPayload<T>): T[] {
  if (payload.eventType === "DELETE") {
    const id = (payload.old as Partial<T>).id;
    return lista.filter((x) => x.id !== id);
  }
  const novo = payload.new as T;
  const existe = lista.some((x) => x.id === novo.id);
  return existe ? lista.map((x) => (x.id === novo.id ? novo : x)) : [...lista, novo];
}

/** Carrega a lista e mantém tudo sincronizado em tempo real com os outros membros. */
export function useListData(inicial: DadosLista) {
  const supabase = createClient();
  const listId = inicial.lista.id;
  const [dados, setDados] = useState(inicial);
  const [erro, setErro] = useState(false);
  const urlsRef = useRef(inicial.urls);
  useEffect(() => {
    urlsRef.current = dados.urls;
  }, [dados.urls]);

  const assinarNovas = useCallback(
    async (imagens: ItemImagem[]) => {
      const faltando = imagens.map((i) => i.caminho).filter((c) => !urlsRef.current[c]);
      if (faltando.length === 0) return;
      const novas = await assinarCaminhos(supabase, faltando);
      setDados((d) => ({ ...d, urls: { ...d.urls, ...novas } }));
    },
    [supabase],
  );

  const recarregar = useCallback(async () => {
    const [l, c, i, im] = await Promise.all([
      supabase.from("lists").select("*").eq("id", listId).single(),
      supabase.from("categories").select("*").eq("list_id", listId),
      supabase.from("items").select("*").eq("list_id", listId),
      supabase.from("item_images").select("*").eq("list_id", listId),
    ]);
    if (l.error || c.error || i.error || im.error) {
      setErro(true);
      return;
    }
    setErro(false);
    setDados((d) => ({ ...d, lista: l.data, categorias: c.data, itens: i.data, imagens: im.data }));
    await assinarNovas(im.data);
  }, [supabase, listId, assinarNovas]);

  useEffect(() => {
    let jaConectou = false;
    const filtro = `list_id=eq.${listId}`;
    const canal = supabase
      .channel(`lista:${listId}`)
      .on<Item>("postgres_changes", { event: "INSERT", schema: "public", table: "items", filter: filtro }, (p) =>
        setDados((d) => ({ ...d, itens: aplicar(d.itens, p) })),
      )
      .on<Item>("postgres_changes", { event: "UPDATE", schema: "public", table: "items", filter: filtro }, (p) =>
        setDados((d) => ({ ...d, itens: aplicar(d.itens, p) })),
      )
      // Exclusões não aceitam filtro no Realtime; chegam só com o id, então removemos se existir.
      .on<Item>("postgres_changes", { event: "DELETE", schema: "public", table: "items" }, (p) =>
        setDados((d) => ({ ...d, itens: aplicar(d.itens, p) })),
      )
      .on<Categoria>("postgres_changes", { event: "INSERT", schema: "public", table: "categories", filter: filtro }, (p) =>
        setDados((d) => ({ ...d, categorias: aplicar(d.categorias, p) })),
      )
      .on<Categoria>("postgres_changes", { event: "UPDATE", schema: "public", table: "categories", filter: filtro }, (p) =>
        setDados((d) => ({ ...d, categorias: aplicar(d.categorias, p) })),
      )
      .on<Categoria>("postgres_changes", { event: "DELETE", schema: "public", table: "categories" }, (p) =>
        setDados((d) => ({ ...d, categorias: aplicar(d.categorias, p) })),
      )
      .on<ItemImagem>("postgres_changes", { event: "INSERT", schema: "public", table: "item_images", filter: filtro }, (p) => {
        setDados((d) => ({ ...d, imagens: aplicar(d.imagens, p) }));
        void assinarNovas([p.new as ItemImagem]);
      })
      .on<ItemImagem>("postgres_changes", { event: "UPDATE", schema: "public", table: "item_images", filter: filtro }, (p) =>
        setDados((d) => ({ ...d, imagens: aplicar(d.imagens, p) })),
      )
      .on<ItemImagem>("postgres_changes", { event: "DELETE", schema: "public", table: "item_images" }, (p) =>
        setDados((d) => ({ ...d, imagens: aplicar(d.imagens, p) })),
      )
      .on<Lista>("postgres_changes", { event: "UPDATE", schema: "public", table: "lists", filter: `id=eq.${listId}` }, (p) =>
        setDados((d) => ({ ...d, lista: p.new as Lista })),
      )
      .subscribe((status) => {
        // Ao reconectar (celular saiu do sono, rede voltou), recarrega para não perder nada.
        if (status === "SUBSCRIBED") {
          if (jaConectou) void recarregar();
          jaConectou = true;
        }
      });

    const aoVoltar = () => {
      if (document.visibilityState === "visible") void recarregar();
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      document.removeEventListener("visibilitychange", aoVoltar);
      void supabase.removeChannel(canal);
    };
  }, [supabase, listId, recarregar, assinarNovas]);

  /** Troca de status otimista: muda na hora e desfaz se o banco recusar. */
  const mudarStatus = useCallback(
    async (id: string, status: StatusItem) => {
      let anterior: StatusItem | undefined;
      setDados((d) => ({
        ...d,
        itens: d.itens.map((i) => {
          if (i.id !== id) return i;
          anterior = i.status;
          return { ...i, status };
        }),
      }));
      const { error } = await supabase.from("items").update({ status }).eq("id", id);
      if (error && anterior) {
        const volta = anterior;
        setDados((d) => ({ ...d, itens: d.itens.map((i) => (i.id === id ? { ...i, status: volta } : i)) }));
        throw error;
      }
    },
    [supabase],
  );

  const excluirItem = useCallback(
    async (id: string) => {
      const caminhos = dados.imagens.filter((im) => im.item_id === id).map((im) => im.caminho);
      const { error } = await supabase.from("items").delete().eq("id", id);
      if (error) throw error;
      if (caminhos.length) await supabase.storage.from(BUCKET_IMAGENS).remove(caminhos);
      setDados((d) => ({
        ...d,
        itens: d.itens.filter((i) => i.id !== id),
        imagens: d.imagens.filter((im) => im.item_id !== id),
      }));
    },
    [supabase, dados.imagens],
  );

  return { dados, erro, recarregar, mudarStatus, excluirItem };
}
