import { useState } from "react";
import type { CategoriaPaciente, Paciente } from "./types";
import {
  getCoresCategoria,
  getCoresStatus,
  getLabelCategoria,
  getLabelStatus,
  getIconeCategoria,
} from "./data";

export default function PaginaPacientes({ pacientes }: { pacientes: Paciente[] }) {
  const [filtro, setFiltro] = useState<CategoriaPaciente | "todas">("todas");
  const [busca, setBusca] = useState("");

  const filtrados = pacientes.filter((p) => {
    const matchCat = filtro === "todas" || p.categoria === filtro;
    const matchBusca =
      busca === "" ||
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (p.responsavel?.toLowerCase().includes(busca.toLowerCase()) ?? false);
    return matchCat && matchBusca;
  });

  const categorias: { key: CategoriaPaciente | "todas"; label: string }[] = [
    { key: "todas", label: "Todos" },
    { key: "gestante", label: "Gestantes" },
    { key: "crianca", label: "Crian\u00E7as" },
    { key: "tabagista", label: "Tabagistas" },
    { key: "tuberculose", label: "Tuberculose" },
  ];

  return (
    <>
      <div className="relative overflow-hidden rounded-b-3xl bg-gradient-to-br from-[#162544] via-[#1a3055] to-[#0d2247] px-8 py-6 sm:px-10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-blue-400/8 blur-2xl" />
        <div className="absolute right-1/3 top-0 h-32 w-32 rounded-full bg-cyan-400/5 blur-2xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />

        <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-400/10 px-3 py-1 ring-1 ring-blue-400/15">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-300">Prontuário</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              PACIENTES <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Cadastrados</span>
            </h1>
            <p className="mt-2 text-sm text-blue-200/60">
              Gerencie e acompanhe todos os pacientes do seu território.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white/[0.06] px-5 py-3 ring-1 ring-white/[0.08] backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-300/70">Total Encontrados</p>
              <p className="text-3xl font-bold text-white">{filtrados.length.toLocaleString("pt-BR")}</p>
            </div>
            <button className="inline-flex items-center gap-2 rounded-xl bg-white/[0.08] px-5 py-3 text-sm font-medium text-white ring-1 ring-white/[0.1] backdrop-blur-sm transition-all duration-200 hover:bg-white/[0.14] hover:ring-white/[0.18] hover:shadow-lg hover:shadow-blue-500/10">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Novo Acompanhamento
            </button>
          </div>
        </div>
      </div>

      {/* Conteudo centralizado */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

      {/* Header da secao */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-slate-800">Lista de Pacientes</h2>
        <button
          className="inline-flex items-center gap-2 rounded-xl bg-[#0a1628] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#0f2140] hover:shadow-md"
          onClick={() => alert("Abrir modal de novo acompanhamento (PocketBase)")}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Novo Acompanhamento
        </button>
      </div>

      {/* Filtros + busca */}
      <div className="mb-4 rounded-xl border border-blue-100 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 overflow-x-auto">
            {categorias.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setFiltro(cat.key)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                  filtro === cat.key
                    ? "bg-[#0a1628] text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-700 placeholder-slate-400 outline-none transition-colors focus:border-blue-400 focus:bg-white sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* Tabela desktop */}
      <div className="hidden overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm lg:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-blue-100 bg-slate-50/50">
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Paciente</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Categoria</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Respons\u00E1vel</th>
              <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">\u00DAltima Consulta</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p) => (
              <tr key={p.id} className="border-b border-slate-50 transition-colors hover:bg-blue-50/30">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#0a1628] text-[10px] font-bold text-white">
                      {p.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{p.nome}</p>
                      <p className="text-xs text-slate-400">{p.idade} anos</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${getCoresCategoria(p.categoria)}`}>
                    {getIconeCategoria(p.categoria)} {getLabelCategoria(p.categoria)}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${getCoresStatus(p.status)}`}>
                    {getLabelStatus(p.status)}
                  </span>
                </td>
                <td className="px-5 py-3 text-sm text-slate-500">{p.responsavel ?? "\u2014"}</td>
                <td className="px-5 py-3 text-sm text-slate-500">
                  {new Date(p.ultimaConsulta).toLocaleDateString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtrados.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-slate-400">
            Nenhum paciente encontrado.
          </div>
        )}
      </div>

      {/* Cards mobile */}
      <div className="grid gap-3 lg:hidden">
        {filtrados.map((p) => (
          <div key={p.id} className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#0a1628] text-[10px] font-bold text-white">
                {p.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">{p.nome}</p>
                <p className="text-xs text-slate-400">{p.idade} anos &bull; {p.responsavel ?? "Sem respons\u00E1vel"}</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${getCoresCategoria(p.categoria)}`}>
                {getIconeCategoria(p.categoria)} {getLabelCategoria(p.categoria)}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${getCoresStatus(p.status)}`}>
                {getLabelStatus(p.status)}
              </span>
            </div>
            <p className="mt-2 text-[10px] text-slate-400">
              \u00DAltima: {new Date(p.ultimaConsulta).toLocaleDateString("pt-BR")}
            </p>
          </div>
        ))}
        {filtrados.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-slate-400">
            Nenhum paciente encontrado.
          </div>
        )}
      </div>

      </div>
    </>
  );
}
