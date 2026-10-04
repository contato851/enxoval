import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "./cn";

export const campoClasses =
  "w-full rounded-controle border border-borda-forte bg-superficie px-3 text-base text-texto placeholder:text-texto-suave aria-invalid:border-perigo";

type CampoBase = { rotulo: string; dica?: ReactNode; erro?: string | null; opcional?: string };

function Moldura({
  id,
  rotulo,
  dica,
  erro,
  opcional,
  children,
}: CampoBase & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-texto">
        {rotulo}
        {opcional && <span className="ml-1 font-normal text-texto-suave">({opcional})</span>}
      </label>
      {children}
      {dica && !erro && (
        <p id={`${id}-dica`} className="text-sm text-texto-suave">
          {dica}
        </p>
      )}
      {erro && (
        <p id={`${id}-erro`} role="alert" className="text-sm font-medium text-perigo">
          {erro}
        </p>
      )}
    </div>
  );
}

function descricao(id: string, dica?: ReactNode, erro?: string | null) {
  return erro ? `${id}-erro` : dica ? `${id}-dica` : undefined;
}

export function TextField({ rotulo, dica, erro, opcional, className, id, ...props }: CampoBase & ComponentProps<"input">) {
  const gerado = useId();
  const idFinal = id ?? gerado;
  return (
    <Moldura id={idFinal} rotulo={rotulo} dica={dica} erro={erro} opcional={opcional}>
      <input
        id={idFinal}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricao(idFinal, dica, erro)}
        className={cn(campoClasses, "h-11", className)}
        {...props}
      />
    </Moldura>
  );
}

export function TextArea({ rotulo, dica, erro, opcional, className, id, ...props }: CampoBase & ComponentProps<"textarea">) {
  const gerado = useId();
  const idFinal = id ?? gerado;
  return (
    <Moldura id={idFinal} rotulo={rotulo} dica={dica} erro={erro} opcional={opcional}>
      <textarea
        id={idFinal}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricao(idFinal, dica, erro)}
        className={cn(campoClasses, "min-h-24 py-2", className)}
        {...props}
      />
    </Moldura>
  );
}

export function SelectField({
  rotulo,
  dica,
  erro,
  opcional,
  className,
  id,
  children,
  ...props
}: CampoBase & ComponentProps<"select">) {
  const gerado = useId();
  const idFinal = id ?? gerado;
  return (
    <Moldura id={idFinal} rotulo={rotulo} dica={dica} erro={erro} opcional={opcional}>
      <select
        id={idFinal}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricao(idFinal, dica, erro)}
        className={cn(campoClasses, "h-11", className)}
        {...props}
      >
        {children}
      </select>
    </Moldura>
  );
}
