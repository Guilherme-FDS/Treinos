export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
      <div className="text-center">
        <div className="mx-auto mb-2 h-12 w-12 rounded-2xl bg-accent" />
        <p className="text-lg font-semibold">Treinos</p>
      </div>
      {children}
    </main>
  );
}
