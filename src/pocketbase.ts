/**
 * Servico PocketBase para a collection painelsorriso53_pacientes.
 * Usa REST API direta — sem SDK externo.
 *
 * Suporta autenticacao via:
 *   1. Token salvo em localStorage (pb_auth_token) — login via app
 *   2. VITE_POCKETBASE_TOKEN — token fixo via env var
 *
 * Se nenhum token existir, busca como anonimo (requer API rules publicas).
 */

import type { Paciente, Acompanhamento } from "./types";

const PB_URL = import.meta.env.VITE_POCKETBASE_URL as string;
const PB_COLLECTION = import.meta.env.VITE_POCKETBASE_COLLECTION as string;
const PB_FAVORITOS_COLLECTION = "painelsorriso53_favoritos";
const PB_ACOMPANHAMENTOS_COLLECTION = "painelsorriso53_acompanhamentos";
const PB_TOKEN_STATIC = import.meta.env.VITE_POCKETBASE_TOKEN as string | undefined;

function baseUrl(): string {
  return `${PB_URL.replace(/\/+$/, "")}/api/collections/${PB_COLLECTION}/records`;
}

function favoritosBaseUrl(): string {
  return `${PB_URL.replace(/\/+$/, "")}/api/collections/${PB_FAVORITOS_COLLECTION}/records`;
}

function acompanhamentosBaseUrl(): string {
  return `${PB_URL.replace(/\/+$/, "")}/api/collections/${PB_ACOMPANHAMENTOS_COLLECTION}/records`;
}

/**
 * Obtem token de autenticacao.
 * Prioridade: localStorage > env var > vazio (anonimo).
 */
function getAuthToken(): string | null {
  try {
    const stored = localStorage.getItem("pb_auth_token");
    if (stored) return stored;
  } catch { /* ignore */ }
  if (PB_TOKEN_STATIC) return PB_TOKEN_STATIC;
  return null;
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Accept": "application/json" };
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// ── Filtro por perfil do usuário ───────────────────────────────────────

export interface UsuarioLogado {
  id: string;
  email: string;
  name: string;
  role: string;
  unidade?: string;
  equipe?: string;
}

/** Lê o usuário logado do localStorage (pb_user). */
export function getUsuarioAtual(): UsuarioLogado | null {
  try {
    const raw = localStorage.getItem("pb_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Constrói filtro PocketBase baseado no perfil do usuário.
 * - unidade: filtra por unidade exata
 * - odonto: filtra por unidade E equipe (equipe pode ter múltiplos valores separados por vírgula)
 * - cap / outro: sem filtro (acesso total)
 */
export function buildFiltroRole(usuario?: UsuarioLogado | null): string | null {
  const u = usuario ?? getUsuarioAtual();
  if (!u) return null;

  if (u.role === "unidade" && u.unidade) {
    return `unidade="${u.unidade}"`;
  }

  if (u.role === "odonto" && u.unidade) {
    // Equipe pode ser "EQ1, EQ2" — precisa checar se paciente.equipe contém qualquer uma
    if (u.equipe) {
      const equipes = u.equipe.split(",").map((e) => e.trim()).filter(Boolean);
      if (equipes.length === 1) {
        return `unidade="${u.unidade}" && equipe="${equipes[0]}"`;
      }
      if (equipes.length > 1) {
        const eqFilter = equipes.map((eq) => `equipe="${eq}"`).join(" || ");
        return `unidade="${u.unidade}" && (${eqFilter})`;
      }
    }
    // Odonto sem equipe selecionada → apenas unidade
    return `unidade="${u.unidade}"`;
  }

  // cap ou outro → sem filtro
  return null;
}

/**
 * Combinar filtro de role com filtro existente (se houver).
 */
export function combinarFiltros(filtroRole: string | null, filtroExtra?: string): string | undefined {
  if (!filtroRole && !filtroExtra) return undefined;
  if (filtroRole && filtroExtra) return `(${filtroRole}) && (${filtroExtra})`;
  return filtroRole ?? filtroExtra;
}

/**
 * Cache + dedup de promise para evitar requests duplicados.
 * Múltiplos componentes chamam buscarPacientes() ao mesmo tempo.
 * Sem cache = centenas de requests idênticas = server sobrecarrega.
 */
let _cache: { items: Paciente[]; totalItems: number; totalPages: number; ts: number } | null = null;
let _inflight: Promise<{ items: Paciente[]; totalItems: number; totalPages: number }> | null = null;
const CACHE_TTL_MS = 60_000; // 1 minuto

export async function buscarPacientes(opts?: {
  page?: number;
  perPage?: number;
  filter?: string;
}): Promise<{ items: Paciente[]; totalItems: number; totalPages: number }> {
  // Sem filtro e sem paginação custom = busca global → usa cache
  const useCache = !opts?.filter && !opts?.page;

  if (useCache && _cache && (Date.now() - _cache.ts) < CACHE_TTL_MS) {
    return _cache;
  }

  // Dedup: se já existe promise em voo, reutilizar
  if (useCache && _inflight) {
    return _inflight;
  }

  const promise = _fetchAllPacientes(opts);

  if (useCache) {
    _inflight = promise;
    try {
      const result = await promise;
      _cache = { ...result, ts: Date.now() };
      return result;
    } finally {
      _inflight = null;
    }
  }

  return promise;
}

/** Invalidar cache (ex: após importação/exclusão) */
export function invalidatePacientesCache(): void {
  _cache = null;
}

// Invalidar quando aba ganha foco — garante dados frescos
if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      _cache = null;
    }
  });
}

async function _fetchAllPacientes(opts?: {
  page?: number;
  perPage?: number;
  filter?: string;
}): Promise<{ items: Paciente[]; totalItems: number; totalPages: number }> {
  const perPage = 200;
  const headers = buildHeaders();
  let allItems: Paciente[] = [];
  let totalItems = 0;
  let totalPages = 0;
  let page = opts?.page ?? 1;
  let serverPageSize = perPage; // detectar tamanho real da página do server

  while (true) {
    const params = new URLSearchParams({
      page: String(page),
      perPage: String(perPage),
      sort: "-created",
    });

    if (opts?.filter) {
      params.set("filter", opts.filter);
    }

    const url = `${baseUrl()}?${params.toString()}`;
    const res = await fetch(url, { headers });

    if (!res.ok) {
      throw new Error(`PocketBase erro ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const items = (data.items ?? []) as Paciente[];
    allItems = allItems.concat(items);
    totalItems = data.totalItems as number;
    totalPages = data.totalPages as number;

    if (items.length === 0) break;

    // Detectar tamanho real da página na primeira iteração
    if (page === (opts?.page ?? 1) && items.length < perPage) {
      serverPageSize = items.length;
    }

    // Se retornou menos que o tamanho real detectado do server, fim
    if (items.length < serverPageSize) break;
    page++;
  }

  return { items: allItems, totalItems, totalPages };
}

// ── Favoritos (painelsorriso53_favoritos) ──────────────────────────────

export async function buscarFavoritos(
  usuarioId: string
): Promise<{ id: string; usuario_id: string; paciente_id: string }[]> {
  const url = `${favoritosBaseUrl()}?filter=${encodeURIComponent(
    `usuario_id="${usuarioId}"`
  )}&perPage=500&sort=-created`;
  const res = await fetch(url, { headers: buildHeaders() });
  if (!res.ok) {
    throw new Error(`PocketBase erro favoritos ${res.status}: ${res.statusText}`);
  }
  const data = await res.json();
  return data.items as { id: string; usuario_id: string; paciente_id: string }[];
}

export async function adicionarFavorito(
  usuarioId: string,
  pacienteId: string
): Promise<{ id: string; usuario_id: string; paciente_id: string }> {
  const headers = { ...buildHeaders(), "Content-Type": "application/json" };
  const res = await fetch(favoritosBaseUrl(), {
    method: "POST",
    headers,
    body: JSON.stringify({ usuario_id: usuarioId, paciente_id: pacienteId }),
  });
  if (!res.ok) {
    throw new Error(`PocketBase erro favoritos ${res.status}: ${res.statusText}`);
  }
  return (await res.json()) as { id: string; usuario_id: string; paciente_id: string };
}

export async function removerFavorito(favoritoId: string): Promise<void> {
  const res = await fetch(`${favoritosBaseUrl()}/${favoritoId}`, {
    method: "DELETE",
    headers: buildHeaders(),
  });
  if (!res.ok) {
    throw new Error(`PocketBase erro favoritos ${res.status}: ${res.statusText}`);
  }
}

export async function atualizarPaciente(
  id: string,
  dados: Partial<Paciente>
): Promise<Paciente> {
  const url = `${baseUrl()}/${id}`;
  const headers = { ...buildHeaders(), "Content-Type": "application/json" };
  const res = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify(dados),
  });

  if (!res.ok) {
    throw new Error(`PocketBase erro ${res.status}: ${res.statusText}`);
  }

  return (await res.json()) as Paciente;
}

// ── Acompanhamentos ────────────────────────────────────────────────────

export async function buscarAcompanhamentos(
  pacienteId: string
): Promise<Acompanhamento[]> {
  const url = `${acompanhamentosBaseUrl()}?filter=${encodeURIComponent(
    `paciente_id="${pacienteId}"`
  )}&perPage=200&sort=-data_da_busca`;
  const res = await fetch(url, { headers: buildHeaders() });
  if (!res.ok) {
    throw new Error(`PocketBase erro ${res.status}: ${res.statusText}`);
  }
  const data = await res.json();
  return data.items as Acompanhamento[];
}

export async function criarAcompanhamento(
  dados: Omit<Acompanhamento, "id" | "created" | "updated">
): Promise<Acompanhamento> {
  const headers = { ...buildHeaders(), "Content-Type": "application/json" };
  const res = await fetch(acompanhamentosBaseUrl(), {
    method: "POST",
    headers,
    body: JSON.stringify(dados),
  });
  if (!res.ok) {
    throw new Error(`PocketBase erro ${res.status}: ${res.statusText}`);
  }
  return (await res.json()) as Acompanhamento;
}

export async function atualizarAcompanhamento(
  id: string,
  dados: Partial<Omit<Acompanhamento, "id" | "created" | "updated">>
): Promise<Acompanhamento> {
  const headers = { ...buildHeaders(), "Content-Type": "application/json" };
  const res = await fetch(`${acompanhamentosBaseUrl()}/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(dados),
  });
  if (!res.ok) {
    throw new Error(`PocketBase erro ${res.status}: ${res.statusText}`);
  }
  return (await res.json()) as Acompanhamento;
}

export async function buscarTodosAcompanhamentos(): Promise<Acompanhamento[]> {
  const perPage = 200;
  const headers = buildHeaders();
  let allItems: Acompanhamento[] = [];
  let page = 1;
  let serverPageSize = perPage;

  while (true) {
    const url = `${acompanhamentosBaseUrl()}?page=${page}&perPage=${perPage}&sort=-created`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`PocketBase erro ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    const items = (data.items ?? []) as Acompanhamento[];
    allItems = allItems.concat(items);

    if (items.length === 0) break;
    if (page === 1 && items.length < perPage) {
      serverPageSize = items.length;
    }
    if (items.length < serverPageSize) break;
    page++;
  }

  return allItems;
}

export async function excluirAcompanhamento(id: string): Promise<void> {
  const res = await fetch(`${acompanhamentosBaseUrl()}/${id}?_method=DELETE`, {
    method: "POST",
    headers: buildHeaders(),
  });
  if (!res.ok) {
    throw new Error(`PocketBase erro ${res.status}: ${res.statusText}`);
  }
}

/**
 * Re-vincula acompanhamentos órfãos usando campo CNS.
 * Busca pacientes + acompanhamentos, cruza CNS em memória, atualiza 1 a 1 via API REST.
 */
export async function relinkarPorCNS(
  onProgress?: (fase: string, atual: number, total: number) => void
): Promise<{ vinculados: string[]; ignorados: number }> {
  const headers = buildHeaders();
  const perPage = 200;

  // 1. Buscar todos os pacientes com CNS
  onProgress?.("Buscando pacientes...", 0, 0);
  const pacientes = await _fetchAllPacientes({ perPage });
  const cnsMap = new Map<string, string>();
  for (const p of pacientes.items) {
    const cns = String(p.n_cns_da_pessoa_cadastrada ?? "").trim();
    if (cns) cnsMap.set(cns, p.id);
  }

  // 2. Buscar todos os acompanhamentos
  onProgress?.("Buscando acompanhamentos...", 0, 0);
  let allAcomps: { id: string; cns: string; paciente_id: string }[] = [];
  let page = 1;
  while (true) {
    const url = `${acompanhamentosBaseUrl()}?page=${page}&perPage=${perPage}&fields=id,cns,paciente_id&sort=-created`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`PocketBase erro ${res.status}: ${res.statusText}`);
    const data = await res.json();
    const items = (data.items ?? []) as { id: string; cns: string; paciente_id: string }[];
    allAcomps = allAcomps.concat(items);
    if (items.length === 0 || items.length < perPage) break;
    page++;
  }

  // 3. Cruzar CNS → vincular
  const vinculados: string[] = [];
  let ignorados = 0;
  const total = allAcomps.length;

  for (let i = 0; i < total; i++) {
    const a = allAcomps[i];
    const cns = String(a.cns ?? "").trim();
    const pacId = a.paciente_id;
    const correctPacId = cns ? cnsMap.get(cns) : undefined;

    if (cns && correctPacId && pacId !== correctPacId) {
      onProgress?.("Vinculando...", i + 1, total);
      const url = `${acompanhamentosBaseUrl()}/${a.id}`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ paciente_id: correctPacId }),
      });
      if (res.ok) vinculados.push(a.id);
    } else {
      ignorados++;
    }
  }

  return { vinculados, ignorados };
}
