"use client";
import dynamic from "next/dynamic";

export const Runner = dynamic(() => import("./runner").then((m) => m.Runner), {
  ssr: false,
  loading: () => <p className="py-10 text-center text-sm text-muted">Carregando treino…</p>,
});
