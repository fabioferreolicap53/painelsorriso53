import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { Acompanhamento, Paciente } from "./types";
import { buscarTodosAcompanhamentos, buscarAcompanhamentos, buscarPacientes, excluirAcompanhamento } from "./pocketbase";
import { getCoresCategoria } from "./data";
import { CustomSelect } from "./CustomSelect";
import ModalAcompanhamento from "./ModalAcompanhamento";
import { classificarResolucao } from "./resolucao";
import { BadgeResolucao } from "./ResolucaoUI";

// ── Active Filters Bar ───────────────────────────────────────────────

function ActiveFiltersBar({ filtros }: { filtros: { label: string; valor: string; cor?: string }[] }) {
  if (filtros.length === 0) return null;
  return (
    <div className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-100">
      <div className="mx-auto max-w-[1380px] px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <svg className="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" /></svg>
        <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-slate-400">Filtros:</span>
        {filtros.map((f, i) => (
          <span key={i} className={`inline-flex items-center gap-1 shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide ring-1 ${f.cor || "bg-cyan-50 text-cyan-700 ring-cyan-200/60"}`}>
            {f.label}: {f.valor}
          </span>
        ))}
      </div>
    </div>
  );
}

function formatarData(dateStr: string): string {
  if (!dateStr) return "";
  const m = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return dateStr;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function calcularIdade(dataNascimento: string): number | null {
  if (!dataNascimento) return null;
  const m = dataNascimento.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const ano = Number(m[1]);
  const mes = Number(m[2]) - 1;
  const dia = Number(m[3]);
  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  if (hoje.getMonth() < mes || (hoje.getMonth() === mes && hoje.getDate() < dia)) idade--;
  return idade >= 0 ? idade : null;
}

function renderGrupos(p: Paciente) {
  const idade = calcularIdade(p.data_de_nascimento);
  const isCrianca = idade !== null && idade <= 2;
  const itens: { label: string; className: string }[] = [];
  if (p.gestante) itens.push({ label: "Gestante", className: getCoresCategoria("gestante") });
  if (p.tb) itens.push({ label: "TB", className: getCoresCategoria("tuberculose") });
  if (p.tabagista) itens.push({ label: "Tabagista", className: getCoresCategoria("tabagista") });
  if (isCrianca) itens.push({ label: "≤2a", className: getCoresCategoria("crianca") });
  if (itens.length === 0) return null;
  return (
    <div className="flex flex-wrap justify-center gap-1">
      {itens.map((item) => (
        <span key={item.label} className={`inline-flex items-center rounded-full px-2 py-[1px] text-[8px] font-bold uppercase tracking-wider ${item.className}`}>
          {item.label}
        </span>
      ))}
    </div>
  );
}

export default function PaginaAcompanhamentos({ selectedPacienteId }: { selectedPacienteId?: string | null }) {
  const [acompanhamentos, setAcompanhamentos] = useState<Acompanhamento[]>([]);
  const [pacMap, setPacMap] = useState<Record<string, Paciente>>({});
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [mostrarBusca, setMostrarBusca] = useState(false);
  const [mostrarAvancada, setMostrarAvancada] = useState(false);
  const [filtro, setFiltro] = useState<string>("todos");
  const [filtroResolucao, setFiltroResolucao] = useState<string>("todos");
  const [filtroUnidade, setFiltroUnidade] = useState<string>("todas");
  const [filtroEquipe, setFiltroEquipe] = useState<string>("todas");
  const [filtroMicroarea, setFiltroMicroarea] = useState<string>("todas");
  const [filtroStatus, setFiltroStatus] = useState<string>("todas");
  const [filtroUnidadeDraft, setFiltroUnidadeDraft] = useState<string>("todas");
  const [filtroEquipeDraft, setFiltroEquipeDraft] = useState<string>("todas");
  const [filtroMicroareaDraft, setFiltroMicroareaDraft] = useState<string>("todas");
  const [filtroStatusDraft, setFiltroStatusDraft] = useState<string>("todas");
  const [filtroGrupoDraft, setFiltroGrupoDraft] = useState<string>("todos");
  const [filtroTipoBusca, setFiltroTipoBusca] = useState<string>("todas");
  const [filtroTipoContato, setFiltroTipoContato] = useState<string>("todas");
  const [filtroTipoBuscaDraft, setFiltroTipoBuscaDraft] = useState<string>("todas");
  const [filtroTipoContatoDraft, setFiltroTipoContatoDraft] = useState<string>("todas");
  const filtrosAtivos = [filtroUnidade, filtroEquipe, filtroMicroarea, filtroStatus]
    .filter((v) => v !== "todas").length
    + (filtro !== "todos" ? 1 : 0)
    + (filtroTipoBusca !== "todas" ? 1 : 0) + (filtroTipoContato !== "todas" ? 1 : 0)
    + (filtroResolucao !== "todos" ? 1 : 0);
  const unidades = [...new Set(Object.values(pacMap).map(p => p.unidade).filter(Boolean))].sort();
  const equipes = [...new Set(Object.values(pacMap).map(p => p.equipe).filter(Boolean))].sort();
  const microareas = [...new Set(Object.values(pacMap).map(p => p.microarea).filter(Boolean))].sort();
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tipo: "ok" | "erro"; msg: string } | null>(null);

  function handleExcluir(id: string) {
    if (excluindo) return;
    if (!window.confirm("Tem certeza que deseja excluir este registro de acompanhamento?")) return;
    setExcluindo(id);
    excluirAcompanhamento(id)
      .then(() => {
        setAcompanhamentos((prev) => prev.filter((a) => a.id !== id));
        setExcluindo(null);
        setToast({ tipo: "ok", msg: "Registro excluído com sucesso." });
        setTimeout(() => setToast(null), 3000);
      })
      .catch(() => {
        setExcluindo(null);
        setToast({ tipo: "erro", msg: "Erro ao excluir registro." });
        setTimeout(() => setToast(null), 3000);
      });
  }

  const [editandoAcomp, setEditandoAcomp] = useState<Acompanhamento | null>(null);
  const [detalheAcomp, setDetalheAcomp] = useState<Acompanhamento | null>(null);

  useEffect(() => {
    let cancel = false;
    async function carregar() {
      try {
        const pacsPromise = buscarPacientes({ perPage: 500 });
        const acompsPromise = selectedPacienteId
          ? buscarAcompanhamentos(selectedPacienteId)
          : buscarTodosAcompanhamentos();
        const [acomps, pacs] = await Promise.all([acompsPromise, pacsPromise]);
        if (cancel) return;
        setAcompanhamentos(acomps);
        const map: Record<string, Paciente> = {};
        pacs.items.forEach((p) => { map[p.id] = p; });
        setPacMap(map);
      } catch { /* ignore */ }
      finally { if (!cancel) setCarregando(false); }
    }
    carregar();
    return () => { cancel = true; };
  }, [selectedPacienteId]);

  const tabelaMobileRef = useRef<HTMLDivElement>(null);
  const [toastScroll, setToastScroll] = useState(false);
  const toastMostrado = useRef(false);
  const [sortField, setSortField] = useState<string>("data");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  // Toast: detecta tabela mobile visível → mostra aviso de scroll
  useEffect(() => {
    if (toastMostrado.current) return;
    const el = tabelaMobileRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !toastMostrado.current) {
          toastMostrado.current = true;
          setToastScroll(true);
          setTimeout(() => setToastScroll(false), 3500);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [carregando]);

  const buscaLower = busca.toLowerCase().trim();
  const filtrados = buscaLower
    ? acompanhamentos.filter((a) => {
        const pac = pacMap[a.paciente_id];
        return (
          (pac?.paciente?.toLowerCase() ?? "").includes(buscaLower) ||
          (pac?.n_pront?.toLowerCase() ?? "").includes(buscaLower)
        );
      })
    : acompanhamentos;

  const filtradosComGrupo = (() => {
    let resultado = filtrados;
    if (filtro !== "todos") {
      resultado = resultado.filter((a) => {
        const pac = pacMap[a.paciente_id];
        if (!pac) return false;
        if (filtro === "gestante") return pac.gestante === true;
        if (filtro === "crianca") {
          const idade = calcularIdade(pac.data_de_nascimento);
          return idade !== null && idade <= 2;
        }
        if (filtro === "tb") return pac.tb === true;
        if (filtro === "tabagista") return pac.tabagista === true;
        return true;
      });
    }
    if (filtroUnidade !== "todas") {
      resultado = resultado.filter((a) => {
        const pac = pacMap[a.paciente_id];
        return pac?.unidade === filtroUnidade;
      });
    }
    if (filtroEquipe !== "todas") {
      resultado = resultado.filter((a) => {
        const pac = pacMap[a.paciente_id];
        return pac?.equipe === filtroEquipe;
      });
    }
    if (filtroMicroarea !== "todas") {
      resultado = resultado.filter((a) => {
        const pac = pacMap[a.paciente_id];
        return pac?.microarea === filtroMicroarea;
      });
    }
    if (filtroStatus !== "todas") {
      resultado = resultado.filter((a) => {
        if (filtroStatus === "PENDENTE") return !a.situacao_pos_busca;
        return a.situacao_pos_busca === filtroStatus;
      });
    }
    if (filtroTipoBusca !== "todas") {
      resultado = resultado.filter((a) => a.tipo_busca === filtroTipoBusca);
    }
    if (filtroTipoContato !== "todas") {
      resultado = resultado.filter((a) => a.tipo_contato === filtroTipoContato);
    }
    if (filtroResolucao !== "todos") {
      resultado = resultado.filter((a) => classificarResolucao(a.situacao_pos_busca, a.resolucao) === filtroResolucao);
    }
    return resultado;
  })();

  const filtradosSorted = [...filtradosComGrupo].sort((a, b) => {
    const pacA = pacMap[a.paciente_id];
    const pacB = pacMap[b.paciente_id];
    let va = "", vb = "";
    switch (sortField) {
      case "data":       va = a.data_da_busca || "";                   vb = b.data_da_busca || "";                   break;
      case "paciente":   va = pacA?.paciente || "";                    vb = pacB?.paciente || "";                    break;
      case "busca":      va = a.tipo_busca || "";                      vb = b.tipo_busca || "";                      break;
      case "situacao":   va = a.situacao_pos_busca || "";              vb = b.situacao_pos_busca || "";              break;
      case "entraves":   va = a.entraves_identificados || "";          vb = b.entraves_identificados || "";          break;
      case "unidade":    va = pacA?.unidade || "";                     vb = pacB?.unidade || "";                     break;
      default:           va = a.data_da_busca || "";                   vb = b.data_da_busca || "";                   break;
    }
    const cmp = va.localeCompare(vb, "pt-BR", { sensitivity: "base" });
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="relative overflow-hidden rounded-b-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-950 px-5 py-5 sm:px-6 shadow-xl shadow-slate-900/30">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-cyan-500/15 blur-2xl" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

        <div className="relative mx-auto flex max-w-[1380px] flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-0.5 rounded-full bg-gradient-to-b from-cyan-400 to-cyan-600" />
            <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">
              ACOMPANHAMENTOS <span className="text-cyan-300 font-bold">Registrados</span>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {[
              { key: "gestante", label: "Gestantes", activeColor: "text-rose-300", activeBorder: "border-rose-400", icon: <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg> },
              { key: "crianca", label: "Crianças ≤2a", activeColor: "text-blue-300", activeBorder: "border-blue-400", icon: <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" /></svg> },
              { key: "tabagista", label: "Tabagistas", activeColor: "text-orange-300", activeBorder: "border-orange-400", icon: <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" /></svg> },
              { key: "tb", label: "TB", activeColor: "text-red-300", activeBorder: "border-red-400", icon: <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg> },
            ].map(({ key, label, activeColor, activeBorder, icon }) => (
              <button
                key={key}
                onClick={() => setFiltro(filtro === key ? "todos" : key)}
                className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 pb-0.5 border-b-2 ${
                  filtro === key
                    ? `${activeColor} ${activeBorder}`
                    : "text-white/40 border-transparent hover:text-white/70"
                }`}
              >
                {icon}
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
            <div className="h-4 w-px bg-white/10" />
            {[
              { key: "resolvido", label: "Resolvidos", activeColor: "text-emerald-300", activeBorder: "border-emerald-400", icon: <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg> },
              { key: "pendente", label: "Pendentes", activeColor: "text-amber-300", activeBorder: "border-amber-400", icon: <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg> },
              { key: "nao_resolvido", label: "Não Resolvidos", activeColor: "text-red-300", activeBorder: "border-red-400", icon: <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg> },
            ].map(({ key, label, activeColor, activeBorder, icon }) => (
              <button
                key={key}
                onClick={() => setFiltroResolucao(filtroResolucao === key ? "todos" : key)}
                className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 pb-0.5 border-b-2 ${
                  filtroResolucao === key
                    ? `${activeColor} ${activeBorder}`
                    : "text-white/40 border-transparent hover:text-white/70"
                }`}
              >
                {icon}
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-baseline gap-2">
              <svg className="h-4 w-4 text-emerald-300/70" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">Registros</span>
              <span className="text-2xl font-black text-white tabular-nums leading-none">
                {carregando ? "\u2026" : filtradosComGrupo.length.toLocaleString("pt-BR")}
              </span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-white/10" />
            <div className="w-full sm:w-auto flex items-center gap-2 justify-center sm:justify-start">
              <button
                onClick={() => { setMostrarBusca(!mostrarBusca); setMostrarAvancada(false); }}
                className={`group relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider ring-1 transition-all duration-200 ${mostrarBusca ? "bg-white/[0.12] text-white/90 ring-white/20 shadow-lg shadow-white/5" : "bg-white/[0.07] text-white/50 ring-white/10 hover:bg-white/[0.12] hover:text-white/80 hover:ring-white/20"}`}
              >
                <svg className="h-3.5 w-3.5 text-cyan-300 transition-transform duration-200 group-hover:scale-110" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                <span className="hidden sm:inline">Buscar</span>
              </button>
              <button
                onClick={() => {
                  setMostrarAvancada(!mostrarAvancada);
                  setMostrarBusca(false);
                  if (!mostrarAvancada) {
                    setFiltroUnidadeDraft(filtroUnidade);
                    setFiltroEquipeDraft(filtroEquipe);
                    setFiltroMicroareaDraft(filtroMicroarea);
                    setFiltroStatusDraft(filtroStatus);
                    setFiltroGrupoDraft(filtro);
                    setFiltroTipoBuscaDraft(filtroTipoBusca);
                    setFiltroTipoContatoDraft(filtroTipoContato);
                  }
                }}
                className={`group relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-[10px] font-bold uppercase tracking-wider ring-1 transition-all duration-200 ${mostrarAvancada ? "bg-white/[0.12] text-white/90 ring-white/20 shadow-lg shadow-white/5" : "bg-white/[0.07] text-white/50 ring-white/10 hover:bg-white/[0.12] hover:text-white/80 hover:ring-white/20"}`}
              >
                <svg className="h-3.5 w-3.5 text-cyan-300 transition-transform duration-200 group-hover:scale-110" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" /></svg>
                <span className="hidden sm:inline">Filtros</span>
                {filtrosAtivos > 0 && (
                  <span className="rounded-full bg-cyan-400/20 px-1.5 py-0.5 text-[8px] font-black text-cyan-300 ring-1 ring-cyan-400/30 leading-none">
                    {filtrosAtivos}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filtros Ativos ─────────────────────────────────────── */}
      <ActiveFiltersBar filtros={[
        ...(filtro !== "todos" ? [{ label: "Grupo", valor: filtro, cor: "bg-rose-50 text-rose-700 ring-rose-200/60" }] : []),
        ...(filtroUnidade !== "todas" ? [{ label: "Unidade", valor: filtroUnidade, cor: "bg-sky-50 text-sky-700 ring-sky-200/60" }] : []),
        ...(filtroEquipe !== "todas" ? [{ label: "Equipe", valor: filtroEquipe, cor: "bg-violet-50 text-violet-700 ring-violet-200/60" }] : []),
        ...(filtroMicroarea !== "todas" ? [{ label: "Microárea", valor: filtroMicroarea, cor: "bg-emerald-50 text-emerald-700 ring-emerald-200/60" }] : []),
        ...(filtroStatus !== "todas" ? [{ label: "Status", valor: filtroStatus, cor: "bg-amber-50 text-amber-700 ring-amber-200/60" }] : []),
        ...(filtroTipoBusca !== "todas" ? [{ label: "Tipo Busca", valor: filtroTipoBusca, cor: "bg-blue-50 text-blue-700 ring-blue-200/60" }] : []),
        ...(filtroTipoContato !== "todas" ? [{ label: "Tipo Contato", valor: filtroTipoContato, cor: "bg-rose-50 text-rose-700 ring-rose-200/60" }] : []),
        ...(filtroResolucao !== "todos" ? [{ label: "Resolução", valor: filtroResolucao.replace("_", " "), cor: "bg-orange-50 text-orange-700 ring-orange-200/60" }] : []),
      ]} />

      {mostrarBusca && (
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-950 px-5 sm:px-6 pb-4">
          <div className="mx-auto max-w-[1380px]">
            <div className="relative flex items-center">
              <svg className="pointer-events-none absolute left-3 h-4 w-4 text-white/40" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar por paciente, prontuário..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                autoFocus
                className="w-full rounded-lg bg-white/[0.07] border border-white/10 py-2.5 pl-10 pr-10 text-sm font-medium text-white placeholder-white/40 outline-none transition-all duration-200 focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/20"
              />
              <button onClick={() => { setMostrarBusca(false); setBusca(""); }} className="absolute right-2 flex h-6 w-6 items-center justify-center rounded-md text-white/40 transition-all hover:bg-white/10 hover:text-white/70">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarAvancada && (
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-950 px-3 sm:px-5 md:px-6 pb-4">
          <div className="mx-auto max-w-[1380px] overflow-visible rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.03] ring-1 ring-white/[0.12] shadow-lg shadow-black/20 backdrop-blur-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] px-3 sm:px-5 py-3">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg bg-cyan-400/15 ring-1 ring-cyan-400/20">
                  <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-cyan-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" /></svg>
                </div>
                <span className="text-[11px] sm:text-sm font-bold uppercase tracking-widest text-white/60">Filtros Avançados</span>
              </div>
              <button onClick={() => setMostrarAvancada(false)} className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-white/40 transition-all hover:bg-white/10 hover:text-white/70">
                <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Grid de selects compacto */}
            <div className="grid grid-cols-1 gap-2 sm:gap-3 px-3 sm:px-5 pt-3 sm:pt-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Unidade */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5 rounded-xl bg-white/[0.05] px-3 py-2 sm:py-2.5 ring-1 ring-white/[0.08] transition-all hover:bg-white/[0.07] hover:ring-white/[0.12]">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-lg bg-sky-400/10 ring-1 ring-sky-400/20">
                    <svg className="h-2.5 w-2.5 text-sky-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white/40">Unidade</span>
                </div>
                <CustomSelect value={filtroUnidadeDraft} onChange={setFiltroUnidadeDraft} options={[{ value: "todas", label: "Todas" }, ...unidades.map(u => ({ value: u, label: u }))]} />
              </div>
              {/* Equipe */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5 rounded-xl bg-white/[0.05] px-3 py-2 sm:py-2.5 ring-1 ring-white/[0.08] transition-all hover:bg-white/[0.07] hover:ring-white/[0.12]">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-lg bg-violet-400/10 ring-1 ring-violet-400/20">
                    <svg className="h-2.5 w-2.5 text-violet-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white/40">Equipe</span>
                </div>
                <CustomSelect value={filtroEquipeDraft} onChange={setFiltroEquipeDraft} options={[{ value: "todas", label: "Todas" }, ...equipes.map(e => ({ value: e, label: e }))]} />
              </div>
              {/* Microárea */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5 rounded-xl bg-white/[0.05] px-3 py-2 sm:py-2.5 ring-1 ring-white/[0.08] transition-all hover:bg-white/[0.07] hover:ring-white/[0.12]">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 ring-1 ring-emerald-400/20">
                    <svg className="h-2.5 w-2.5 text-emerald-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" /></svg>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white/40">Microárea</span>
                </div>
                <CustomSelect value={filtroMicroareaDraft} onChange={setFiltroMicroareaDraft} options={[{ value: "todas", label: "Todas" }, ...microareas.map(m => ({ value: m, label: m }))]} />
              </div>
              {/* Grupo */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5 rounded-xl bg-white/[0.05] px-3 py-2 sm:py-2.5 ring-1 ring-white/[0.08] transition-all hover:bg-white/[0.07] hover:ring-white/[0.12]">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 ring-1 ring-amber-400/20">
                    <svg className="h-2.5 w-2.5 text-amber-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" /></svg>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white/40">Grupo</span>
                </div>
                <CustomSelect value={filtroGrupoDraft} onChange={setFiltroGrupoDraft} options={[{ value: "todos", label: "Todos" }, { value: "gestante", label: "Gestantes" }, { value: "crianca", label: "Crianças ≤2a" }, { value: "tb", label: "TB" }, { value: "tabagista", label: "Tabagistas" }]} />
              </div>
            </div>

            {/* Status do Desfecho */}
            <div className="mx-3 sm:mx-5 mb-3 sm:mb-4 mt-2 sm:mt-3 rounded-xl bg-white/[0.05] px-3 sm:px-5 py-2.5 sm:py-3 ring-1 ring-white/[0.08]">
              <div className="flex items-center gap-2 mb-2 sm:mb-3">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white/40">Status do Desfecho</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 md:grid-cols-5 lg:grid-cols-9">
              {[
                { key: "todas", label: "Todas", dot: "", cls: "bg-white text-slate-900 shadow-sm ring-1 ring-white/20" },
                { key: "PENDENTE", label: "Pendente", dot: "bg-slate-400", cls: "bg-slate-100 text-slate-800 shadow-sm ring-1 ring-slate-300/60" },
                { key: "AGENDAMENTO APÓS CONTATO DIRETO", label: "Agendamento", dot: "bg-emerald-400", cls: "bg-emerald-400/20 text-emerald-300 shadow-sm ring-1 ring-emerald-400/30" },
                { key: "CONSULTA NA ODONTO REALIZADA", label: "Odonto", dot: "bg-teal-400", cls: "bg-teal-400/20 text-teal-300 shadow-sm ring-1 ring-teal-400/30" },
                { key: "CONVITE PARA DEMANDA LIVRE", label: "Demanda Livre", dot: "bg-cyan-400", cls: "bg-cyan-400/20 text-cyan-300 shadow-sm ring-1 ring-cyan-400/30" },
                { key: "MUDANÇA DE TERRITÓRIO (SITUAÇÃO ATUALIZADA NO PEP)", label: "Mud. Terr.", dot: "bg-blue-400", cls: "bg-blue-400/20 text-blue-300 shadow-sm ring-1 ring-blue-400/30" },
                { key: "ÓBITO (SITUAÇÃO ATUALIZADA NO PEP)", label: "Óbito", dot: "bg-slate-500", cls: "bg-slate-400/20 text-slate-300 shadow-sm ring-1 ring-slate-400/30" },
                { key: "NÃO LOCALIZADA", label: "Não Localizada", dot: "bg-amber-400", cls: "bg-amber-400/20 text-amber-300 shadow-sm ring-1 ring-amber-400/30" },
                { key: "RECUSA", label: "Recusa", dot: "bg-red-400", cls: "bg-red-400/20 text-red-300 shadow-sm ring-1 ring-red-400/30" },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => setFiltroStatusDraft(filtroStatusDraft === s.key ? "todas" : s.key)}
                  className={`inline-flex items-center justify-center gap-1 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
                    filtroStatusDraft === s.key ? s.cls : "bg-white/[0.05] text-white/50 hover:bg-white/[0.1] hover:text-white/70 ring-1 ring-white/[0.08]"
                  }`}
                >
                  {s.dot && <span className={`h-1 sm:h-1.5 w-1 sm:w-1.5 rounded-full ${filtroStatusDraft === s.key ? s.dot : "bg-white/20"}`} />}
                  {s.label}
                </button>
              ))}
              </div>
            </div>

            {/* Busca Ativa */}
            <div className="grid grid-cols-1 gap-2 sm:gap-3 px-3 sm:px-5 pt-1 sm:pt-3 md:grid-cols-2">
              {/* Tipo de Busca */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5 rounded-xl bg-white/[0.05] px-3 py-2 sm:py-2.5 ring-1 ring-white/[0.08] transition-all hover:bg-white/[0.07] hover:ring-white/[0.12]">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-lg bg-teal-400/10 ring-1 ring-teal-400/20">
                    <svg className="h-2.5 w-2.5 text-teal-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white/40">Tipo Busca</span>
                </div>
                <CustomSelect value={filtroTipoBuscaDraft} onChange={setFiltroTipoBuscaDraft} options={[
                  { value: "todas", label: "Todas" },
                  { value: "BUSCA ATIVA - VISITA DOMICILIAR REGISTRADA EM PRONTUÁRIO", label: "Visita Domiciliar" },
                  { value: "BUSCA ATIVA - CONTATO TELEFÔNICO (LIGAÇÃO) REGISTRADA EM PRONTUÁRIO", label: "Contato Telefônico" },
                  { value: "BUSCA ATIVA - MENSAGEM REGISTRADA EM PRONTUÁRIO", label: "Mensagem" },
                ]} />
              </div>
              {/* Tipo de Contato */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5 rounded-xl bg-white/[0.05] px-3 py-2 sm:py-2.5 ring-1 ring-white/[0.08] transition-all hover:bg-white/[0.07] hover:ring-white/[0.12]">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-lg bg-rose-400/10 ring-1 ring-rose-400/20">
                    <svg className="h-2.5 w-2.5 text-rose-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white/40">Tipo Contato</span>
                </div>
                <CustomSelect value={filtroTipoContatoDraft} onChange={setFiltroTipoContatoDraft} options={[
                  { value: "todas", label: "Todas" },
                  { value: "CONTATO DIRETO (CONVERSA)", label: "Contato Direto" },
                  { value: "CONTATO INDIRETO (MENSAGEM)", label: "Contato Indireto" },
                  { value: "NÃO HOUVE CONTATO (NÃO LOCALIZADA; LIGAÇÃO NÃO ATENDIDA...)", label: "Não Houve Contato" },
                ]} />
              </div>
            </div>

            {/* Ações compactas */}
            <div className="flex items-center justify-end gap-2 px-3 sm:px-5 pb-3 sm:pb-4 pt-2 sm:pt-3 mt-2 sm:mt-3 border-t border-white/[0.06]">
              <button
                onClick={() => {
                  setFiltroUnidadeDraft("todas"); setFiltroUnidade("todas");
                  setFiltroEquipeDraft("todas"); setFiltroEquipe("todas");
                  setFiltroMicroareaDraft("todas"); setFiltroMicroarea("todas");
                  setFiltroGrupoDraft("todos"); setFiltro("todos");
                  setFiltroStatusDraft("todas"); setFiltroStatus("todas");
                  setFiltroTipoBuscaDraft("todas"); setFiltroTipoBusca("todas");
                  setFiltroTipoContatoDraft("todas"); setFiltroTipoContato("todas");
                  setMostrarAvancada(false);
                }}
                className="rounded-lg sm:rounded-xl border border-white/10 bg-white/[0.07] px-3 sm:px-5 py-1.5 sm:py-2.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white/50 transition-all hover:bg-white/10 hover:text-white/70"
              >
                Limpar
              </button>
              <button
                onClick={() => {
                  setFiltroUnidade(filtroUnidadeDraft);
                  setFiltroEquipe(filtroEquipeDraft);
                  setFiltroMicroarea(filtroMicroareaDraft);
                  setFiltro(filtroGrupoDraft);
                  setFiltroStatus(filtroStatusDraft);
                  setFiltroTipoBusca(filtroTipoBuscaDraft);
                  setFiltroTipoContato(filtroTipoContatoDraft);
                  setMostrarAvancada(false);
                }}
                className="flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-3 sm:px-5 py-1.5 sm:py-2.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-white shadow-lg shadow-cyan-500/30 transition-all hover:from-cyan-600 hover:to-cyan-700 hover:shadow-xl active:scale-[0.97]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1380px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Loading */}
        {carregando && (
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm py-14 text-center shadow-lg shadow-slate-200/50">
            <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-gradient-to-br from-blue-500/10 to-cyan-500/10 blur-[60px] animate-pulse" />
            <div className="absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-gradient-to-tr from-cyan-500/10 to-blue-500/10 blur-[60px] animate-pulse" />
            <div className="relative mx-auto flex h-14 w-14 items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-slate-100" />
              <div className="absolute inset-0 rounded-full border-2 border-t-blue-600 border-r-cyan-500 border-b-transparent border-l-transparent animate-spin" />
              <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 animate-pulse" />
            </div>
            <p className="mt-5 text-sm font-black text-slate-700 tracking-[0.15em] uppercase flex items-center justify-center gap-2">
              <span>Carregando Registros</span>
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </p>
            <p className="mt-1.5 text-[10px] font-semibold text-slate-400 tracking-[0.25em] uppercase">Aguarde um momento</p>
          </div>
        )}

        {/* Empty */}
        {!carregando && filtradosComGrupo.length === 0 && (
          <div className="rounded-[2.5rem] border-2 border-dashed border-slate-200 bg-white/50 py-20 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-300">
              <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.375M9 18h3.375m4.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            </div>
            <p className="text-2xl font-black uppercase tracking-tight text-slate-400">
              {busca ? "Nenhum resultado encontrado" : "Nenhum acompanhamento ainda"}
            </p>
            <p className="mt-2 text-sm font-bold uppercase tracking-widest text-slate-300">
              {busca ? "Tente ajustar sua busca." : "Inicie um acompanhamento para acompanhar o progresso do paciente."}
            </p>
          </div>
        )}

        {/* Toast de feedback */}
        {toast && (
          <div className={`mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold uppercase tracking-wider shadow-lg transition-all ${
            toast.tipo === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 shadow-emerald-200/30"
              : "border-rose-200 bg-rose-50 text-rose-700 shadow-rose-200/30"
          }`}>
            {toast.tipo === "ok" ? (
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>
            ) : (
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"/></svg>
            )}
            {toast.msg}
          </div>
        )}

        {/* ═══ TABELA ═══════════════════════════════════════ */}
            <div ref={tabelaMobileRef} className="-mx-4 sm:mx-0 overflow-hidden rounded-2xl bg-white border border-slate-200/80 shadow-xl shadow-slate-200/60 ring-1 ring-black/[0.02]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-800 to-slate-700">
                      <th className="cursor-pointer select-none px-6 py-1 text-center align-middle h-[76px]" onClick={() => handleSort("data")}>
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-cyan-300 ring-1 ring-white/10">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"/></svg>
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-widest text-white/90">Data</span>
                          {sortField === "data" && (
                            <svg className={`h-2.5 w-2.5 transition-all duration-300 ${sortDir === "desc" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th className="cursor-pointer select-none px-6 py-1 text-center align-middle h-[76px]" onClick={() => handleSort("paciente")}>
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-cyan-300 ring-1 ring-white/10">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/></svg>
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-widest text-white/90">Paciente</span>
                          {sortField === "paciente" && (
                            <svg className={`h-2.5 w-2.5 transition-all duration-300 ${sortDir === "desc" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th className="cursor-pointer select-none px-6 py-1 text-center align-middle h-[76px]" onClick={() => handleSort("busca")}>
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-cyan-300 ring-1 ring-white/10">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/></svg>
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-widest text-white/90">Busca</span>
                          {sortField === "busca" && (
                            <svg className={`h-2.5 w-2.5 transition-all duration-300 ${sortDir === "desc" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th className="cursor-pointer select-none px-6 py-1 text-center align-middle h-[76px]" onClick={() => handleSort("situacao")}>
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-cyan-300 ring-1 ring-white/10">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"/></svg>
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-widest text-white/90">Situação</span>
                          {sortField === "situacao" && (
                            <svg className={`h-2.5 w-2.5 transition-all duration-300 ${sortDir === "desc" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th className="cursor-pointer select-none px-6 py-1 text-center align-middle h-[76px]" onClick={() => handleSort("entraves")}>
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-cyan-300 ring-1 ring-white/10">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-widest text-white/90">Entraves</span>
                          {sortField === "entraves" && (
                            <svg className={`h-2.5 w-2.5 transition-all duration-300 ${sortDir === "desc" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th className="cursor-pointer select-none px-6 py-1 text-center align-middle h-[76px]" onClick={() => handleSort("unidade")}>
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-cyan-300 ring-1 ring-white/10">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/></svg>
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-widest text-white/90">Unidade</span>
                          {sortField === "unidade" && (
                            <svg className={`h-2.5 w-2.5 transition-all duration-300 ${sortDir === "desc" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th className="px-6 py-1 text-center align-middle h-[76px]">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-rose-300 ring-1 ring-white/10">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-widest text-white/90">Ações</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/80">
                    {filtradosSorted.map((a) => {
                      const pac = pacMap[a.paciente_id];
                      const entraves = a.entraves_identificados?.split(";").map((e) => e.trim()).filter(Boolean) ?? [];
                      return (
                        <tr key={a.id} className="group transition-all duration-200 even:bg-slate-50/30 hover:bg-gradient-to-r hover:from-slate-50/80 hover:via-white hover:to-slate-50/80 hover:shadow-[inset_0_1px_0_0_rgba(148,163,184,0.06),0_1px_3px_0_rgba(0,0,0,0.04)]">
                          <td className="px-5 py-4 text-center align-middle">
                            <span className="inline-flex items-center gap-1.5 text-xs font-black text-slate-700">
                              <svg className="h-3.5 w-3.5 text-slate-400 group-hover:text-cyan-500 transition-colors duration-200" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"/></svg>
                              {formatarData(a.data_da_busca)}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center align-middle">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-xs font-black text-slate-800 group-hover:text-slate-900 transition-colors duration-200 leading-tight">
                                {pac?.paciente ?? "—"}
                              </span>
                              {pac?.n_cns_da_pessoa_cadastrada && (
                                <span className="font-mono text-[9px] font-bold text-slate-400/80 leading-tight truncate max-w-[130px]" title={pac.n_cns_da_pessoa_cadastrada}>
                                  CNS {pac.n_cns_da_pessoa_cadastrada}
                                </span>
                              )}
                              {pac?.data_de_nascimento && (
                                <span className="text-[9px] font-bold text-slate-400/80 leading-tight">
                                  Nasc {formatarData(pac.data_de_nascimento)}
                                </span>
                              )}
                              {pac && (
                                (() => {
                                  const idade = calcularIdade(pac.data_de_nascimento);
                                  return idade !== null ? (
                                    <span className="text-[9px] font-bold text-slate-400/80 leading-tight">
                                      {idade} {idade === 1 ? "ano" : "anos"}
                                    </span>
                                  ) : null;
                                })()
                              )}
                              {pac && renderGrupos(pac)}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center align-middle">
                            <div className="flex flex-col items-center gap-1">
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-blue-50 to-blue-100/60 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-blue-700 border border-blue-200/60 shadow-sm shadow-blue-200/10">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-400/50" />
                                {a.tipo_busca}
                              </span>
                              <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-purple-50 to-purple-100/60 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-purple-700 border border-purple-200/60 shadow-sm shadow-purple-200/10">
                                <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shadow-sm shadow-purple-400/50" />
                                {a.tipo_contato}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center align-middle">
                            {a.situacao_pos_busca ? (
                              <div className="flex flex-col items-center gap-1.5">
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-cyan-50 to-cyan-100/60 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-cyan-700 border border-cyan-200/60 shadow-sm shadow-cyan-200/10">
                                  {a.situacao_pos_busca}
                                </span>
                                {a.situacao_pos_busca === "AGENDAMENTO APÓS CONTATO DIRETO" && a.data_agendamento_apos_contato_direto && (
                                  <span className="text-[9px] font-black text-red-600 leading-tight">
                                    {formatarData(a.data_agendamento_apos_contato_direto)}
                                  </span>
                                )}
                                <BadgeResolucao situacao={a.situacao_pos_busca} resolucao={a.resolucao} />
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-center align-middle">
                            {entraves.length > 0 ? (
                              <div className="flex flex-wrap justify-center gap-1">
                                {entraves.map((e) => (
                                  <span key={e} className="inline-flex items-center rounded-lg bg-gradient-to-b from-amber-50 to-amber-100/60 px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-amber-700 border border-amber-200/60 shadow-sm shadow-amber-200/10">
                                    {e}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-center align-middle">
                            <div className="flex flex-col items-center gap-0.5">
                              {pac?.unidade ? (
                                <span className="text-[9px] font-bold text-slate-600 leading-tight break-words whitespace-normal text-balance" title={pac.unidade}>
                                  {pac.unidade}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-slate-300">—</span>
                              )}
                              {pac?.equipe && (
                                <span className="text-[8px] font-bold text-slate-400/70 uppercase tracking-widest leading-tight">
                                  Eq {pac.equipe}
                                </span>
                              )}
                              {pac?.microarea && (
                                <span className="text-[8px] font-bold text-slate-400/70 uppercase tracking-widest leading-tight">
                                  μÁrea {pac.microarea}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center align-middle">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setDetalheAcomp(a)}
                                className="inline-flex items-center justify-center rounded-lg p-2 text-slate-400 bg-white border border-slate-200/60 shadow-sm transition-all duration-200 hover:text-slate-600 hover:bg-slate-50 hover:border-slate-300/80 active:scale-95"
                                title="Detalhes"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditandoAcomp(a)}
                                className="inline-flex items-center justify-center rounded-lg p-2 text-cyan-500 bg-white border border-slate-200/60 shadow-sm transition-all duration-200 hover:text-cyan-600 hover:bg-cyan-50 hover:border-cyan-200/80 active:scale-95"
                                title="Editar"
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"/></svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExcluir(a.id)}
                                disabled={excluindo === a.id}
                                className="inline-flex items-center justify-center rounded-lg p-2 text-rose-400 bg-white border border-slate-200/60 shadow-sm transition-all duration-200 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200/80 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                                title="Excluir"
                              >
                                {excluindo === a.id ? (
                                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-rose-300 border-t-rose-600" />
                                ) : (
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
      </div>

      {/* Modal de edição */}
      {editandoAcomp && pacMap[editandoAcomp.paciente_id] && createPortal(
        <ModalAcompanhamento
          paciente={pacMap[editandoAcomp.paciente_id]}
          usuarioId={editandoAcomp.usuario_id}
          onFechar={() => setEditandoAcomp(null)}
          acompanhamentoEdit={editandoAcomp}
          onEditSalvo={() => {
            setEditandoAcomp(null);
            // Recarregar dados
            buscarTodosAcompanhamentos().then((items) => setAcompanhamentos(items)).catch(() => {});
          }}
        />,
        document.body
      )}

      {/* Modal de detalhes */}
      {detalheAcomp && createPortal(
        <DetalhesAcompanhamento
          acompanhamento={detalheAcomp}
          paciente={detalheAcomp ? pacMap[detalheAcomp.paciente_id] : undefined}
          onFechar={() => setDetalheAcomp(null)}
        />,
        document.body
      )}

      {/* ═══ TOAST SCROLL — premium ═══════════════════════════════════ */}
      {toastScroll && (
        <div className="fixed inset-x-0 bottom-6 z-[9999] flex justify-center px-4 pointer-events-none md:hidden">
          <div className="animate-toast-in flex items-center gap-3 rounded-2xl bg-slate-900/95 backdrop-blur-xl px-5 py-3 shadow-2xl shadow-slate-900/30 ring-1 ring-white/10">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20">
              <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
            </div>
            <p className="text-xs font-semibold text-white/90">
              Puxe para o lado para ver <span className="font-bold text-blue-400">mais dados</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente de Detalhes ───────────────────────────────────────────
function DetalhesAcompanhamento({
  acompanhamento,
  paciente,
  onFechar,
}: {
  acompanhamento: Acompanhamento;
  paciente?: Paciente;
  onFechar: () => void;
}) {
  function formatarData(dateStr: string): string {
    if (!dateStr) return "";
    const m = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return dateStr;
    return `${m[3]}/${m[2]}/${m[1]}`;
  }

  const entraves = acompanhamento.entraves_identificados?.split(";").map((e) => e.trim()).filter(Boolean) ?? [];

  return (
    <div className="fixed inset-0 z-[99999] flex items-start justify-center overflow-y-auto p-2 sm:p-4" onClick={onFechar}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative mt-4 sm:mt-8 mb-8 w-full max-w-lg rounded-2xl bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-900 px-5 py-4 sm:px-6 rounded-t-2xl">
          <div className="min-w-0">
            <h2 className="truncate text-base sm:text-lg font-black text-white tracking-tight">Detalhes do Registro</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300/60 truncate">
              {paciente?.paciente ?? "Paciente removido"}
            </p>
          </div>
          <button onClick={onFechar} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/70 backdrop-blur-md transition-all duration-200 hover:bg-white/20 hover:text-white ring-1 ring-white/10">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Data */}
          <div className="rounded-xl bg-slate-50 border border-slate-200/60 px-4 py-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Data da Busca</p>
            <p className="text-sm font-black text-slate-800">{formatarData(acompanhamento.data_da_busca)}</p>
          </div>

          {/* Tipo Busca + Tipo Contato */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 border border-slate-200/60 px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Tipo de Busca</p>
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700 border border-blue-200/60">
                {acompanhamento.tipo_busca}
              </span>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200/60 px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Tipo de Contato</p>
              <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-700 border border-purple-200/60">
                {acompanhamento.tipo_contato}
              </span>
            </div>
          </div>

          {/* Entrave Informado Por */}
          {acompanhamento.entrave_informado_por && (
            <div className="rounded-xl bg-slate-50 border border-slate-200/60 px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Entrave Informado Por</p>
              <p className="text-sm font-bold text-slate-700">{acompanhamento.entrave_informado_por}</p>
            </div>
          )}

          {/* Situação */}
          <div className="rounded-xl bg-slate-50 border border-slate-200/60 px-4 py-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Situação Pós Busca</p>
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 border border-emerald-200/60">
              {acompanhamento.situacao_pos_busca}
            </span>
          </div>

          {/* Entraves Identificados */}
          <div className="rounded-xl bg-slate-50 border border-slate-200/60 px-4 py-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">Entraves Identificados</p>
            {entraves.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {entraves.map((e) => (
                  <span key={e} className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-700 border border-amber-200/60">
                    {e}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm font-bold text-slate-400 italic">Nenhum entrave identificado</p>
            )}
          </div>

          {/* Observações */}
          {acompanhamento.observacoes && (
            <div className="rounded-xl bg-slate-50 border border-slate-200/60 px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Observações</p>
              <p className="text-sm font-medium text-slate-600 italic leading-relaxed">"{acompanhamento.observacoes}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
