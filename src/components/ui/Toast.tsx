"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { cn } from "./cn";

type Aviso = { id: number; texto: string; tipo: "info" | "erro" };
const Contexto = createContext<(texto: string, tipo?: Aviso["tipo"]) => void>(() => {});

/** Avisos curtos no rodapé, anunciados para leitores de tela. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const avisar = useCallback((texto: string, tipo: Aviso["tipo"] = "info") => {
    const id = Date.now() + Math.random();
    setAvisos((a) => [...a.slice(-2), { id, texto, tipo }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 4500);
  }, []);

  return (
    <Contexto.Provider value={avisar}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 area-segura-base"
      >
        {avisos.map((a) => (
          <p
            key={a.id}
            role={a.tipo === "erro" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto max-w-md rounded-controle px-4 py-3 text-sm font-medium shadow-flutuante",
              a.tipo === "erro" ? "bg-perigo text-superficie" : "bg-texto text-superficie",
            )}
          >
            {a.texto}
          </p>
        ))}
      </div>
    </Contexto.Provider>
  );
}

export const useToast = () => useContext(Contexto);
