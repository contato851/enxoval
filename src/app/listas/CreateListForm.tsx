"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { t } from "@/i18n";
import { criarLista, type EstadoCriarLista } from "./actions";

export function CreateListForm({ tipos }: { tipos: { tipo: string; nome: string }[] }) {
  const [estado, acao, pendente] = useActionState<EstadoCriarLista, FormData>(criarLista, { erro: null });
  return (
    <form action={acao} className="flex flex-col gap-4">
      <TextField
        rotulo={t.listas.nome}
        name="nome"
        required
        maxLength={60}
        placeholder={t.listas.placeholderNome}
        defaultValue={t.listas.placeholderNome}
        erro={estado.erro}
      />
      {tipos.length > 1 && (
        <SelectField rotulo={t.listas.tipo} name="tipo" defaultValue="bebe">
          {tipos.map((tp) => (
            <option key={tp.tipo} value={tp.tipo}>
              {t.listas.tipos[tp.tipo] ?? tp.nome}
            </option>
          ))}
        </SelectField>
      )}
      <TextField
        rotulo={t.listas.dataPrevista}
        opcional={t.comum.opcional}
        dica={t.listas.dataPrevistaDica}
        name="data_prevista"
        type="date"
      />
      <Button type="submit" disabled={pendente}>
        {pendente ? t.listas.criando : t.listas.criar}
      </Button>
    </form>
  );
}
