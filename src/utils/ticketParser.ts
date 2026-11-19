import { TicketItem, TicketDataset } from '../services/ticketStorage';

export const ORIGEM_CATEGORIES = [
  { key: 'falha', label: 'Falha / bug', color: '#c0392b' },
  { key: 'config', label: 'Configuração incorreta', color: '#e0962b' },
  { key: 'duvida', label: 'Dúvida de uso', color: '#3b6fd4' },
  { key: 'tarefa', label: 'Tarefa', color: '#3aa17e' },
  { key: 'inativo', label: 'Usuário inativo', color: '#8a5cc7' },
  { key: 'outros', label: 'Outros', color: '#6b7b8f' },
  { key: 'nc', label: 'Não classificado', color: '#b8bfc9' },
] as const;

// ─── Padronização de Tipos de Ticket ──────────────────────────────────────────
export const STANDARDIZED_TICKET_TYPES = [
  'Sem tipo',
  'Incidentes',
  'Perguntas',
  'Problema',
  'Tarefas',
  'Outro',
] as const;

export type StandardTicketType = typeof STANDARDIZED_TICKET_TYPES[number];

export function standardizeTicketType(raw?: string): StandardTicketType {
  const norm = (raw || '').trim().toLowerCase();
  if (!norm || norm === 'sem tipo' || norm === '(vazio)' || norm === 'null' || norm === 'undefined' || norm === '-') {
    return 'Sem tipo';
  }
  if (norm.includes('incidente') || norm.includes('incident')) {
    return 'Incidentes';
  }
  if (norm.includes('pergunta') || norm.includes('dúvida') || norm.includes('duvida') || norm.includes('question')) {
    return 'Perguntas';
  }
  if (norm.includes('problema') || norm.includes('problem')) {
    return 'Problema';
  }
  if (norm.includes('tarefa') || norm.includes('task')) {
    return 'Tarefas';
  }
  return 'Outro';
}

// ─── Unificação de Status (Closed + Resolvido representam o mesmo estado) ─────
export function standardizeStatus(raw?: string): string {
  const norm = (raw || '').trim().toLowerCase();
  if (norm === 'closed' || norm === 'resolvido' || norm === 'fechado' || norm === 'solved') {
    return 'Resolvido';
  }
  if (norm === 'open' || norm === 'aberto' || norm === 'novo' || norm === 'new') {
    return 'Aberto';
  }
  if (norm.includes('pendente') || norm.includes('pending')) {
    return 'Pendente';
  }
  if (norm.includes('espera') || norm.includes('hold') || norm.includes('aguardando')) {
    return 'Em espera';
  }
  if (norm.includes('cancelado') || norm.includes('canceled') || norm.includes('cancelled')) {
    return 'Cancelado';
  }
  return (raw || '').trim() || 'Outro';
}

// ─── Limpeza de Módulo (Exclusivamente o nome do Módulo principal) ───────────
export function cleanModuleName(raw?: string): string {
  if (!raw) return 'Não classificado';
  let s = raw.trim();
  // Se contiver :: (ex: Secretaria::Matrículas), extrai apenas a primeira parte
  if (s.includes('::')) {
    const parts = s.split('::').map((p) => p.trim()).filter(Boolean);
    s = parts[0] || s;
  }
  // Remove colchetes de tags no início se houver (ex: [Pedagógico] -> Pedagógico)
  s = s.replace(/^\[(.*?)\]/, '$1').trim();
  return s || 'Não classificado';
}

// ─── Limpeza de Submódulo (Exclusivamente o nome do Submódulo) ───────────────
export function cleanSubmoduleName(raw?: string): string {
  if (!raw) return 'Não classificado';
  let s = raw.trim();
  // Se contiver concatenação :: (ex: Matrículas::Lista de matrículas ou Configurações::Pedagógico), extrai o nome do submódulo
  if (s.includes('::')) {
    const parts = s.split('::').map((p) => p.trim()).filter(Boolean);
    s = parts[parts.length - 1] || s;
  }
  s = s.replace(/^\[(.*?)\]/, '$1').trim();
  return s || 'Não classificado';
}

export function categorizeOrigem(origemRaw?: string): { cat: string; categoria: string } {
  const norm = (origemRaw || '').trim().toLowerCase();
  if (!norm || norm === 'não classificado' || norm === 'nao classificado' || norm === 'n/a' || norm === '-') {
    return { cat: 'nc', categoria: 'Não classificado' };
  }
  if (norm.includes('falha') || norm.includes('bug')) {
    return { cat: 'falha', categoria: 'Falha / bug' };
  }
  if (norm.includes('config') || norm.includes('parametrização') || norm.includes('parametrizacao')) {
    return { cat: 'config', categoria: 'Configuração incorreta' };
  }
  if (norm.includes('dúvida') || norm.includes('duvida')) {
    return { cat: 'duvida', categoria: 'Dúvida de uso' };
  }
  if (norm.includes('tarefa')) {
    return { cat: 'tarefa', categoria: 'Tarefa' };
  }
  if (norm.includes('inativo')) {
    return { cat: 'inativo', categoria: 'Usuário inativo' };
  }
  return { cat: 'outros', categoria: 'Outros' };
}

// Normalize dates to YYYY-MM-DD
export function normalizeDate(raw?: string): string | undefined {
  if (!raw) return undefined;
  const s = raw.trim();
  // Match DD/MM/YYYY
  const brMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Match YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  return undefined;
}

export function parseHtmlData(html: string): { datasets: TicketDataset; metaTitle?: string } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Extract title if present
  let metaTitle: string | undefined;
  const titleEl = doc.querySelector('title') || doc.querySelector('h1') || doc.querySelector('.dash-title');
  if (titleEl && titleEl.textContent) {
    metaTitle = titleEl.textContent.trim();
  }

  const script = doc.querySelector('#dash-data');
  if (!script || !script.textContent) {
    throw new Error('Tag <script id="dash-data"> não encontrada no arquivo HTML.');
  }

  const raw = JSON.parse(script.textContent);
  if (!raw || !raw.datasets || !raw.datasets.tickets || !Array.isArray(raw.datasets.tickets.rows)) {
    throw new Error('Estrutura de dados inválida no arquivo HTML.');
  }

  const rows: TicketItem[] = raw.datasets.tickets.rows.map((r: any) => {
    const { cat, categoria } = categorizeOrigem(r.origem);
    return {
      id: String(r.id || ''),
      assunto: String(r.assunto || ''),
      contexto: String(r.contexto || ''),
      modulo: cleanModuleName(r.modulo),
      submodulo: cleanSubmoduleName(r.submodulo),
      unidade: String(r.unidade || ''),
      acao: String(r.acao || 'Não classificado'),
      origem: String(r.origem || 'Não classificado'),
      resolucao: String(r.resolucao || 'Não classificado'),
      alcance: String(r.alcance || 'Não classificado'),
      grupo: String(r.grupo || 'Não classificado'),
      status: standardizeStatus(r.status),
      descricao: String(r.descricao || ''),
      tipo: standardizeTicketType(r.tipo),
      form: String(r.form || 'Não classificado'),
      cat,
      categoria,
      data: normalizeDate(r.data || r.created_at || r.data_criacao),
    };
  });

  return {
    datasets: {
      tickets: {
        rows,
        meta: raw.datasets.tickets.meta,
      },
      tipos: raw.datasets.tipos,
      tempo_sub: raw.datasets.tempo_sub,
      tempo_acao: raw.datasets.tempo_acao,
    },
    metaTitle,
  };
}

export function parseCsvData(csvText: string, fileName?: string): { datasets: TicketDataset; metaTitle?: string } {
  const lines = parseCSVRows(csvText);
  if (lines.length < 2) {
    throw new Error('O arquivo CSV deve conter um cabeçalho e pelo menos uma linha de dados.');
  }

  const headers = lines[0].map((h) => h.trim().toLowerCase());

  // Function to find column index matching names
  const findCol = (...names: string[]) => {
    for (const name of names) {
      const idx = headers.findIndex((h) => h === name || h.replace(/[^a-z0-9]/g, '') === name.replace(/[^a-z0-9]/g, ''));
      if (idx !== -1) return idx;
    }
    // Partial search
    for (const name of names) {
      const idx = headers.findIndex((h) => h.includes(name));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const idIdx = findCol('id', 'ticket id', 'numero', 'número', 'codigo', 'código', 'chamado');
  const assuntoIdx = findCol('assunto', 'subject', 'titulo', 'título', 'title');
  const contextoIdx = findCol('contexto', 'context', 'contexto da demanda', 'detalhes');
  const moduloIdx = findCol('modulo', 'módulo', 'module');
  const submoduloIdx = findCol('submodulo', 'submódulo', 'sub_modulo');
  const unidadeIdx = findCol('unidade', 'escola', 'instituicao', 'instituição', 'organizacao', 'organização', 'school');
  const acaoIdx = findCol('acao', 'ação', 'action');
  const origemIdx = findCol('origem', 'origem do chamado', 'causa', 'motivo');
  const resolucaoIdx = findCol('resolucao', 'resolução', 'tipo de resolucao', 'resolution');
  const alcanceIdx = findCol('alcance', 'impacto', 'scope');
  const grupoIdx = findCol('grupo', 'group', 'fila', 'nivel', 'nível', 'tier');
  const statusIdx = findCol('status', 'situacao', 'situação', 'estado');
  const descIdx = findCol('descricao', 'descrição', 'description', 'detalhe');
  const tipoIdx = findCol('tipo', 'type', 'tipo do ticket');
  const formIdx = findCol('formulario', 'formulário', 'form');
  const dataIdx = findCol('data', 'data de criacao', 'data de criação', 'data criacao', 'criado em', 'created at', 'created_at', 'data abertura');

  const rows: TicketItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (row.length === 0 || (row.length === 1 && !row[0])) continue;

    const getVal = (idx: number, fallback = '') => (idx !== -1 && row[idx] ? row[idx].trim() : fallback);

    const origemRaw = getVal(origemIdx, 'Não classificado');
    const { cat, categoria } = categorizeOrigem(origemRaw);
    const dateRaw = getVal(dataIdx);

    rows.push({
      id: getVal(idIdx, String(i)),
      assunto: getVal(assuntoIdx, '(Sem assunto)'),
      contexto: getVal(contextoIdx, ''),
      modulo: cleanModuleName(getVal(moduloIdx)),
      submodulo: cleanSubmoduleName(getVal(submoduloIdx)),
      unidade: getVal(unidadeIdx, ''),
      acao: getVal(acaoIdx, 'Não classificado'),
      origem: origemRaw,
      resolucao: getVal(resolucaoIdx, 'Não classificado'),
      alcance: getVal(alcanceIdx, 'Não classificado'),
      grupo: getVal(grupoIdx, 'N1'),
      status: standardizeStatus(getVal(statusIdx)),
      descricao: getVal(descIdx, ''),
      tipo: standardizeTicketType(getVal(tipoIdx)),
      form: getVal(formIdx, 'Não classificado'),
      cat,
      categoria,
      data: normalizeDate(dateRaw),
    });
  }

  return {
    datasets: {
      tickets: {
        rows,
        meta: [
          { label: 'Arquivo', value: fileName || 'Importação CSV' },
          { label: 'Total de Registros', value: String(rows.length) },
        ],
      },
    },
    metaTitle: fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Chamados Importados (CSV)',
  };
}

// Parser CSV nativo seguro que aceita vírgulas e ponto-e-vírgula e quebras dentro de aspas
function parseCSVRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  // Detect delimiter based on first row
  const firstLine = text.slice(0, 2000).split(/\r?\n/)[0] || '';
  const semiCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = semiCount > commaCount ? ';' : ',';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentField);
      if (currentRow.some((c) => c.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((c) => c.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}
