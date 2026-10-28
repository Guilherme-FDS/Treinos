import { LinkButton } from "@/components/ui";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <div className="h-14 w-14 rounded-2xl bg-accent" />
      <h1 className="text-3xl font-bold leading-tight">Dieta, treino e gasto energético num só lugar.</h1>
      <p className="text-muted">
        Metas calculadas pelo seu perfil, diário alimentar com a TACO, scanner de código de barras, fichas de treino com
        timer e histórico.
      </p>
      <div className="flex gap-3">
        <LinkButton href="/signup" className="flex-1">Criar conta</LinkButton>
        <LinkButton href="/login" variant="secondary" className="flex-1">Entrar</LinkButton>
      </div>
    </main>
  );
}
