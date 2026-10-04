"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button, LinkButton } from "@/components/ui/Button";
import { SelectField, TextArea, TextField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { t } from "@/i18n";
import { BUCKET_IMAGENS } from "@/lib/imagens";
import { lerReais } from "@/lib/format";
import { PRIORIDADES, STATUS, TAMANHOS_PADRAO } from "@/lib/lista";
import { createClient } from "@/lib/supabase/client";
import type { Categoria, Item, PrioridadeItem, StatusItem } from "@/lib/types/database";
import { ImagePicker, type ImagemEscolhida } from "./ImagePicker";
import { LinkField } from "./LinkField";

type Props = {
  listId: string;
  categorias: Categoria[];
  item?: Item;
  imagensIniciais?: ImagemEscolhida[];
  urlInicial?: string;
  categoriaInicial?: string;
};

type RespostaPreview =
  | { ok: true; produto: { titulo: string | null; preco: number | null; imagens: string[] } }
  | { ok: false; erro: string };

const precoTexto = (n: number | null | undefined) =>
  n === null || n === undefined ? "" : n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ItemForm({ listId, categorias, item, imagensIniciais = [], urlInicial, categoriaInicial }: Props) {
  const router = useRouter();
  const avisar = useToast();
  const supabase = createClient();
  const voltar = `/l/${listId}`;

  const [url, setUrl] = useState(item?.url_original ?? urlInicial ?? "");
  const [nome, setNome] = useState(item?.nome ?? "");
  const [preco, setPreco] = useState(precoTexto(item?.preco));
  const [quantidade, setQuantidade] = useState(String(item?.quantidade ?? 1));
  const [tamanho, setTamanho] = useState(item?.tamanho ?? "");
  const [categoria, setCategoria] = useState(
    item?.category_id ?? (categorias.some((c) => c.id === categoriaInicial) ? categoriaInicial! : categorias[0]?.id ?? ""),
  );
  const [prioridade, setPrioridade] = useState<PrioridadeItem>(item?.prioridade ?? "essencial");
  const [status, setStatus] = useState<StatusItem>(item?.status ?? "a_comprar");
  const [observacoes, setObservacoes] = useState(item?.observacoes ?? "");
  const [imagens, setImagens] = useState<ImagemEscolhida[]>(imagensIniciais);
  const [candidatas, setCandidatas] = useState<string[]>([]);

  const [buscando, setBuscando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string; extra?: React.ReactNode } | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState<string | null>(null);
  const ultimaBuscada = useRef(item?.url_original ?? "");
  const editados = useRef(new Set<string>(item ? ["nome", "preco"] : []));

  const categoriaEscolhida = categorias.find((c) => c.id === categoria);

  async function buscarPreview(alvo: string) {
    if (!/^https?:\/\//i.test(alvo) || alvo === ultimaBuscada.current) return;
    ultimaBuscada.current = alvo;
    setBuscando(true);
    setMensagem(null);
    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: alvo }),
      });
      const dados = (await res.json()) as RespostaPreview;
      if (!dados.ok) throw new Error(dados.erro);
      const { titulo, preco: p, imagens: imgs } = dados.produto;
      if (titulo && (!editados.current.has("nome") || !nome)) setNome(titulo);
      if (p !== null && (!editados.current.has("preco") || !preco)) setPreco(precoTexto(p));
      setCandidatas(imgs);
      // Capa automática: a primeira imagem da loja, se ainda não houver nenhuma.
      if (imgs.length > 0 && imagens.length === 0) {
        setImagens([{ chave: `auto-${imgs[0]}`, tipo: "remota", url: imgs[0] }]);
      }
      setMensagem({ tipo: "ok", texto: t.form.preenchido });
    } catch (e) {
      const codigo = e instanceof Error ? e.message : "falha_rede";
      setMensagem({
        tipo: "erro",
        texto: t.preview.erros[codigo] ?? t.preview.erros.falha_rede,
        extra: (
          <p className="font-normal text-texto">
            {t.preview.planoB}{" "}
            <a href="#imagens" className="font-semibold text-destaque-forte underline">
              {t.form.imagens}
            </a>
          </p>
        ),
      });
    } finally {
      setBuscando(false);
    }
  }

  function validar() {
    const e: Record<string, string> = {};
    if (!nome.trim()) e.nome = t.form.nomeObrigatorio;
    const q = Number(quantidade);
    if (!Number.isInteger(q) || q < 1 || q > 999) e.quantidade = t.form.quantidadeInvalida;
    if (url.trim() && !/^https?:\/\/\S+$/i.test(url.trim())) e.url = t.form.linkInvalido;
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function enviarImagem(itemId: string, img: ImagemEscolhida, ordem: number) {
    const form = new FormData();
    form.set("listId", listId);
    form.set("itemId", itemId);
    form.set("ordem", String(ordem));
    if (img.tipo === "arquivo") form.set("arquivo", img.arquivo);
    else if (img.tipo === "remota") form.set("url", img.url);
    const res = await fetch("/api/images", { method: "POST", body: form });
    if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { erro?: string }).erro ?? "upload");
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!validar()) return;
    setSalvando(t.comum.salvando);

    const campos = {
      category_id: categoria,
      nome: nome.trim().slice(0, 200),
      url_original: url.trim() || null,
      preco: lerReais(preco),
      quantidade: Number(quantidade),
      tamanho: tamanho.trim() || null,
      prioridade,
      status,
      observacoes: observacoes.trim() || null,
    };

    let itemId = item?.id;
    if (itemId) {
      const { error } = await supabase.from("items").update(campos).eq("id", itemId);
      if (error) return falhar();
    } else {
      const { data, error } = await supabase
        .from("items")
        .insert({ ...campos, list_id: listId })
        .select("id")
        .single();
      if (error || !data) return falhar();
      itemId = data.id;
    }

    // Imagens: remove as que saíram, reordena as que ficaram e envia as novas.
    const existentesAntes = imagensIniciais.filter((i) => i.tipo === "existente");
    const removidas = existentesAntes.filter((a) => !imagens.some((i) => i.chave === a.chave));
    if (removidas.length) {
      await supabase.from("item_images").delete().in("id", removidas.map((r) => (r as { id: string }).id));
      await supabase.storage.from(BUCKET_IMAGENS).remove(removidas.map((r) => (r as { caminho: string }).caminho));
    }
    await Promise.all(
      imagens.map((img, ordem) =>
        img.tipo === "existente" ? supabase.from("item_images").update({ ordem }).eq("id", img.id) : null,
      ),
    );

    const novas = imagens.map((img, ordem) => ({ img, ordem })).filter(({ img }) => img.tipo !== "existente");
    let falhas = 0;
    if (novas.length) setSalvando(t.form.enviandoImagens);
    for (const { img, ordem } of novas) {
      try {
        await enviarImagem(itemId, img, ordem);
      } catch {
        falhas++;
      }
    }

    avisar(falhas ? t.form.erroImagem(falhas) : t.form.salvo, falhas ? "erro" : "info");
    router.push(voltar);
    router.refresh();
  }

  function falhar() {
    setSalvando(null);
    avisar(t.comum.erroGenerico, "erro");
  }

  return (
    <form onSubmit={salvar} noValidate className="flex flex-col gap-5">
      <LinkField
        valor={url}
        aoMudar={(v) => {
          setUrl(v);
          setErros((e) => ({ ...e, url: "" }));
        }}
        aoConfirmar={buscarPreview}
        buscando={buscando}
        mensagem={erros.url ? { tipo: "erro", texto: erros.url } : mensagem}
      />

      <TextField
        rotulo={t.form.nome}
        value={nome}
        maxLength={200}
        required
        erro={erros.nome}
        onChange={(e) => {
          editados.current.add("nome");
          setNome(e.target.value);
        }}
      />

      <div className="grid grid-cols-2 gap-3">
        <TextField
          rotulo={t.form.preco}
          value={preco}
          inputMode="decimal"
          placeholder={t.form.placeholderPreco}
          onChange={(e) => {
            editados.current.add("preco");
            setPreco(e.target.value);
          }}
        />
        <TextField
          rotulo={t.form.quantidade}
          value={quantidade}
          type="number"
          inputMode="numeric"
          min={1}
          max={999}
          erro={erros.quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
        />
      </div>

      <div id="imagens">
        <ImagePicker escolhidas={imagens} candidatas={candidatas} aoMudar={setImagens} />
      </div>

      <SelectField rotulo={t.form.categoria} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
        {categorias.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </SelectField>

      <TextField
        rotulo={t.form.tamanho}
        value={tamanho}
        maxLength={20}
        list="tamanhos"
        placeholder={t.form.placeholderTamanho}
        opcional={t.comum.opcional}
        dica={categoriaEscolhida?.mostra_tamanhos ? TAMANHOS_PADRAO.join(", ") : undefined}
        onChange={(e) => setTamanho(e.target.value)}
      />
      <datalist id="tamanhos">
        {TAMANHOS_PADRAO.map((tam) => (
          <option key={tam} value={tam} />
        ))}
      </datalist>

      <div className="grid grid-cols-2 gap-3">
        <SelectField
          rotulo={t.form.prioridade}
          value={prioridade}
          onChange={(e) => setPrioridade(e.target.value as PrioridadeItem)}
        >
          {PRIORIDADES.map((p) => (
            <option key={p} value={p}>
              {t.prioridade[p]}
            </option>
          ))}
        </SelectField>
        <SelectField rotulo={t.form.status} value={status} onChange={(e) => setStatus(e.target.value as StatusItem)}>
          {STATUS.map((s) => (
            <option key={s} value={s}>
              {t.status[s]}
            </option>
          ))}
        </SelectField>
      </div>

      <TextArea
        rotulo={t.form.observacoes}
        value={observacoes}
        maxLength={2000}
        opcional={t.comum.opcional}
        placeholder={t.form.placeholderObs}
        onChange={(e) => setObservacoes(e.target.value)}
      />

      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-borda bg-fundo px-4 pt-3 area-segura-base">
        <LinkButton href={voltar} variante="secundario" className="flex-1">
          {t.comum.cancelar}
        </LinkButton>
        <Button type="submit" className="flex-1" disabled={Boolean(salvando) || buscando}>
          {salvando ?? t.comum.salvar}
        </Button>
      </div>
    </form>
  );
}
