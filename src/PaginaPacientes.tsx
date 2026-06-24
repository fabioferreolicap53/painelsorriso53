import { useState, useEffect } from "react";
import type { Paciente } from "./types";
import { buscarPacientes } from "./pocketbase";
import { getCoresCategoria } from "./data";

// ── Helpers ─────────────────────────────────────────────────────────────

function formatarData(dateStr: string): string {
  if (!dateStr) return "\u2014";
  try {
    const d = new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00"));
    return d.toLocaleDateString("pt-BR");
  } catch {
    return dateStr;
  }
}

/** Calcula idade a partir da data de nascimento (YYYY-MM-DD) */
function calcularIdade(dataNascimento: string): string {
  if (!dataNascimento) return "";
  try {
    const nascimento = new Date(dataNascimento + (dataNascimento.includes("T") ? "" : "T00:00:00"));
    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mesAtual = hoje.getMonth();
    const diaAtual = hoje.getDate();
    if (mesAtual < nascimento.getMonth() || (mesAtual === nascimento.getMonth() && diaAtual < nascimento.getDate())) {
      idade--;
    }
    return idade >= 0 ? String(idade) : "";
  } catch {
    return "";
  }
}

/** Badge de condicao — reutilizavel */
function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${className}`}>
      {label}
    </span>
  );
}

// ── Componente ──────────────────────────────────────────────────────────

export default function PaginaPacientes() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<string>("todos");

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      try {
        setCarregando(true);
        setErro(null);
        const { items } = await buscarPacientes({ perPage: 500 });
        if (!cancelado) setPacientes(items);
      } catch (e) {
        if (!cancelado) setErro(e instanceof Error ? e.message : "Erro ao carregar pacientes");
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }
    carregar();
    return () => { cancelado = true; };
  }, []);

  // Busca em multiplos campos
  const filtrados = pacientes.filter((p) => {
    const q = busca.toLowerCase();
    const matchBusca =
      busca === "" ||
      p.paciente?.toLowerCase().includes(q) ||
      p.n_pront?.toLowerCase().includes(q) ||
      p.equipe?.toLowerCase().includes(q) ||
      p.unidade?.toLowerCase().includes(q) ||
      p.microarea?.toLowerCase().includes(q) ||
      p.n_cns_da_pessoa_cadastrada?.toLowerCase().includes(q);

    let matchFiltro = true;
    if (filtro === "gestante") matchFiltro = p.gestante === true;
    else if (filtro === "tb") matchFiltro = p.tb === true;
    else if (filtro === "tabagista") matchFiltro = p.tabagista === true;
    else if (filtro === "has") matchFiltro = p.has === true;
    else if (filtro === "dm") matchFiltro = p.dm === true;
    else if (filtro === "hiv") matchFiltro = p.hiv === true;
    else if (filtro === "bf") matchFiltro = p.familia_recebe_bf === true;

    return matchBusca && matchFiltro;
  });

  const filtros = [
    { key: "todos", label: "Todos" },
    { key: "gestante", label: "Gestantes" },
    { key: "tb", label: "TB" },
    { key: "tabagista", label: "Tabagistas" },
    { key: "has", label: "HAS" },
    { key: "dm", label: "DM" },
    { key: "hiv", label: "HIV" },
    { key: "bf", label: "Bolsa Fam\u00EDlia" },
  ];

  /** Renderiza badges de condicoes do paciente */
  function renderBadges(p: Paciente) {
    return (
      <div className="flex flex-wrap gap-1">
        {p.gestante && <Badge label="\uD83D\uDC70 Gestante" className={getCoresCategoria("gestante")} />}
        {p.tb && <Badge label="\uD83E\uDEC1 TB" className={getCoresCategoria("tuberculose")} />}
        {p.tabagista && <Badge label="\uD83D\uDEAC Tabagista" className={getCoresCategoria("tabagista")} />}
        {p.has && <Badge label="HAS" className="bg-slate-100 text-slate-600" />}
        {p.dm && <Badge label="DM" className="bg-slate-100 text-slate-600" />}
        {p.hiv && <Badge label="HIV" className="bg-slate-100 text-slate-600" />}
        {p.familia_recebe_bf && <Badge label="BF" className="bg-emerald-50 text-emerald-600" />}
      </div>
    );
  }

  /** Iniciais do nome */
  function iniciais(nome: string): string {
    return nome?.split(" ").map((n) => n[0]).slice(0, 2).join("") ?? "?";
  }

  return (
    <>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-b-3xl bg-gradient-to-br from-[#162544] via-[#1a3055] to-[#0d2247] px-8 py-6 sm:px-10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-blue-400/8 blur-2xl" />
        <div className="absolute right-1/3 top-0 h-32 w-32 rounded-full bg-cyan-400/5 blur-2xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />

        <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-400/10 px-3 py-1 ring-1 ring-blue-400/15">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-300">Prontu\u00E1rio</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              PACIENTES <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Cadastrados</span>
            </h1>
            <p className="mt-2 text-sm text-blue-200/60">
              Gerencie e acompanhe todos os pacientes do seu territ\u00F3rio.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-white/[0.06] px-5 py-3 ring-1 ring-white/[0.08] backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-300/70">Total Encontrados</p>
              <p className="text-3xl font-bold text-white">
                {carregando ? "\u2026" : filtrados.length.toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-slate-800">Lista de Pacientes</h2>
          <button className="inline-flex items-center gap-2 rounded-xl bg-[#0a1628] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-[#0f2140] hover:shadow-md">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Novo Acompanhamento
          </button>
        </div>

        {/* Erro */}
        {erro && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">Erro ao conectar ao PocketBase:</p>
            <p className="mt-1">{erro}</p>
          </div>
        )}

        {/* Loading */}
        {carregando && (
          <div className="mb-4 rounded-xl border border-blue-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
            <p className="mt-3 text-sm text-slate-400">Carregando pacientes do PocketBase...</p>
          </div>
        )}

        {/* Filtros + busca */}
        {!carregando && !erro && (
          <>
            <div className="mb-4 rounded-xl border border-blue-100 bg-white p-3 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-1 overflow-x-auto">
                  {filtros.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setFiltro(f.key)}
                      className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                        filtro === f.key
                          ? "bg-[#0a1628] text-white shadow-sm"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <svg className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar por nome, prontu\u00E1rio, equipe, unidade..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-700 placeholder-slate-400 outline-none transition-colors focus:border-blue-400 focus:bg-white sm:w-80"
                  />
                </div>
              </div>
            </div>

            {/* ═══ TABELA DESKTOP ═══════════════════════════════════════ */}
            <div className="hidden overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm xl:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-blue-100 bg-slate-50/50">
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Paciente</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Pront.</th>
                      <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Idade</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Equipe</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Micro\u00E1rea</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Condi\u00E7\u00F5es</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">\u00DAltima Consulta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((p) => (
                      <tr key={p.id} className="border-b border-slate-50 transition-colors hover:bg-blue-50/30">
                        {/* Paciente + unidade */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#0a1628] text-[10px] font-bold text-white">
                              {iniciais(p.paciente)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate max-w-[220px]">{p.paciente}</p>
                              <p className="text-[10px] text-slate-400 truncate max-w-[220px]">{p.unidade}</p>
                            </div>
                          </div>
                        </td>
                        {/* Prontuario */}
                        <td className="px-4 py-3 text-xs font-mono text-slate-600">{p.n_pront || "\u2014"}</td>
                        {/* Idade */}
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex h-7 min-w-[2rem] items-center justify-center rounded-lg bg-slate-100 px-2 text-xs font-bold text-slate-600">
                            {(() => { const idade = calcularIdade(p.data_de_nascimento); return idade ? `${idade}a` : "\u2014"; })()}
                          </span>
                        </td>
                        {/* Equipe */}
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-[150px] truncate">{p.equipe || "\u2014"}</td>
                        {/* Microarea */}
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-md bg-blue-50 px-2 text-[10px] font-bold text-blue-600">
                            {p.microarea || "\u2014"}
                          </span>
                        </td>
                        {/* Condicoes */}
                        <td className="px-4 py-3">{renderBadges(p)}</td>
                        {/* Data ultima consulta */}
                        <td className="px-4 py-3 text-xs text-slate-500">{formatarData(p.data_ultima_cons_oriclista)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtrados.length === 0 && (
                <div className="px-5 py-10 text-center text-sm text-slate-400">
                  Nenhum paciente encontrado.
                </div>
              )}
              <div className="border-t border-slate-100 px-5 py-2 text-[10px] text-slate-400">
                {filtrados.length} registro{filtrados.length !== 1 ? "s" : ""} encontrado{filtrados.length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* ═══ TABELA TABLET (md-xl) ═══════════════════════════════ */}
            <div className="hidden overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm md:block xl:hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-blue-100 bg-slate-50/50">
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Paciente</th>
                      <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Idade</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Equipe</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Condi\u00E7\u00F5es</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Consulta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((p) => (
                      <tr key={p.id} className="border-b border-slate-50 transition-colors hover:bg-blue-50/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#0a1628] text-[10px] font-bold text-white">
                              {iniciais(p.paciente)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate max-w-[200px]">{p.paciente}</p>
                              <p className="text-[10px] text-slate-400">{p.n_pront || "\u2014"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex h-7 min-w-[2rem] items-center justify-center rounded-lg bg-slate-100 px-2 text-xs font-bold text-slate-600">
                            {(() => { const idade = calcularIdade(p.data_de_nascimento); return idade ? `${idade}a` : "\u2014"; })()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-[120px] truncate">{p.equipe || "\u2014"}</td>
                        <td className="px-4 py-3">{renderBadges(p)}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{formatarData(p.data_ultima_cons_oriclista)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtrados.length === 0 && (
                <div className="px-5 py-10 text-center text-sm text-slate-400">Nenhum paciente encontrado.</div>
              )}
            </div>

            {/* ═══ CARDS MOBILE (< md) ══════════════════════════════════ */}
            <div className="grid gap-3 md:hidden">
              {filtrados.map((p) => (
                <div key={p.id} className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#0a1628] text-[10px] font-bold text-white">
                      {iniciais(p.paciente)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{p.paciente}</p>
                      <p className="text-xs text-slate-400">
                        {(() => { const idade = calcularIdade(p.data_de_nascimento); return idade ? `${idade} anos` : ""; })()} {p.n_pront ? `\u2022 ${p.n_pront}` : ""}
                      </p>
                      <p className="text-[10px] text-slate-400">{p.equipe} \u2022 {p.microarea}</p>
                    </div>
                    <span className="flex-shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
                      {formatarData(p.data_ultima_cons_oriclista)}
                    </span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {renderBadges(p)}
                  </div>
                  <p className="mt-2 text-[10px] text-slate-300 truncate">{p.unidade}</p>
                </div>
              ))}
              {filtrados.length === 0 && (
                <div className="px-5 py-10 text-center text-sm text-slate-400">Nenhum paciente encontrado.</div>
              )}
            </div>

          </>
        )}

      </div>
    </>
  );
}
