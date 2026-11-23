import { supabase } from '../lib/supabaseClient';

// Storage service for storing ticket bases globally in Supabase with IndexedDB fallback/cache
// This ensures that ticket bases uploaded by any user are globally accessible to Analista, Administrador and Liderança.

export interface TicketItem {
  id: string;
  assunto: string;
  contexto: string;
  modulo: string;
  submodulo: string;
  unidade: string;
  acao: string;
  origem: string;
  resolucao: string;
  alcance: string;
  grupo: string;
  status: string;
  descricao: string;
  tipo: string;
  form: string;
  cat?: string;
  categoria?: string;
  data?: string; // Optional date for period filtering
}

export interface TempoSubItem {
  submodulo: string;
  horas: number;
}

export interface TempoAcaoItem {
  acao: string;
  horas: number;
}

export interface TicketDataset {
  tickets: {
    rows: TicketItem[];
    meta?: Array<{ label: string; value: string }>;
  };
  tipos?: {
    rows: Array<{ tipo: string; tipo_zendesk?: string; chamados: number }>;
  };
  tempo_sub?: {
    rows: TempoSubItem[];
  };
  tempo_acao?: {
    rows: TempoAcaoItem[];
  };
}

export interface TicketBase {
  id: string;
  name: string;
  fileName: string;
  fileType: 'html' | 'csv';
  ticketCount: number;
  uploadedAt: string;
  periodStart?: string;
  periodEnd?: string;
  datasets: TicketDataset;
}

const DB_NAME = 'TicketFlowChamadosDB';
const DB_VERSION = 1;
const STORE_NAME = 'bases';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function mapDbToTicketBase(row: any): TicketBase {
  return {
    id: row.id,
    name: row.name,
    fileName: row.file_name || row.fileName || '',
    fileType: (row.file_type || row.fileType || 'html') as 'html' | 'csv',
    ticketCount: Number(row.ticket_count ?? row.ticketCount ?? 0),
    uploadedAt: row.uploaded_at || row.uploadedAt || new Date().toISOString(),
    periodStart: row.period_start || row.periodStart || undefined,
    periodEnd: row.period_end || row.periodEnd || undefined,
    datasets: row.datasets || { tickets: { rows: [] } }
  };
}

function getAllFromIndexedDB(): Promise<TicketBase[]> {
  return openDB().then((db) => {
    return new Promise<TicketBase[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const list = (req.result || []) as TicketBase[];
        list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }).catch(() => [] as TicketBase[]);
}

function getByIdFromIndexedDB(id: string): Promise<TicketBase | null> {
  return openDB().then((db) => {
    return new Promise<TicketBase | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => resolve((req.result as TicketBase) || null);
      req.onerror = () => reject(req.error);
    });
  }).catch(() => null);
}

function saveToIndexedDB(base: TicketBase): Promise<void> {
  return openDB().then((db) => {
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(base);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }).catch(() => {});
}

function deleteFromIndexedDB(id: string): Promise<void> {
  return openDB().then((db) => {
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }).catch(() => {});
}

export const ticketStorage = {
  async getAll(): Promise<TicketBase[]> {
    try {
      const { data, error } = await supabase
        .from('ticket_bases')
        .select('id, name, file_name, file_type, ticket_count, uploaded_at, period_start, period_end')
        .order('uploaded_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const supabaseList = data.map(mapDbToTicketBase);
        const localList = await getAllFromIndexedDB();
        
        // Merge to avoid losing any local base that hasn't synced yet
        const map = new Map<string, TicketBase>();
        supabaseList.forEach(b => map.set(b.id, b));
        localList.forEach(b => {
          if (!map.has(b.id)) map.set(b.id, b);
        });

        const merged = Array.from(map.values());
        merged.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        return merged;
      }
    } catch (err) {
      console.warn('[ticketStorage] Erro ao buscar bases no Supabase, usando IndexedDB:', err);
    }

    return getAllFromIndexedDB();
  },

  async getById(id: string): Promise<TicketBase | null> {
    // 1. Tentar cache local primeiro para resposta rápida
    try {
      const local = await getByIdFromIndexedDB(id);
      if (local && local.datasets?.tickets?.rows && local.datasets.tickets.rows.length > 0) {
        return local;
      }
    } catch {
      // ignore
    }

    // 2. Buscar da base global no Supabase
    try {
      const { data, error } = await supabase
        .from('ticket_bases')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        const base = mapDbToTicketBase(data);
        saveToIndexedDB(base).catch(() => {});
        return base;
      }
    } catch (err) {
      console.warn('[ticketStorage] Erro ao buscar base no Supabase:', err);
    }

    return getByIdFromIndexedDB(id);
  },

  async save(base: TicketBase): Promise<void> {
    // 1. Salvar no cache local para resiliência
    await saveToIndexedDB(base);

    // 2. Sincronizar com o Supabase para que todos os usuários tenham acesso compartilhado
    try {
      const { error } = await supabase
        .from('ticket_bases')
        .upsert({
          id: base.id,
          name: base.name,
          file_name: base.fileName,
          file_type: base.fileType,
          ticket_count: base.ticketCount,
          uploaded_at: base.uploadedAt,
          period_start: base.periodStart || null,
          period_end: base.periodEnd || null,
          datasets: base.datasets
        }, { onConflict: 'id' });

      if (error) {
        console.warn('[ticketStorage] Aviso ao salvar no Supabase (verifique se a tabela ticket_bases existe):', error.message);
      }
    } catch (err) {
      console.warn('[ticketStorage] Erro de rede ao sincronizar com Supabase:', err);
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await supabase.from('ticket_bases').delete().eq('id', id);
    } catch (err) {
      console.warn('[ticketStorage] Erro ao excluir do Supabase:', err);
    }
    await deleteFromIndexedDB(id);
  }
};
