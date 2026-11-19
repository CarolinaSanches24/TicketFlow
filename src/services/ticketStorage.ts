// IndexedDB service for storing ticket bases locally in the browser
// This allows storing multi-megabyte datasets (HTML/CSV imports) persistently without server constraints.

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

export const ticketStorage = {
  async getAll(): Promise<TicketBase[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const list = (req.result || []) as TicketBase[];
        // Sort newest uploaded first
        list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async getById(id: string): Promise<TicketBase | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async save(base: TicketBase): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(base);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async delete(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
};
