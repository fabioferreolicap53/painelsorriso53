import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { Paciente } from "./types";
import { buscarPacientes, buscarFavoritos, removerFavorito, buscarTodosAcompanhamentos } from "./pocketbase";
import { getCoresCategoria } from "./data";
import ModalAcompanhamento from "./ModalAcompanhamento";
import ModalDetalhes from "./ModalDetalhes";

// ── Helpers ─────────────────────────────────────────────────────────────

function formatarData(dateStr: string): string {
  if (!dateStr) return "\u2014";
  const m = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "\u2014";
  const [, ano, mes, dia] = m;
  return `${dia}/${mes}/${ano}`;
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
  if (hoje.getMonth() < mes || (hoje.getMonth() === mes && hoje.getDate() < dia)) {
    idade--;
  }
  return idade >= 0 ? idade : null;
}

// ── Grupos Prioritários ────────────────────────────────────────────────

/** Coluna unificada de categorias — ícones/avatars por especificação */
function renderGruposPrioritarios(p: Paciente) {
  const idade = calcularIdade(p.data_de_nascimento);
  const isCrianca = idade !== null && idade <= 2;

  const itens: { label: string; title: string; className: string; icon: React.ReactNode }[] = [];

  if (p.gestante) {
    itens.push({
      label: "Gestante",
      title: "Gestante",
      className: getCoresCategoria("gestante"),
      icon: <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M12 11v6m-3-3h6"/></svg>,
    });
  }
  if (p.tb) {
    itens.push({
      label: "TB",
      title: "Tuberculose",
      className: getCoresCategoria("tuberculose"),
      icon: <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>,
    });
  }
  if (p.tabagista) {
    itens.push({
      label: "Tabagista",
      title: "Tabagista",
      className: getCoresCategoria("tabagista"),
      icon: <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M18 6c0-1.1-.9-2-2-2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V6z"/><path d="M10 12h4m-2-2v4"/></svg>,
    });
  }
  if (isCrianca) {
    itens.push({
      label: "Criança ≤2a",
      title: "Criança (≤2 anos)",
      className: getCoresCategoria("crianca"),
      icon: <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="7" r="4"/><path d="M12 11v7m-3 0h6"/></svg>,
    });
  }

  if (itens.length === 0) return <span className="text-slate-300 text-xs">—</span>;

  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {itens.map((item) => (
        <span
          key={item.label}
          title={item.title}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${item.className}`}
        >
          {item.icon}
          {item.label}
        </span>
      ))}
    </div>
  );
}

// ── Badge de Status/Desfecho ──────────────────────────────────────────

function StatusBadge({ item, small }: { item?: { desfecho: string; dataBusca: string; dataAgendamento: string }; small?: boolean }) {
  const formatarData = (d: string) => {
    if (!d) return "—";
    const m = d.match(/(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : d;
  };

  if (!item || !item.desfecho) {
    return (
      <div className="flex flex-col items-center gap-0.5 text-center">
        <span className={`inline-flex flex-wrap items-center justify-center rounded-full bg-slate-100 text-slate-500 font-bold uppercase tracking-wider ring-1 ring-slate-200/60 text-center ${small ? "px-2 py-0.5 text-[7px]" : "px-3 py-1 text-[10px]"}`}>
          Pendente
        </span>
        <span className={`text-slate-400 font-medium ${small ? "text-[6px]" : "text-[8px]"}`}>Sem busca</span>
      </div>
    );
  }

  const cores: Record<string, { bg: string; text: string; ring: string }> = {
    "AGENDAMENTO APÓS CONTATO DIRETO": { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200/60" },
    "CONVITE PARA DEMANDA LIVRE": { bg: "bg-cyan-50", text: "text-cyan-700", ring: "ring-cyan-200/60" },
    "MUDANÇA DE TERRITÓRIO (SITUAÇÃO ATUALIZADA NO PEP)": { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-200/60" },
    "ÓBITO (SITUAÇÃO ATUALIZADA NO PEP)": { bg: "bg-slate-100", text: "text-slate-600", ring: "ring-slate-200/60" },
    "NÃO LOCALIZADA": { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200/60" },
    "RECUSA": { bg: "bg-red-50", text: "text-red-700", ring: "ring-red-200/60" },
  };
  const c = cores[item.desfecho] || { bg: "bg-slate-50", text: "text-slate-600", ring: "ring-slate-200/60" };

  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      <span className={`text-slate-500 font-semibold ${small ? "text-[7px]" : "text-[9px]"}`}>
        {formatarData(item.dataBusca)}
      </span>
      <span className={`inline-flex flex-wrap items-center justify-center rounded-full font-bold uppercase tracking-wider text-center ${c.bg} ${c.text} ring-1 ${c.ring} ${small ? "px-2 py-0.5 text-[7px]" : "px-3 py-1 text-[10px]"}`} title={item.desfecho}>
        {item.desfecho}
      </span>
      {item.dataAgendamento && (
        <span className={`text-emerald-600 font-semibold ${small ? "text-[7px]" : "text-[9px]"}`}>
          Agend: {formatarData(item.dataAgendamento)}
        </span>
      )}
    </div>
  );
}

// ── Componente ─────────────────────────────────────────────────────────

function AcompCountBadge({
  count,
  pacienteId,
  onNavigate,
  className,
}: {
  count: number;
  pacienteId: string;
  onNavigate: (id: string) => void;
  className: string;
}) {
  return (
    <span
      className={`${className} cursor-pointer select-none active:scale-90 transition-transform`}
      onClick={(e) => { e.stopPropagation(); onNavigate(pacienteId); }}
      title="Clique para filtrar acompanhamentos"
    >
      {count}
    </span>
  );
}

export default function PaginaFavoritos({ usuarioId, onNavigateAcompFiltered }: { usuarioId: string; onNavigateAcompFiltered: (pacienteId: string) => void }) {
  const [favoritos, setFavoritos] = useState<Paciente[]>([]);
  const [favMap, setFavMap] = useState<Map<string, string>>(new Map());
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<string>("todos");
  const [filtroUnidade, setFiltroUnidade] = useState<string>("todas");
  const [filtroEquipe, setFiltroEquipe] = useState<string>("todas");
  const [filtroMicroarea, setFiltroMicroarea] = useState<string>("todas");
  const [filtroStatus, setFiltroStatus] = useState<string>("todas");
  const [filtroUnidadeDraft, setFiltroUnidadeDraft] = useState<string>("todas");
  const [filtroEquipeDraft, setFiltroEquipeDraft] = useState<string>("todas");
  const [filtroMicroareaDraft, setFiltroMicroareaDraft] = useState<string>("todas");
  const [filtroStatusDraft, setFiltroStatusDraft] = useState<string>("todas");
  const [filtroGrupoDraft, setFiltroGrupoDraft] = useState<string>("todos");

  const filtrosAtivos = [filtroUnidade, filtroEquipe, filtroMicroarea, filtroStatus]
    .filter((v) => v !== "todas").length
    + (filtro !== "todos" ? 1 : 0);

  const [mostrarBusca, setMostrarBusca] = useState(false);
  const [mostrarAvancada, setMostrarAvancada] = useState(false);
  const unidades = [...new Set(favoritos.map(p => p.unidade).filter(Boolean))].sort();
  const equipes = [...new Set(favoritos.map(p => p.equipe).filter(Boolean))].sort();
  const microareas = [...new Set(favoritos.map(p => p.microarea).filter(Boolean))].sort();
  const tabelaMobileRef = useRef<HTMLDivElement>(null);
  const [toastScroll, setToastScroll] = useState(false);
  const toastMostrado = useRef(false);
  const [pacienteModal, setPacienteModal] = useState<Paciente | null>(null);
  const [pacienteAcompModal, setPacienteAcompModal] = useState<Paciente | null>(null);
  const [acompCounts, setAcompCounts] = useState<Record<string, number>>({});
  const [lastDesfechoMap, setLastDesfechoMap] = useState<Record<string, { desfecho: string; dataBusca: string; dataAgendamento: string }>>({});
  const [pagina, setPagina] = useState(1);
  const [sortField, setSortField] = useState<string>("paciente");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  useEffect(() => { setPagina(1); }, [favoritos, busca, filtroUnidade, filtroEquipe, filtroMicroarea, filtroStatus, sortField]);

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      try {
        setCarregando(true);
        const favs = await buscarFavoritos(usuarioId);
        if (cancelado) return;
        // Mapeia paciente_id → favorito_id (para remoção)
        const mapa = new Map<string, string>();
        favs.forEach((f) => mapa.set(f.paciente_id, f.id));
        setFavMap(mapa);
        if (favs.length === 0) {
          setFavoritos([]);
          return;
        }
        const ids = favs.map((f) => f.paciente_id);
        const filtro = ids.map((id) => `id="${id}"`).join(" || ");
        const { items } = await buscarPacientes({ filter: filtro, perPage: 500 });
        if (!cancelado) setFavoritos(items);
      } catch {
        if (!cancelado) setFavoritos([]);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }
    if (usuarioId) carregar();
    return () => { cancelado = true; };
  }, [usuarioId]);

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

  // Carregar contagem de acompanhamentos + último desfecho por paciente
  useEffect(() => {
    let cancel = false;
    buscarTodosAcompanhamentos()
      .then((items) => {
        if (cancel) return;
        const countMap: Record<string, number> = {};
        const desfechoMap: Record<string, { desfecho: string; dataBusca: string; dataAgendamento: string }> = {};
        items.forEach((a) => {
          countMap[a.paciente_id] = (countMap[a.paciente_id] || 0) + 1;
          if (!desfechoMap[a.paciente_id] && a.situacao_pos_busca) {
            desfechoMap[a.paciente_id] = {
              desfecho: a.situacao_pos_busca,
              dataBusca: a.data_da_busca || "",
              dataAgendamento: a.situacao_pos_busca === "AGENDAMENTO APÓS CONTATO DIRETO" ? (a.data_agendamento_apos_contato_direto || "") : "",
            };
          }
        });
        setAcompCounts(countMap);
        setLastDesfechoMap(desfechoMap);
      })
      .catch(() => {});
    return () => { cancel = true; };
  }, []);

  async function unfavoritar(pacienteId: string) {
    const favId = favMap.get(pacienteId);
    if (!favId) return;
    // Optimistic remove
    setFavoritos((prev) => prev.filter((p) => p.id !== pacienteId));
    setFavMap((prev) => { const n = new Map(prev); n.delete(pacienteId); return n; });
    try {
      await removerFavorito(favId);
    } catch (e) {
      console.error("Erro ao remover favorito:", e);
      // Reverte — recarrega tudo
      if (usuarioId) {
        try {
          const favs = await buscarFavoritos(usuarioId);
          const mapa = new Map<string, string>();
          favs.forEach((f) => mapa.set(f.paciente_id, f.id));
          setFavMap(mapa);
          const ids = favs.map((f) => f.paciente_id);
          if (ids.length > 0) {
            const filtro = ids.map((id) => `id="${id}"`).join(" || ");
            const { items } = await buscarPacientes({ filter: filtro, perPage: 500 });
            setFavoritos(items);
          } else {
            setFavoritos([]);
          }
        } catch { /* fallback */ }
      }
    }
  }

  // Filtragem
  const filtrados = favoritos.filter((p) => {
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

    const matchUnidade = filtroUnidade === "todas" || p.unidade === filtroUnidade;
    const matchEquipe = filtroEquipe === "todas" || p.equipe === filtroEquipe;
    const matchMicroarea = filtroMicroarea === "todas" || p.microarea === filtroMicroarea;
    const matchStatus = filtroStatus === "todas"
      || (filtroStatus === "PENDENTE" && !lastDesfechoMap[p.id]?.desfecho)
      || lastDesfechoMap[p.id]?.desfecho === filtroStatus;

    return matchBusca && matchFiltro && matchUnidade && matchEquipe && matchMicroarea && matchStatus;
  });

  const filtradosSorted = [...filtrados].sort((a, b) => {
    let va = "", vb = "";
    switch (sortField) {
      case "paciente":    va = a.paciente || "";           vb = b.paciente || "";           break;
      case "unidade":     va = a.unidade || "";            vb = b.unidade || "";            break;
      case "status":      va = lastDesfechoMap[a.id]?.desfecho || ""; vb = lastDesfechoMap[b.id]?.desfecho || ""; break;
      default:            va = a.paciente || "";           vb = b.paciente || "";           break;
    }
    const cmp = va.localeCompare(vb, "pt-BR", { sensitivity: "base" });
    return sortDir === "asc" ? cmp : -cmp;
  });

  const porPagina = 10;
  const totalPaginas = Math.max(1, Math.ceil(filtradosSorted.length / porPagina));
  const paginaAtual = filtradosSorted.slice((pagina - 1) * porPagina, pagina * porPagina);

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
              FAVORITOS <span className="text-cyan-300 font-bold">Salvos</span>
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
            <div className="flex items-baseline gap-2">
              <svg className="h-4 w-4 text-amber-300/70" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
              </svg>
              <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">Total</span>
              <span className="text-2xl font-black text-white tabular-nums leading-none">
                {filtrados.length.toLocaleString("pt-BR")}
              </span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <button
              onClick={() => { setMostrarBusca(!mostrarBusca); setMostrarAvancada(false); }}
              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200 hover:bg-white/10 hover:text-white/70 ${mostrarBusca ? "bg-white/10 text-white/70" : "text-white/40"}`}
              title="Busca rápida"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
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
                }
              }}
              className="relative ml-auto flex items-center gap-2 rounded-xl bg-white/[0.07] px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white/60 ring-1 ring-white/10 transition-all duration-200 hover:bg-white/[0.12] hover:text-white/80 hover:ring-white/20"
              title="Filtros Avançados"
            >
              <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" /></svg>
              Filtros Avançados
              {filtrosAtivos > 0 && (
                <span className="rounded-full bg-cyan-400/20 px-2 py-0.5 text-[9px] font-bold text-cyan-300 ring-1 ring-cyan-400/30">
                  {filtrosAtivos} ativo{filtrosAtivos !== 1 ? "s" : ""}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {mostrarBusca && (
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-950 px-5 sm:px-6 pb-4">
          <div className="mx-auto flex max-w-[1380px] items-center gap-3">
            <div className="relative flex-1">
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar por nome, CNS, prontuário..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                autoFocus
                className="w-full rounded-lg bg-white/[0.07] border border-white/10 py-2 pl-10 pr-4 text-sm font-medium text-white placeholder-white/40 outline-none transition-all duration-200 focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/20"
              />
            </div>
            <button onClick={() => { setMostrarBusca(false); setBusca(""); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 transition-all hover:bg-white/10 hover:text-white/70">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}

      {mostrarAvancada && (
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-950 px-5 sm:px-6 pb-4">
          <div className="mx-auto max-w-[1380px] overflow-hidden rounded-2xl bg-gradient-to-br from-white/[0.07] to-white/[0.03] ring-1 ring-white/[0.12] shadow-lg shadow-black/20 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.08] ring-1 ring-white/[0.1]">
                  <svg className="h-3.5 w-3.5 text-cyan-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" /></svg>
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-white/60">Filtros Avançados</span>
              </div>
              <button onClick={() => setMostrarAvancada(false)} className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition-all hover:bg-white/10 hover:text-white/70">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex items-center gap-2 px-4 pt-3">
              <div className="h-px flex-1 bg-white/5" />
              <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/25">Filtros</span>
              <div className="h-px flex-1 bg-white/5" />
            </div>

            {/* Grid de selects compacto */}
            <div className="grid grid-cols-1 gap-2 px-4 pt-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Unidade */}
              <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.04] px-3 py-2 ring-1 ring-white/[0.06] transition-all hover:bg-white/[0.07] hover:ring-white/[0.12]">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-sky-400/10 ring-1 ring-sky-400/20">
                  <svg className="h-2.5 w-2.5 text-sky-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>
                </div>
                <span className="text-[8px] font-bold uppercase tracking-wider text-white/40 shrink-0">Unidade</span>
                <select value={filtroUnidadeDraft} onChange={(e) => setFiltroUnidadeDraft(e.target.value)} className="flex-1 min-w-0 bg-transparent text-[11px] font-semibold text-white/80 outline-none cursor-pointer appearance-none">
                  <option value="todas">Todas</option>
                  {unidades.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              {/* Equipe */}
              <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.04] px-3 py-2 ring-1 ring-white/[0.06] transition-all hover:bg-white/[0.07] hover:ring-white/[0.12]">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-violet-400/10 ring-1 ring-violet-400/20">
                  <svg className="h-2.5 w-2.5 text-violet-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg>
                </div>
                <span className="text-[8px] font-bold uppercase tracking-wider text-white/40 shrink-0">Equipe</span>
                <select value={filtroEquipeDraft} onChange={(e) => setFiltroEquipeDraft(e.target.value)} className="flex-1 min-w-0 bg-transparent text-[11px] font-semibold text-white/80 outline-none cursor-pointer appearance-none">
                  <option value="todas">Todas</option>
                  {equipes.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              {/* Microárea */}
              <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.04] px-3 py-2 ring-1 ring-white/[0.06] transition-all hover:bg-white/[0.07] hover:ring-white/[0.12]">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-400/10 ring-1 ring-emerald-400/20">
                  <svg className="h-2.5 w-2.5 text-emerald-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" /></svg>
                </div>
                <span className="text-[8px] font-bold uppercase tracking-wider text-white/40 shrink-0">Microárea</span>
                <select value={filtroMicroareaDraft} onChange={(e) => setFiltroMicroareaDraft(e.target.value)} className="flex-1 min-w-0 bg-transparent text-[11px] font-semibold text-white/80 outline-none cursor-pointer appearance-none">
                  <option value="todas">Todas</option>
                  {microareas.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              {/* Grupo */}
              <div className="flex items-center gap-2.5 rounded-lg bg-white/[0.04] px-3 py-2 ring-1 ring-white/[0.06] transition-all hover:bg-white/[0.07] hover:ring-white/[0.12]">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-amber-400/10 ring-1 ring-amber-400/20">
                  <svg className="h-2.5 w-2.5 text-amber-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" /></svg>
                </div>
                <span className="text-[8px] font-bold uppercase tracking-wider text-white/40 shrink-0">Grupo</span>
                <select value={filtroGrupoDraft} onChange={(e) => setFiltroGrupoDraft(e.target.value)} className="flex-1 min-w-0 bg-transparent text-[11px] font-semibold text-white/80 outline-none cursor-pointer appearance-none">
                  <option value="todos">Todos</option>
                  <option value="gestante">Gestantes</option>
                  <option value="crianca">Crianças ≤2a</option>
                  <option value="tb">TB</option>
                  <option value="tabagista">Tabagistas</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 px-4 pt-1">
              <div className="h-px flex-1 bg-white/5" />
              <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/25">Status</span>
              <div className="h-px flex-1 bg-white/5" />
            </div>

            {/* Status compacto */}
            <div className="mx-4 mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 ring-1 ring-white/[0.06]">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-cyan-400/10 ring-1 ring-cyan-400/20">
                <svg className="h-2.5 w-2.5 text-cyan-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg>
              </div>
              <span className="text-[8px] font-bold uppercase tracking-wider text-white/40 mr-1">Status</span>
              {[
                { key: "todas", label: "Todas", dot: "", cls: "bg-white text-slate-900 shadow-sm ring-1 ring-white/20" },
                { key: "PENDENTE", label: "Pendente", dot: "bg-slate-400", cls: "bg-slate-100 text-slate-800 shadow-sm ring-1 ring-slate-300/60" },
                { key: "AGENDAMENTO APÓS CONTATO DIRETO", label: "Agendamento", dot: "bg-emerald-400", cls: "bg-emerald-400/20 text-emerald-300 shadow-sm ring-1 ring-emerald-400/30" },
                { key: "CONVITE PARA DEMANDA LIVRE", label: "Demanda Livre", dot: "bg-cyan-400", cls: "bg-cyan-400/20 text-cyan-300 shadow-sm ring-1 ring-cyan-400/30" },
                { key: "MUDANÇA DE TERRITÓRIO (SITUAÇÃO ATUALIZADA NO PEP)", label: "Mudança Terr.", dot: "bg-blue-400", cls: "bg-blue-400/20 text-blue-300 shadow-sm ring-1 ring-blue-400/30" },
                { key: "ÓBITO (SITUAÇÃO ATUALIZADA NO PEP)", label: "Óbito", dot: "bg-slate-500", cls: "bg-slate-400/20 text-slate-300 shadow-sm ring-1 ring-slate-400/30" },
                { key: "NÃO LOCALIZADA", label: "Não Localizada", dot: "bg-amber-400", cls: "bg-amber-400/20 text-amber-300 shadow-sm ring-1 ring-amber-400/30" },
                { key: "RECUSA", label: "Recusa", dot: "bg-red-400", cls: "bg-red-400/20 text-red-300 shadow-sm ring-1 ring-red-400/30" },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => setFiltroStatusDraft(filtroStatusDraft === s.key ? "todas" : s.key)}
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition-all duration-200 ${
                    filtroStatusDraft === s.key ? s.cls : "bg-white/[0.05] text-white/50 hover:bg-white/[0.1] hover:text-white/70 ring-1 ring-white/[0.08]"
                  }`}
                >
                  {s.dot && <span className={`h-1 w-1 rounded-full ${filtroStatusDraft === s.key ? s.dot : "bg-white/20"}`} />}
                  {s.label}
                </button>
              ))}
            </div>

            <div className="mx-4 flex items-center gap-2">
              <div className="h-px flex-1 bg-white/5" />
            </div>

            {/* Ações compactas */}
            <div className="flex items-center justify-end gap-2 px-4 pb-3">
              <button
                onClick={() => {
                  setFiltroUnidadeDraft("todas"); setFiltroUnidade("todas");
                  setFiltroEquipeDraft("todas"); setFiltroEquipe("todas");
                  setFiltroMicroareaDraft("todas"); setFiltroMicroarea("todas");
                  setFiltroGrupoDraft("todos"); setFiltro("todos");
                  setFiltroStatusDraft("todas"); setFiltroStatus("todas");
                  setMostrarAvancada(false);
                }}
                className="rounded-lg border border-white/10 bg-white/[0.07] px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white/50 transition-all hover:bg-white/10 hover:text-white/70"
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
                  setMostrarAvancada(false);
                }}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-5 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-cyan-500/30 transition-all hover:from-cyan-600 hover:to-cyan-700 hover:shadow-xl active:scale-[0.97]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONTEÚDO ─────────────────────────────────────────────── */}
      <div className="mx-auto max-w-[1380px] px-4 py-8 sm:px-6 lg:px-8">

        {carregando ? (
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm py-20 text-center shadow-lg shadow-slate-200/50">
            <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-gradient-to-br from-blue-500/10 to-cyan-500/10 blur-3xl animate-pulse" />
            <div className="absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-gradient-to-tr from-cyan-500/10 to-blue-500/10 blur-3xl animate-pulse" />
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 rounded-full border-[3px] border-slate-100" />
              <div className="absolute inset-0 rounded-full border-[3px] border-t-blue-600 border-r-cyan-500 border-b-transparent border-l-transparent animate-spin" />
              <div className="h-3 w-3 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 animate-pulse" />
            </div>
            <p className="mt-6 text-[15px] font-bold text-slate-700 tracking-tight uppercase">
              CARREGANDO PACIENTES
              <span className="inline-flex gap-1 ml-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" style={{ animationDelay: '300ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" style={{ animationDelay: '600ms' }} />
              </span>
            </p>
            <p className="mt-2 text-xs font-medium text-slate-400 tracking-widest uppercase">AGUARDE UM MOMENTO</p>
          </div>
        ) : (
          <>
            {/* ═══ TABELA DESKTOP (xl+) ═══════════════════════════════ */}
            <div className="hidden overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-lg shadow-slate-200/80 xl:block" style={{ overflow: "visible" }}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-800 to-slate-700">
                      <th className="px-6 py-1 text-center align-middle h-[76px]">
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-cyan-300 ring-1 ring-white/10">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-widest text-white/90">Ação</span>
                        </div>
                      </th>
                      <th className="cursor-pointer select-none px-6 py-1 text-center align-middle h-[76px]" onClick={() => handleSort("status")}>
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-cyan-300 ring-1 ring-white/10">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"/></svg>
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-widest text-white/90">Último Status</span>
                          {sortField === "status" && (
                            <svg className={`h-2.5 w-2.5 transition-all duration-300 ${sortDir === "desc" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th className="cursor-pointer select-none px-6 py-1 text-center align-middle h-[76px]" onClick={() => handleSort("paciente")}>
                        <div className="flex flex-col items-center gap-1.5">
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
                      <th className="cursor-pointer select-none px-6 py-1 text-center align-middle h-[76px]" onClick={() => handleSort("unidade")}>
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-cyan-300 ring-1 ring-white/10">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"/></svg>
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-widest text-white/90">Unidade</span>
                          {sortField === "unidade" && (
                            <svg className={`h-2.5 w-2.5 transition-all duration-300 ${sortDir === "desc" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                            </svg>
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginaAtual.map((p) => {
                      const idadeNum = calcularIdade(p.data_de_nascimento);
                      return (
                      <tr key={p.id} className="group transition-colors hover:bg-slate-50/50">
                        <td className="px-3 py-3 text-center align-top">
                          <div className="flex flex-col items-center gap-2">
                            <div className="flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-slate-50 to-white px-3 py-1.5 ring-1 ring-slate-200/70 shadow-sm">
                              <button
                                onClick={() => unfavoritar(p.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg ring-1 transition-all duration-200 hover:scale-110 hover:shadow-md bg-amber-50 ring-amber-200/50 hover:bg-amber-100"
                                title="Remover dos favoritos"
                              >
                                <svg className="h-3.5 w-3.5 text-amber-400 group-hover/btn:rotate-[-5deg]" fill="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" /></svg>
                              </button>
                              {acompCounts[p.id] > 0 && (
                                <AcompCountBadge count={acompCounts[p.id]} pacienteId={p.id} onNavigate={onNavigateAcompFiltered} className="flex h-5 min-w-[20px] cursor-pointer select-none items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600 px-1 text-[9px] font-black text-white shadow-md shadow-red-500/25 ring-1 ring-red-400/30 transition-transform hover:scale-110 active:scale-90" />
                              )}
                            </div>
                            <div className="w-10 bg-gradient-to-r from-transparent via-slate-200/80 to-transparent" style={{ height: '1px' }} />
                            <div className="flex w-full flex-col gap-1.5">
                              <button onClick={() => setPacienteAcompModal(p)} className="group/btn flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm shadow-cyan-200/40 transition-all duration-200 hover:from-cyan-400 hover:to-cyan-500 hover:shadow-md hover:shadow-cyan-300/40 hover:scale-[1.02] active:scale-[0.98]">
                                <svg className="h-3.5 w-3.5 flex-shrink-0 group-hover/btn:rotate-[-5deg]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"/></svg>
                                <span className="relative z-10">Acomp.</span>
                              </button>
                              <button onClick={() => setPacienteModal(p)} className="group/btn flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 shadow-sm transition-all duration-200 hover:border-cyan-200 hover:bg-cyan-50/50 hover:text-cyan-700 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]">
                                <svg className="h-3.5 w-3.5 flex-shrink-0 group-hover/btn:rotate-[-5deg]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/></svg>
                                <span className="relative z-10">Detalhes</span>
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center align-top break-words">
                          <StatusBadge item={lastDesfechoMap[p.id]} />
                        </td>
                        <td className="px-5 py-4 text-center align-top">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-xs font-black text-slate-800 group-hover:text-slate-900 transition-colors duration-200 leading-tight">{p.paciente || "\u2014"}</span>
                            <span className="font-mono text-[9px] font-bold text-slate-400/80 leading-tight truncate max-w-[130px]" title={p.n_cns_da_pessoa_cadastrada}>CNS {p.n_cns_da_pessoa_cadastrada || "\u2014"}</span>
                            <span className="text-[9px] font-bold text-slate-400/80 leading-tight">Nasc {formatarData(p.data_de_nascimento)}</span>
                            {idadeNum !== null && (
                              <span className="text-[9px] font-bold text-slate-400/80 leading-tight">{idadeNum} {idadeNum === 1 ? "ano" : "anos"}</span>
                            )}
                            <div className="flex flex-wrap justify-center gap-1">
                              {renderGruposPrioritarios(p)}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center align-top">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-xs font-black text-slate-800 group-hover:text-slate-900 transition-colors duration-200 leading-tight">{p.unidade || "\u2014"}</span>
                            <span className="text-[9px] font-bold text-slate-400/80 leading-tight">{p.equipe || "\u2014"}</span>
                            <span className="text-[9px] font-bold text-slate-400/80 leading-tight">Micro: {p.microarea || "\u2014"}</span>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filtrados.length === 0 && (
                <div className="px-6 py-16 text-center text-slate-400">
                  Nenhum paciente encontrado.
                </div>
              )}
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-3">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  {filtrados.length} registro{filtrados.length !== 1 ? "s" : ""} encontrado{filtrados.length !== 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina <= 1} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Anterior</button>
                  <span className="text-[11px] font-bold text-slate-500">Pág. {pagina} de {totalPaginas}</span>
                  <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina >= totalPaginas} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Próximo</button>
                </div>
              </div>
            </div>

            {/* ═══ TABELA TABLET (md-xl) ═══════════════════════════════ */}
            <div className="hidden overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-lg shadow-slate-200/80 md:block xl:hidden" style={{ overflow: "visible" }}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-800 to-slate-700">
                      <th className="px-6 py-1 text-center align-middle h-[76px]">
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-cyan-300 ring-1 ring-white/10">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-widest text-white/90">Ação</span>
                        </div>
                      </th>
                      <th className="cursor-pointer select-none px-6 py-1 text-center align-middle h-[76px]" onClick={() => handleSort("status")}>
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-cyan-300 ring-1 ring-white/10">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"/></svg>
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-widest text-white/90">Último Status</span>
                          {sortField === "status" && (
                            <svg className={`h-2.5 w-2.5 transition-all duration-300 ${sortDir === "desc" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th className="cursor-pointer select-none px-6 py-1 text-center align-middle h-[76px]" onClick={() => handleSort("paciente")}>
                        <div className="flex flex-col items-center gap-1.5">
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
                      <th className="cursor-pointer select-none px-6 py-5 text-center" onClick={() => handleSort("unidade")}>
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-cyan-300 ring-1 ring-white/10">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"/></svg>
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-widest text-white/90">Unidade</span>
                          {sortField === "unidade" && (
                            <svg className={`h-2.5 w-2.5 transition-all duration-300 ${sortDir === "desc" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                            </svg>
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginaAtual.map((p) => {
                      const idadeNum = calcularIdade(p.data_de_nascimento);
                      return (
                      <tr key={p.id} className="group transition-colors hover:bg-slate-50/50">
                        <td className="px-3 py-3 text-center align-top">
                          <div className="flex flex-col items-center gap-2">
                            <div className="flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-slate-50 to-white px-3 py-1.5 ring-1 ring-slate-200/70 shadow-sm">
                              <button
                                onClick={() => unfavoritar(p.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg ring-1 transition-all duration-200 hover:scale-110 hover:shadow-md bg-amber-50 ring-amber-200/50 hover:bg-amber-100"
                                title="Remover dos favoritos"
                              >
                                <svg className="h-3.5 w-3.5 text-amber-400 group-hover/btn:rotate-[-5deg]" fill="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" /></svg>
                              </button>
                              {acompCounts[p.id] > 0 && (
                                <AcompCountBadge count={acompCounts[p.id]} pacienteId={p.id} onNavigate={onNavigateAcompFiltered} className="flex h-5 min-w-[20px] cursor-pointer select-none items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600 px-1 text-[9px] font-black text-white shadow-md shadow-red-500/25 ring-1 ring-red-400/30 transition-transform hover:scale-110 active:scale-90" />
                              )}
                            </div>
                            <div className="w-10 bg-gradient-to-r from-transparent via-slate-200/80 to-transparent" style={{ height: '1px' }} />
                            <div className="flex w-full flex-col gap-1.5">
                              <button onClick={() => setPacienteAcompModal(p)} className="group/btn flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm shadow-cyan-200/40 transition-all duration-200 hover:from-cyan-400 hover:to-cyan-500 hover:shadow-md hover:shadow-cyan-300/40 hover:scale-[1.02] active:scale-[0.98]">
                                <svg className="h-3.5 w-3.5 flex-shrink-0 group-hover/btn:rotate-[-5deg]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"/></svg>
                                <span className="relative z-10">Acomp.</span>
                              </button>
                              <button onClick={() => setPacienteModal(p)} className="group/btn flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 shadow-sm transition-all duration-200 hover:border-cyan-200 hover:bg-cyan-50/50 hover:text-cyan-700 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]">
                                <svg className="h-3.5 w-3.5 flex-shrink-0 group-hover/btn:rotate-[-5deg]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/></svg>
                                <span className="relative z-10">Detalhes</span>
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center align-top break-words">
                          <StatusBadge item={lastDesfechoMap[p.id]} />
                        </td>
                        <td className="px-5 py-4 text-center align-top">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-xs font-black text-slate-800 group-hover:text-slate-900 transition-colors duration-200 leading-tight">{p.paciente || "\u2014"}</span>
                            <span className="font-mono text-[9px] font-bold text-slate-400/80 leading-tight truncate max-w-[130px]" title={p.n_cns_da_pessoa_cadastrada}>CNS {p.n_cns_da_pessoa_cadastrada || "\u2014"}</span>
                            <span className="text-[9px] font-bold text-slate-400/80 leading-tight">Nasc {formatarData(p.data_de_nascimento)}</span>
                            {idadeNum !== null && (
                              <span className="text-[9px] font-bold text-slate-400/80 leading-tight">{idadeNum} {idadeNum === 1 ? "ano" : "anos"}</span>
                            )}
                            <div className="flex flex-wrap justify-center gap-1">
                              {renderGruposPrioritarios(p)}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center align-top">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-xs font-black text-slate-800 group-hover:text-slate-900 transition-colors duration-200 leading-tight">{p.unidade || "\u2014"}</span>
                            <span className="text-[9px] font-bold text-slate-400/80 leading-tight">{p.equipe || "\u2014"}</span>
                            <span className="text-[9px] font-bold text-slate-400/80 leading-tight">Micro: {p.microarea || "\u2014"}</span>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filtrados.length === 0 && (
                <div className="px-6 py-16 text-center text-slate-400">
                  Nenhum paciente encontrado.
                </div>
              )}
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-3">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  {filtrados.length} registro{filtrados.length !== 1 ? "s" : ""} encontrado{filtrados.length !== 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina <= 1} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Anterior</button>
                  <span className="text-[11px] font-bold text-slate-500">Pág. {pagina} de {totalPaginas}</span>
                  <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina >= totalPaginas} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Próximo</button>
                </div>
              </div>
            </div>

            {/* ═══ TABELA MOBILE (< md) — 4 colunas com scroll ═══ */}
            <div ref={tabelaMobileRef} className="overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-lg shadow-slate-200/80 md:hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px]" style={{ tableLayout: 'fixed' }}>
                  <thead>
                    <tr className="bg-gradient-to-r from-slate-800 to-slate-700">
                      <th className="px-2 py-2.5 text-center" style={{ width: '15%' }}>
                        <div className="flex flex-col items-center gap-0.5">
                          <svg className="h-3 w-3 text-cyan-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"/></svg>
                          <span className="text-[8px] font-black uppercase tracking-wider text-white/90">Ação</span>
                        </div>
                      </th>
                      <th className="cursor-pointer select-none px-2 py-2.5 text-center" style={{ width: '18%' }} onClick={() => handleSort("status")}>
                        <div className="flex flex-col items-center gap-0.5">
                          <svg className="h-3 w-3 text-cyan-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"/></svg>
                          <span className="text-[8px] font-black uppercase tracking-wider text-white/90">Último Status</span>
                          {sortField === "status" && (
                            <svg className={`h-2 w-2 transition-all duration-300 ${sortDir === "desc" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th className="cursor-pointer select-none px-2 py-2.5 text-center" style={{ width: '42%' }} onClick={() => handleSort("paciente")}>
                        <div className="flex flex-col items-center gap-0.5">
                          <svg className="h-3 w-3 text-cyan-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/></svg>
                          <span className="text-[8px] font-black uppercase tracking-wider text-white/90">Paciente</span>
                          {sortField === "paciente" && (
                            <svg className={`h-2 w-2 transition-all duration-300 ${sortDir === "desc" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                            </svg>
                          )}
                        </div>
                      </th>
                      <th className="cursor-pointer select-none px-2 py-2.5 text-center" style={{ width: '25%' }} onClick={() => handleSort("unidade")}>
                        <div className="flex flex-col items-center gap-0.5">
                          <svg className="h-3 w-3 text-cyan-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"/></svg>
                          <span className="text-[8px] font-black uppercase tracking-wider text-white/90">Unidade</span>
                          {sortField === "unidade" && (
                            <svg className={`h-2 w-2 transition-all duration-300 ${sortDir === "desc" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                            </svg>
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginaAtual.map((p) => {
                      const idadeNum = calcularIdade(p.data_de_nascimento);
                      return (
                      <tr key={p.id} className="transition-colors hover:bg-slate-50/50">
                        {/* Col 1: Ação */}
                        <td className="px-2 py-2 text-center align-middle" style={{ width: '15%' }}>
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1 rounded-lg bg-gradient-to-br from-slate-50 to-white px-2 py-1 ring-1 ring-slate-200/70 shadow-sm">
                              <button
                                onClick={() => unfavoritar(p.id)}
                                className="flex h-5 w-5 items-center justify-center rounded-md ring-1 transition-all duration-200 hover:scale-110 hover:shadow-md bg-amber-50 ring-amber-200/50 hover:bg-amber-100"
                                title="Remover dos favoritos"
                              >
                                <svg className="h-3 w-3 text-amber-400 group-hover/btn:rotate-[-5deg]" fill="currentColor" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" /></svg>
                              </button>
                              {acompCounts[p.id] > 0 && (
                                <AcompCountBadge count={acompCounts[p.id]} pacienteId={p.id} onNavigate={onNavigateAcompFiltered} className="flex h-4 min-w-[16px] cursor-pointer select-none items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600 px-1 text-[8px] font-black text-white shadow-md shadow-red-500/25 ring-1 ring-red-400/30 transition-transform hover:scale-110 active:scale-90" />
                              )}
                            </div>
                            <div className="w-8 bg-gradient-to-r from-transparent via-slate-200/80 to-transparent" style={{ height: '1px' }} />
                            <div className="flex w-full flex-col gap-1">
                              <button onClick={() => setPacienteAcompModal(p)} className="group/btn flex w-full items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 px-2 py-1.5 text-[8px] font-bold uppercase tracking-wider text-white shadow-sm shadow-cyan-200/50 transition-all duration-200 hover:from-cyan-400 hover:to-cyan-500 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]">
                                <svg className="h-3 w-3 flex-shrink-0 group-hover/btn:rotate-[-5deg]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"/></svg>
                                <span className="relative z-10">Acomp.</span>
                              </button>
                              <button onClick={() => setPacienteModal(p)} className="group/btn flex w-full items-center justify-center gap-1 rounded-lg border border-slate-200/80 bg-white px-2 py-1.5 text-[8px] font-bold uppercase tracking-wider text-slate-500 shadow-sm transition-all duration-200 hover:border-cyan-200 hover:bg-cyan-50/50 hover:text-cyan-700 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]">
                                <svg className="h-3 w-3 flex-shrink-0 group-hover/btn:rotate-[-5deg]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/></svg>
                                <span className="relative z-10">Det.</span>
                              </button>
                            </div>
                          </div>
                        </td>
                        {/* Col 2: Status */}
                        <td className="px-1 py-2.5 text-center align-top break-words" style={{ width: '18%' }}>
                          <StatusBadge item={lastDesfechoMap[p.id]} small />
                        </td>
                        {/* Col 3: Paciente */}
                        <td className="px-2 py-2.5 text-center align-top" style={{ width: '42%' }}>
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[11px] font-black text-slate-800 group-hover:text-slate-900 transition-colors duration-200 leading-tight break-words">{p.paciente || "\u2014"}</span>
                            <span className="font-mono text-[8px] font-bold text-slate-400/80 leading-tight truncate max-w-[130px]" title={p.n_cns_da_pessoa_cadastrada}>CNS {p.n_cns_da_pessoa_cadastrada || "\u2014"}</span>
                            <span className="text-[9px] font-bold text-slate-400/80 leading-tight">Nasc {formatarData(p.data_de_nascimento)}</span>
                            <div className="mt-0.5 flex flex-wrap items-center justify-center gap-0.5">
                              {idadeNum !== null && (
                                <span className={`inline-flex items-center rounded px-1 py-px text-[7px] font-bold leading-none ${
                                  idadeNum <= 2 ? "bg-violet-50 text-violet-700"
                                  : idadeNum < 60 ? "bg-slate-100 text-slate-600"
                                  : "bg-amber-50 text-amber-700"
                                }`}>
                                  {idadeNum}a
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center justify-center gap-0.5">
                              {p.gestante && <span className="inline-flex items-center rounded-full bg-rose-50 px-1 py-px text-[6px] font-bold text-rose-700 border border-rose-100">Gest.</span>}
                              {p.tb && <span className="inline-flex items-center rounded-full bg-orange-50 px-1 py-px text-[6px] font-bold text-orange-700 border border-orange-100">TB</span>}
                              {p.tabagista && <span className="inline-flex items-center rounded-full bg-amber-50 px-1 py-px text-[6px] font-bold text-amber-700 border border-amber-100">Tab.</span>}
                              {idadeNum !== null && idadeNum <= 2 && <span className="inline-flex items-center rounded-full bg-violet-50 px-1 py-px text-[6px] font-bold text-violet-700 border border-violet-100">≤2a</span>}
                            </div>
                          </div>
                        </td>
                        {/* Col 4: Unidade */}
                        <td className="px-2 py-2.5 text-center align-top" style={{ width: '25%' }}>
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[10px] font-black text-slate-800 group-hover:text-slate-900 transition-colors duration-200 leading-tight">{p.unidade || "\u2014"}</span>
                            <span className="text-[8px] font-bold text-slate-400/80 leading-tight">{p.equipe || "\u2014"}</span>
                            <span className="text-[7px] font-bold text-slate-400/80 leading-tight">Micro: {p.microarea || "\u2014"}</span>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Indicador visual de scroll */}
              <div className="pointer-events-none flex items-center justify-center gap-1.5 border-t border-slate-100 bg-gradient-to-r from-slate-50 via-blue-50/50 to-slate-50 px-3 py-1.5">
                <svg className="h-3 w-3 animate-pulse text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
                <span className="text-[8px] font-bold uppercase tracking-wider text-blue-500">Puxe para o lado</span>
                <svg className="h-3 w-3 animate-pulse text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
              </div>
              {filtrados.length === 0 && (
                <div className="px-4 py-10 text-center text-[11px] text-slate-400">Nenhum paciente encontrado.</div>
              )}
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {filtrados.length} registro{filtrados.length !== 1 ? "s" : ""} encontrado{filtrados.length !== 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pagina <= 1} className="rounded border border-slate-200 bg-white px-2 py-1 text-[9px] font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Anterior</button>
                  <span className="text-[10px] font-bold text-slate-500">Pág. {pagina} de {totalPaginas}</span>
                  <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pagina >= totalPaginas} className="rounded border border-slate-200 bg-white px-2 py-1 text-[9px] font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Próximo</button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

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

      {/* Modal de detalhes do paciente */}
      {pacienteModal && createPortal(
        <ModalDetalhes
          paciente={pacienteModal}
          usuarioId={usuarioId}
          onFechar={() => setPacienteModal(null)}
          onAtualizar={(p) => setFavoritos((prev) => prev.map((x) => x.id === p.id ? p : x))}
          onAbrirAcomp={(p) => { setPacienteModal(null); setPacienteAcompModal(p); }}
        />,
        document.body
      )}

      {/* Modal de acompanhamento */}
      {pacienteAcompModal && createPortal(
        <ModalAcompanhamento
          paciente={pacienteAcompModal}
          usuarioId={usuarioId}
          onFechar={() => setPacienteAcompModal(null)}
        />,
        document.body
      )}
    </div>
  );
}




