export const metadata = { title: "Offline" };

export default function Offline() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-xl font-semibold">Sem conexão</h1>
      <p className="text-muted">Conecte-se à internet para sincronizar seus dados.</p>
    </main>
  );
}
