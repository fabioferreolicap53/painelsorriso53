import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import type { Paciente } from "./types";
import { buscarPacientes, atualizarPaciente } from "./pocketbase";
import { getCoresCategoria } from "./data";

// ── Helpers ─────────────────────────────────────────────────────────────

function formatarData(dateStr: string): string {
  if (!dateStr) return "\u2014";
  // Extrair YYYY-MM-DD de qualquer formato (ISO, com hora, com espaço, com Z)
  const m = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "\u2014";
  const [, ano, mes, dia] = m;
  return `${dia}/${mes}/${ano}`;
}

/** Calcula idade a partir da data de nascimento — parse manual robusto */
function calcularIdade(dataNascimento: string): number | null {
  if (!dataNascimento) return null;
  // Extrair YYYY-MM-DD de qualquer formato (ISO, com hora, com Z, etc.)
  const m = dataNascimento.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const ano = Number(m[1]);
  const mes = Number(m[2]) - 1; // 0-indexed
  const dia = Number(m[3]);
  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  if (hoje.getMonth() < mes || (hoje.getMonth() === mes && hoje.getDate() < dia)) {
    idade--;
  }
  return idade >= 0 ? idade : null;
}

/** Badge de condicao — reutilizavel */
function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${className}`}>
      {label}
    </span>
  );
}

/** Coluna unificada de categorias — ícones/avatars por especificação */
function renderGruposPrioritarios(p: Paciente) {
  const idade = calcularIdade(p.data_de_nascimento);
  const isCrianca = idade !== null && idade <= 2;

  const itens: { label: string; title: string; className: string; icon: React.ReactNode }[] = [];

  if (p.gestante) {
    itens.push({
      label: "Gestante",
      title: "Gestante",
      className: "bg-pink-50 text-pink-600 ring-pink-200",
      icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M12 11v6m-3-3h6"/></svg>,
    });
  }
  if (p.tb) {
    itens.push({
      label: "TB",
      title: "Tuberculose",
      className: "bg-orange-50 text-orange-600 ring-orange-200",
      icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>,
    });
  }
  if (p.tabagista) {
    itens.push({
      label: "Tabagista",
      title: "Tabagista",
      className: "bg-amber-50 text-amber-600 ring-amber-200",
      icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V6z"/><path d="M10 12h4m-2-2v4"/></svg>,
    });
  }
  if (isCrianca) {
    itens.push({
      label: "Criança",
      title: "Criança (≤2 anos)",
      className: "bg-violet-50 text-violet-600 ring-violet-200",
      icon: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="7" r="4"/><path d="M12 11v7m-3 0h6"/></svg>,
    });
  }

  if (itens.length === 0) return <span className="text-slate-300 text-xs">—</span>;

  return (
    <div className="flex flex-wrap justify-center gap-1">
      {itens.map((item) => (
        <span
          key={item.label}
          title={item.title}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium ring-1 ring-inset ${item.className}`}
        >
          {item.icon}
          {item.label}
        </span>
      ))}
    </div>
  );
}

// ── Calendário PT-BR customizado ────────────────────────────────────────

const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const ANOS_RANGE = Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 10 + i);

function parseData(str: string): { d: number; m: number; y: number } | null {
  if (!str) return null;
  const m = str.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) };
}

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function toDisplay(iso: string): string {
  const p = parseData(iso);
  if (!p) return "";
  return `${String(p.d).padStart(2, "0")}/${String(p.m + 1).padStart(2, "0")}/${p.y}`;
}

/** Mini calendário popup com selector de mês/ano */
function CalendarioPopup({
  valor,
  onSelecionar,
  onFechar,
}: {
  valor: string;
  onSelecionar: (data: string) => void;
  onFechar: () => void;
}) {
  const parsed = parseData(valor);
  const hoje = new Date();
  const [ano, setAno] = useState(parsed?.y ?? hoje.getFullYear());
  const [mes, setMes] = useState(parsed?.m ?? hoje.getMonth());
  const [modoLista, setModoLista] = useState<"dias" | "meses" | "anos">("dias");

  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const diaSel = parsed?.d ?? 0;
  const mesSel = parsed?.m ?? -1;
  const anoSel = parsed?.y ?? -1;

  const dias: (number | null)[] = [
    ...Array(primeiroDia).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ];

  function prevMes() {
    if (mes === 0) { setMes(11); setAno(ano - 1); }
    else setMes(mes - 1);
  }
  function nextMes() {
    if (mes === 11) { setMes(0); setAno(ano + 1); }
    else setMes(mes + 1);
  }

  return (
    <div className="absolute z-[9999] mt-1 rounded-xl border border-slate-200 bg-white p-2.5 shadow-lg" style={{ minWidth: 220 }}>
      {/* Header — clicável para trocar modo */}
      <div className="mb-2 flex items-center justify-between">
        {modoLista === "dias" ? (
          <>
            <button onClick={prevMes} className="rounded p-0.5 text-slate-500 hover:bg-slate-100">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"/></svg>
            </button>
            <button onClick={() => setModoLista("meses")} className="rounded px-1 py-0.5 text-xs font-bold text-slate-700 hover:bg-slate-100">
              {MESES_PT[mes]} {ano}
            </button>
            <button onClick={nextMes} className="rounded p-0.5 text-slate-500 hover:bg-slate-100">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5"/></svg>
            </button>
          </>
        ) : modoLista === "meses" ? (
          <>
            <button onClick={() => { setAno(ano - 1); }} className="rounded p-0.5 text-slate-500 hover:bg-slate-100">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"/></svg>
            </button>
            <button onClick={() => setModoLista("anos")} className="rounded px-1 py-0.5 text-xs font-bold text-slate-700 hover:bg-slate-100">
              {ano}
            </button>
            <button onClick={() => { setAno(ano + 1); }} className="rounded p-0.5 text-slate-500 hover:bg-slate-100">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5"/></svg>
            </button>
          </>
        ) : (
          <>
            <button onClick={() => { setAno(ano - 12); }} className="rounded p-0.5 text-slate-500 hover:bg-slate-100">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"/></svg>
            </button>
            <span className="text-xs font-bold text-slate-700">{ANOS_RANGE[0]}–{ANOS_RANGE[ANOS_RANGE.length - 1]}</span>
            <button onClick={() => setAno(ano + 12)} className="rounded p-0.5 text-slate-500 hover:bg-slate-100">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5"/></svg>
            </button>
          </>
        )}
      </div>

      {/* Modo: seleção de mês */}
      {modoLista === "meses" && (
        <div className="grid grid-cols-3 gap-1">
          {MESES_PT.map((nome, idx) => (
            <button
              key={idx}
              onClick={() => { setMes(idx); setModoLista("dias"); }}
              className={`rounded-lg py-1.5 text-[10px] font-medium transition-colors ${
                idx === mes && ano === anoSel
                  ? "bg-[#0a1628] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {nome.substring(0, 3)}
            </button>
          ))}
        </div>
      )}

      {/* Modo: seleção de ano */}
      {modoLista === "anos" && (
        <div className="grid grid-cols-3 gap-1">
          {ANOS_RANGE.map((a) => (
            <button
              key={a}
              onClick={() => { setAno(a); setModoLista("meses"); }}
              className={`rounded-lg py-1.5 text-[10px] font-medium transition-colors ${
                a === anoSel
                  ? "bg-[#0a1628] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      )}

      {/* Modo: seleção de dias */}
      {modoLista === "dias" && (
        <>
          <div className="mb-1 grid grid-cols-7 gap-0.5">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="py-0.5 text-center text-[9px] font-semibold text-slate-400">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {dias.map((dia, i) => {
              if (dia === null) return <div key={`e${i}`} />;
              const selecionado = dia === diaSel && mes === mesSel && ano === anoSel;
              return (
                <button
                  key={dia}
                  onClick={() => { onSelecionar(toISO(ano, mes, dia)); onFechar(); }}
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] transition-colors ${
                    selecionado ? "bg-[#0a1628] font-bold text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {dia}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Limpar + Hoje */}
      <div className="mt-1.5 flex items-center justify-between border-t border-slate-100 pt-1.5">
        <button onClick={() => { onSelecionar(""); onFechar(); }} className="text-[10px] text-slate-400 hover:text-red-500">Limpar</button>
        <button
          onClick={() => { onSelecionar(toISO(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())); onFechar(); }}
          className="text-[10px] font-semibold text-blue-600 hover:text-blue-800"
        >Hoje</button>
      </div>
    </div>
  );
}

/** Input de data inline com calendário PT-BR + digitação manual — portal para evitar clipping */
function InputDataConsulta({
  valor,
  pacienteId,
  onSalvar,
}: {
  valor: string;
  pacienteId: string;
  onSalvar: (id: string, data: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState(toDisplay(valor));
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);

  function abrir(e: React.MouseEvent) {
    e.stopPropagation();
    if (wrapRef.current) {
      const r = wrapRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX });
    }
    setAberto(!aberto);
  }

  function aplicarDigitacao() {
    const m = texto.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (!m) return;
    let d = Number(m[1]);
    let mo = Number(m[2]);
    let y = Number(m[3]);
    if (y < 100) y += 2000;
    if (d < 1 || d > 31 || mo < 1 || mo > 12 || y < 1900 || y > 2100) return;
    const iso = toISO(y, mo - 1, d);
    onSalvar(pacienteId, iso);
    setTexto(toDisplay(iso));
    setAberto(false);
  }

  // fecha ao clicar fora
  useEffect(() => {
    if (!aberto) return;
    function fechar() { setAberto(false); }
    document.addEventListener("click", fechar);
    return () => document.removeEventListener("click", fechar);
  }, [aberto]);

  return (
    <div ref={wrapRef} className="relative flex items-center justify-center gap-1">
      <input
        type="text"
        value={texto}
        placeholder="dd/mm/aaaa"
        maxLength={10}
        className="w-[90px] rounded border border-transparent bg-transparent px-1 py-0.5 text-center text-xs text-slate-600 outline-none transition-colors focus:border-slate-300 focus:bg-white"
        onChange={(e) => setTexto(e.target.value)}
        onBlur={aplicarDigitacao}
        onKeyDown={(e) => { if (e.key === "Enter") aplicarDigitacao(); }}
      />
      <button
        onClick={abrir}
        className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"/>
        </svg>
      </button>
      {aberto && createPortal(
        <div style={{ position: "absolute", top: pos.top, left: pos.left, zIndex: 99999 }}>
          <CalendarioPopup
            valor={valor}
            onSelecionar={(data) => { onSalvar(pacienteId, data); setTexto(toDisplay(data)); }}
            onFechar={() => setAberto(false)}
          />
        </div>,
        document.body
      )}
    </div>
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

  /** Salvar data de última consulta no PocketBase */
  async function salvarDataConsulta(id: string, data: string) {
    try {
      await atualizarPaciente(id, { data_ultima_cons_oriclista: data });
      setPacientes((prev) =>
        prev.map((p) => (p.id === id ? { ...p, data_ultima_cons_oriclista: data } : p))
      );
    } catch (e) {
      console.error("Erro ao salvar data:", e);
    }
  }

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
    else if (filtro === "crianca") {
      const idade = calcularIdade(p.data_de_nascimento);
      matchFiltro = idade !== null && idade <= 2;
    }
    else if (filtro === "tb") matchFiltro = p.tb === true;
    else if (filtro === "tabagista") matchFiltro = p.tabagista === true;
    else if (filtro === "todos") {
      const idade = calcularIdade(p.data_de_nascimento);
      const isCrianca = idade !== null && idade <= 2;
      matchFiltro = p.gestante === true || p.tb === true || p.tabagista === true || isCrianca;
    }

    return matchBusca && matchFiltro;
  });

  const filtros = [
    { key: "todos", label: "Todos" },
    { key: "gestante", label: "Gestantes" },
    { key: "crianca", label: "Crianças ≤2a" },
    { key: "tb", label: "TB" },
    { key: "tabagista", label: "Tabagistas" },
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

        <div className="relative mx-auto flex max-w-[1380px] flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
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
              <p className="text-3xl font-bold text-white">
                {carregando ? "\u2026" : filtrados.length.toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1380px] px-4 py-8 sm:px-6 lg:px-8">

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
                      className={`whitespace-nowrap rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-150 ${
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
                    placeholder="Buscar por nome, prontuário, equipe, unidade..."
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-700 placeholder-slate-400 outline-none transition-colors focus:border-blue-400 focus:bg-white sm:w-80"
                  />
                </div>
              </div>
            </div>

            {/* ═══ TABELA DESKTOP ═══════════════════════════════════════ */}
            <div className="hidden rounded-xl border border-blue-100 bg-white shadow-sm xl:block" style={{ overflow: "visible" }}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-blue-100 bg-slate-50/50">
                      <th className="px-3 py-3 text-center text-sm font-semibold uppercase tracking-wide text-slate-500">Últ. Consulta Odonto</th>
                      <th className="px-3 py-3 text-center text-sm font-semibold uppercase tracking-wide text-slate-500">Paciente</th>
                      <th className="px-3 py-3 text-center text-sm font-semibold uppercase tracking-wide text-slate-500">Local</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((p) => {
                      const idadeNum = calcularIdade(p.data_de_nascimento);
                      return (
                      <tr key={p.id} className="border-b border-slate-50 transition-colors hover:bg-blue-50/30">
                        <td className="px-3 py-3 align-top">
                          <InputDataConsulta valor={p.data_ultima_cons_oriclista} pacienteId={p.id} onSalvar={salvarDataConsulta} />
                        </td>
                        <td className="px-3 py-3 text-center align-top">
                          <div className="leading-tight">
                            <p className="text-sm font-semibold text-slate-700 break-words">{p.paciente || "\u2014"}</p>
                            <p className="text-xs text-slate-500 break-all font-mono">{p.n_cns_da_pessoa_cadastrada || "\u2014"}</p>
                            <p className="text-xs text-slate-500">{formatarData(p.data_de_nascimento)}</p>
                            <p className="text-xs text-slate-500">
                              {idadeNum !== null ? (
                                <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                                  idadeNum <= 2 ? "bg-violet-50 text-violet-600 ring-violet-200"
                                  : idadeNum < 60 ? "bg-slate-50 text-slate-600 ring-slate-200"
                                  : "bg-amber-50 text-amber-600 ring-amber-200"
                                }`}>
                                  {idadeNum}a
                                </span>
                              ) : "—"}
                            </p>
                            <div className="mt-1 flex flex-wrap justify-center gap-1">
                              {renderGruposPrioritarios(p)}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center text-sm text-slate-500 max-w-[180px] align-top">
                          <div className="flex flex-col items-center leading-tight">
                            <span className="truncate font-semibold text-slate-600">{p.unidade || "\u2014"}</span>
                            <span className="truncate text-slate-500">{p.equipe || "\u2014"}</span>
                            <span className="truncate text-slate-500">Micro: {p.microarea || "\u2014"}</span>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
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
            <div className="hidden rounded-xl border border-blue-100 bg-white shadow-sm md:block xl:hidden" style={{ overflow: "visible" }}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-blue-100 bg-slate-50/50">
                      <th className="px-3 py-3 text-center text-sm font-semibold uppercase tracking-wide text-slate-500">Últ. Consulta Odonto</th>
                      <th className="px-3 py-3 text-center text-sm font-semibold uppercase tracking-wide text-slate-500">Paciente</th>
                      <th className="px-3 py-3 text-center text-sm font-semibold uppercase tracking-wide text-slate-500">Local</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((p) => {
                      const idadeNum = calcularIdade(p.data_de_nascimento);
                      return (
                      <tr key={p.id} className="border-b border-slate-50 transition-colors hover:bg-blue-50/30">
                        <td className="px-3 py-3 align-top">
                          <InputDataConsulta valor={p.data_ultima_cons_oriclista} pacienteId={p.id} onSalvar={salvarDataConsulta} />
                        </td>
                        <td className="px-3 py-3 text-center align-top">
                          <div className="leading-tight">
                            <p className="text-sm font-semibold text-slate-700 break-words">{p.paciente || "\u2014"}</p>
                            <p className="text-xs text-slate-500 break-all font-mono">{p.n_cns_da_pessoa_cadastrada || "\u2014"}</p>
                            <p className="text-xs text-slate-500">{formatarData(p.data_de_nascimento)}</p>
                            <p className="text-xs text-slate-500">
                              {idadeNum !== null ? (
                                <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                                  idadeNum <= 2 ? "bg-violet-50 text-violet-600 ring-violet-200"
                                  : idadeNum < 60 ? "bg-slate-50 text-slate-600 ring-slate-200"
                                  : "bg-amber-50 text-amber-600 ring-amber-200"
                                }`}>
                                  {idadeNum}a
                                </span>
                              ) : "—"}
                            </p>
                            <div className="mt-1 flex flex-wrap justify-center gap-1">
                              {renderGruposPrioritarios(p)}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center text-sm text-slate-500 max-w-[180px] align-top">
                          <div className="flex flex-col items-center leading-tight">
                            <span className="truncate font-semibold text-slate-600">{p.unidade || "\u2014"}</span>
                            <span className="truncate text-slate-500">{p.equipe || "\u2014"}</span>
                            <span className="truncate text-slate-500">Micro: {p.microarea || "\u2014"}</span>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filtrados.length === 0 && (
                <div className="px-5 py-10 text-center text-sm text-slate-400">Nenhum paciente encontrado.</div>
              )}
            </div>

            {/* ═══ CARDS MOBILE (< md) ══════════════════════════════════ */}
            <div className="grid gap-4 md:hidden">
              {filtrados.map((p) => (
                <div key={p.id} className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#0a1628] text-xs font-bold text-white">
                      {iniciais(p.paciente)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-slate-800 truncate">{p.paciente}</p>
                      <p className="text-sm text-slate-500">
                        {(() => { const idade = calcularIdade(p.data_de_nascimento); return idade ? `${idade} anos` : ""; })()} {p.n_pront ? `\u2022 ${p.n_pront}` : ""}
                      </p>
                      <p className="text-sm text-slate-400">{p.equipe} \u2022 {p.microarea}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <InputDataConsulta valor={p.data_ultima_cons_oriclista} pacienteId={p.id} onSalvar={salvarDataConsulta} />
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {renderBadges(p)}
                  </div>
                  <p className="mt-2 text-xs text-slate-300 truncate">{p.unidade}</p>
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
