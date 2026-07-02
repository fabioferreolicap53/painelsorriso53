export default function PaginaFavoritos() {
  return (
    <>
      <div className="relative overflow-hidden rounded-b-3xl bg-gradient-to-br from-[#162544] via-[#1a3055] to-[#0d2247] px-8 py-6 sm:px-10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-blue-400/8 blur-2xl" />
        <div className="absolute right-1/3 top-0 h-32 w-32 rounded-full bg-cyan-400/5 blur-2xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />

        <div className="relative mx-auto flex max-w-[1380px] flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-400/10 px-3 py-1 ring-1 ring-blue-400/15">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-sm font-medium uppercase tracking-wide text-blue-300">Acesso Rápido</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              FAVORITOS <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Salvos</span>
            </h1>
            <p className="mt-2 text-sm text-blue-200/60">
              Acesse rapidamente os pacientes que você marcou como favoritos.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white/[0.06] px-5 py-3 ring-1 ring-white/[0.08] backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-300/70">Total Favoritos</p>
              <p className="text-3xl font-bold text-white">0</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1380px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-2xl font-bold text-slate-400">Nenhum favorito ainda</p>
          <p className="mt-2 text-base text-slate-300">Marque pacientes como favoritos para acessá-los rapidamente.</p>
        </div>
      </div>
    </>
  );
}
