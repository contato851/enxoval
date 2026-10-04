"use client";
import { Copy, LogOut, Share2, Trash2, UserMinus } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TextField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { t } from "@/i18n";
import type { Lista, PapelMembro } from "@/lib/types/database";
import { excluirLista, gerarConvite, removerMembro, sairDaLista, salvarDados, type Estado } from "./actions";

type Membro = { user_id: string; email: string; papel: PapelMembro };

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-card bg-superficie p-5 shadow-card">
      <h2 className="text-lg font-semibold">{titulo}</h2>
      {children}
    </section>
  );
}

export function Ajustes({
  lista,
  dono,
  membros,
  usuarioId,
}: {
  lista: Lista;
  dono: boolean;
  membros: Membro[];
  usuarioId: string;
}) {
  const avisar = useToast();
  const [estado, salvar, salvando] = useActionState<Estado, FormData>(salvarDados.bind(null, lista.id), {
    ok: false,
    mensagem: null,
  });
  const [link, setLink] = useState<string | null>(null);
  const [gerando, iniciarGeracao] = useTransition();
  const [removendo, setRemovendo] = useState<Membro | null>(null);
  const [saindo, setSaindo] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  async function compartilhar() {
    if (!link) return;
    const texto = t.ajustes.conviteMensagem(lista.nome);
    if (navigator.share) {
      await navigator.share({ title: t.app.nome, text: texto, url: link }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(`${texto} ${link}`);
      avisar(t.comum.copiado);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Secao titulo={t.ajustes.dados}>
        <form action={salvar} className="flex flex-col gap-4">
          <fieldset disabled={!dono} className="flex flex-col gap-4">
            <TextField rotulo={t.listas.nome} name="nome" defaultValue={lista.nome} maxLength={60} required />
            <TextField
              rotulo={t.listas.dataPrevista}
              name="data_prevista"
              type="date"
              defaultValue={lista.data_prevista ?? ""}
              dica={t.listas.dataPrevistaDica}
            />
          </fieldset>
          {dono ? (
            <Button type="submit" disabled={salvando}>
              {salvando ? t.comum.salvando : t.comum.salvar}
            </Button>
          ) : (
            <p className="text-sm text-texto-suave">{t.ajustes.soDono}</p>
          )}
          {estado.mensagem && (
            <p role={estado.ok ? "status" : "alert"} className={estado.ok ? "text-sm text-destaque-forte" : "text-sm text-perigo"}>
              {estado.mensagem}
            </p>
          )}
        </form>
      </Secao>

      <Secao titulo={t.ajustes.membros}>
        <ul className="flex flex-col divide-y divide-borda">
          {membros.map((m) => (
            <li key={m.user_id} className="flex min-h-12 items-center gap-2 py-1">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  {m.email}
                  {m.user_id === usuarioId && <span className="text-texto-suave"> ({t.ajustes.voce})</span>}
                </span>
                <span className="text-sm text-texto-suave">{t.listas.papel[m.papel]}</span>
              </span>
              {dono && m.user_id !== usuarioId && (
                <Button variante="fantasma" tamanho="sm" icone={<UserMinus aria-hidden className="size-4" />} onClick={() => setRemovendo(m)}>
                  {t.ajustes.remover}
                </Button>
              )}
            </li>
          ))}
        </ul>
        {!dono && (
          <Button variante="secundario" icone={<LogOut aria-hidden className="size-4" />} onClick={() => setSaindo(true)}>
            {t.ajustes.sair}
          </Button>
        )}
      </Secao>

      {dono && (
        <Secao titulo={t.ajustes.convite}>
          <p className="text-texto-suave">{t.ajustes.conviteDica}</p>
          {link ? (
            <div className="flex flex-col gap-2">
              <input
                readOnly
                value={link}
                aria-label={t.ajustes.convite}
                onFocus={(e) => e.currentTarget.select()}
                className="h-11 rounded-controle border border-borda-forte bg-fundo px-3 text-sm"
              />
              <div className="flex gap-2">
                <Button className="flex-1" icone={<Share2 aria-hidden className="size-4" />} onClick={compartilhar}>
                  {t.ajustes.compartilhar}
                </Button>
                <Button
                  variante="secundario"
                  icone={<Copy aria-hidden className="size-4" />}
                  onClick={async () => {
                    await navigator.clipboard.writeText(link);
                    avisar(t.comum.copiado);
                  }}
                >
                  {t.comum.copiar}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              disabled={gerando}
              onClick={() =>
                iniciarGeracao(async () => {
                  const r = await gerarConvite(lista.id);
                  if (r.erro) avisar(r.erro, "erro");
                  setLink(r.link);
                })
              }
            >
              {gerando ? t.ajustes.gerando : t.ajustes.gerarConvite}
            </Button>
          )}
          <p className="text-sm text-texto-suave">{t.ajustes.conviteAviso}</p>
        </Secao>
      )}

      {dono && (
        <Secao titulo={t.ajustes.perigo}>
          <Button variante="perigo" icone={<Trash2 aria-hidden className="size-4" />} onClick={() => setExcluindo(true)}>
            {t.ajustes.excluirLista}
          </Button>
        </Secao>
      )}

      <ConfirmDialog
        aberto={removendo !== null}
        aoFechar={() => setRemovendo(null)}
        titulo={t.ajustes.removerTitulo}
        rotuloConfirmar={t.ajustes.remover}
        aoConfirmar={async () => {
          if (removendo) await removerMembro(lista.id, removendo.user_id);
        }}
      >
        <p>{removendo && t.ajustes.removerTexto(removendo.email)}</p>
      </ConfirmDialog>

      <ConfirmDialog
        aberto={saindo}
        aoFechar={() => setSaindo(false)}
        titulo={t.ajustes.sairTitulo}
        rotuloConfirmar={t.ajustes.sair}
        aoConfirmar={() => sairDaLista(lista.id)}
      >
        <p>{t.ajustes.sairTexto}</p>
      </ConfirmDialog>

      <ConfirmDialog
        aberto={excluindo}
        aoFechar={() => setExcluindo(false)}
        titulo={t.ajustes.excluirListaTitulo}
        rotuloConfirmar={t.ajustes.excluirLista}
        exigirTexto={lista.nome}
        rotuloTexto={t.ajustes.excluirListaConfirmacao}
        aoConfirmar={() => excluirLista(lista.id)}
      >
        <p>{t.ajustes.excluirListaTexto(lista.nome)}</p>
      </ConfirmDialog>
    </div>
  );
}
