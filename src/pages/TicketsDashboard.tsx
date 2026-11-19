import React, { useState, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { UploadCloud, X, BarChart2, RefreshCw } from 'lucide-react';
import Layout from '../components/layouts/Layout';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Ticket {
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
}

interface DashData {
  params: { cat: string; form: string; modulo: string; status: string; sub: string; tipo: string };
  datasets: {
    tickets: { rows: Ticket[] };
    modulos: { rows: { modulo: string; total: number }[] };
    submodulos: { rows: { submodulo: string; total: number }[] };
    classificacao: { rows: { origem: string; total: number }[] };
    dimensoes: { rows: { alcance: string; total: number }[] };
    tempo_sub: { rows: { submodulo: string; tempo_medio: number }[] };
    gargalos: { rows: { categoria: string; tipo: string; total: number }[] };
    lista: { rows: unknown[] };
  };
}

interface Filters {
  modulo: string;
  tipo: string;
  form: string;
  status: string;
  origem: string;
}

// ─── Helper: parse HTML string ───────────────────────────────────────────────

function parseDashData(html: string): DashData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const script = doc.querySelector('#dash-data');
  if (!script || !script.textContent) {
    throw new Error('Tag <script id="dash-data"> não encontrada no arquivo.');
  }
  return JSON.parse(script.textContent) as DashData;
}

// ─── Helper: unique sorted values ────────────────────────────────────────────

function uniqueValues(tickets: Ticket[], key: keyof Ticket): string[] {
  return Array.from(new Set(tickets.map((t) => t[key]))).sort();
}

// ─── Helper: count by field ───────────────────────────────────────────────────

function countBy(tickets: Ticket[], key: keyof Ticket): { name: string; value: number }[] {
  const map: Record<string, number> = {};
  for (const t of tickets) {
    const v = t[key] || '—';
    map[v] = (map[v] ?? 0) + 1;
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface HBarChartProps {
  title: string;
  data: { name: string; value: number }[];
  maxItems?: number;
  color?: string;
}

const HBarChartCard: React.FC<HBarChartProps> = ({
  title,
  data,
  maxItems = 999,
  color = '#3b82f6',
}) => {
  const sliced = data.slice(0, maxItems);
  const height = Math.max(180, sliced.length * 34);
  return (
    <div className="rounded-2xl shadow-sm border border-slate-100 bg-white p-6">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
      {sliced.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">Sem dados</p>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={sliced} layout="vertical" margin={{ left: 10, right: 20, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey="name"
              width={130}
              tick={{ fontSize: 11 }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              cursor={{ fill: '#f1f5f9' }}
            />
            <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} name="Chamados" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

interface KpiCardProps {
  label: string;
  value: number;
  color?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, color = 'text-blue-600' }) => (
  <div className="rounded-2xl shadow-sm border border-slate-100 bg-white p-6 flex flex-col gap-1">
    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
    <span className={`text-3xl font-bold ${color}`}>{value.toLocaleString('pt-BR')}</span>
  </div>
);

// ─── Upload Area ──────────────────────────────────────────────────────────────

interface UploadAreaProps {
  onData: (data: DashData, fileName: string) => void;
  onError: (msg: string) => void;
}

const UploadArea: React.FC<UploadAreaProps> = ({ onData, onError }) => {
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith('.html')) {
        onError('Por favor, selecione um arquivo .html válido.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const html = e.target?.result as string;
          const data = parseDashData(html);
          onData(data, file.name);
        } catch (err) {
          onError('Erro ao processar o arquivo: ' + (err instanceof Error ? err.message : String(err)));
        }
      };
      reader.readAsText(file, 'utf-8');
    },
    [onData, onError],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = '';
    },
    [handleFile],
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-2xl p-16 cursor-pointer transition-colors ${
        dragging
          ? 'border-blue-400 bg-blue-50'
          : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'
      }`}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <UploadCloud className="w-12 h-12 text-blue-400" />
      <div className="text-center">
        <p className="text-base font-semibold text-slate-700">
          Arraste e solte o arquivo aqui
        </p>
        <p className="text-sm text-slate-500 mt-1">
          ou clique para selecionar um arquivo <strong>.html</strong> exportado do dashboard
        </p>
        <p className="text-xs text-slate-400 mt-3">
          Suporte a arquivos ZIP em breve. Por enquanto, envie o arquivo .html diretamente.
        </p>
      </div>
      <input
        id="file-input"
        type="file"
        accept=".html"
        className="hidden"
        onChange={onInputChange}
      />
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const TicketsDashboard: React.FC = () => {
  const [dashData, setDashData] = useState<DashData | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    modulo: '',
    tipo: '',
    form: '',
    status: '',
    origem: '',
  });

  const handleData = useCallback((data: DashData, name: string) => {
    setDashData(data);
    setFileName(name);
    setError('');
    setFilters({ modulo: '', tipo: '', form: '', status: '', origem: '' });
    setShowAll(false);
  }, []);

  const handleError = useCallback((msg: string) => {
    setError(msg);
  }, []);

  const handleReset = useCallback(() => {
    setDashData(null);
    setFileName('');
    setError('');
    setShowAll(false);
  }, []);

  const setFilter = useCallback((key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setShowAll(false);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ modulo: '', tipo: '', form: '', status: '', origem: '' });
    setShowAll(false);
  }, []);

  const allTickets = dashData?.datasets.tickets.rows ?? [];

  const filteredTickets = useMemo(() => {
    return allTickets.filter((t) => {
      if (filters.modulo && t.modulo !== filters.modulo) return false;
      if (filters.tipo && t.tipo !== filters.tipo) return false;
      if (filters.form && t.form !== filters.form) return false;
      if (filters.status && t.status !== filters.status) return false;
      if (filters.origem && t.origem !== filters.origem) return false;
      return true;
    });
  }, [allTickets, filters]);

  const kpiN1 = useMemo(() => filteredTickets.filter((t) => t.grupo === 'N1').length, [filteredTickets]);
  const kpiN2 = useMemo(
    () => filteredTickets.filter((t) => t.grupo.startsWith('N2')).length,
    [filteredTickets],
  );
  const kpiN3 = useMemo(() => filteredTickets.filter((t) => t.grupo === 'N3').length, [filteredTickets]);

  const chartModulo = useMemo(() => countBy(filteredTickets, 'modulo'), [filteredTickets]);
  const chartTipo = useMemo(() => countBy(filteredTickets, 'tipo'), [filteredTickets]);
  const chartSub = useMemo(() => countBy(filteredTickets, 'submodulo').slice(0, 15), [filteredTickets]);
  const chartForm = useMemo(() => countBy(filteredTickets, 'form'), [filteredTickets]);

  const optModulos = useMemo(() => uniqueValues(allTickets, 'modulo'), [allTickets]);
  const optTipos = useMemo(() => uniqueValues(allTickets, 'tipo'), [allTickets]);
  const optForms = useMemo(() => uniqueValues(allTickets, 'form'), [allTickets]);
  const optStatus = useMemo(() => uniqueValues(allTickets, 'status'), [allTickets]);
  const optOrigens = useMemo(() => uniqueValues(allTickets, 'origem'), [allTickets]);

  const tableRows = showAll ? filteredTickets : filteredTickets.slice(0, 100);

  const selectClass =
    'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-[140px]';

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page title */}
        <div className="flex items-center gap-3">
          <BarChart2 className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-slate-800">Dashboard de Chamados</h2>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            <X className="w-4 h-4 shrink-0" />
            {error}
            <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {!dashData ? (
          /* ── Upload screen ── */
          <UploadArea onData={handleData} onError={handleError} />
        ) : (
          /* ── Dashboard ── */
          <>
            {/* Header bar */}
            <div className="flex flex-wrap items-center gap-3 rounded-2xl shadow-sm border border-slate-100 bg-white px-6 py-4">
              <span className="text-sm text-slate-500 flex-1 truncate">
                Arquivo: <strong className="text-slate-700">{fileName}</strong>
              </span>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Trocar arquivo
              </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KpiCard label="Total de Chamados" value={filteredTickets.length} />
              <KpiCard label="N1" value={kpiN1} color="text-green-600" />
              <KpiCard label="N2" value={kpiN2} color="text-yellow-600" />
              <KpiCard label="N3" value={kpiN3} color="text-red-600" />
            </div>

            {/* Filters */}
            <div className="rounded-2xl shadow-sm border border-slate-100 bg-white p-5">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">Módulo</label>
                  <select className={selectClass} value={filters.modulo} onChange={(e) => setFilter('modulo', e.target.value)}>
                    <option value="">Todos</option>
                    {optModulos.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">Tipo</label>
                  <select className={selectClass} value={filters.tipo} onChange={(e) => setFilter('tipo', e.target.value)}>
                    <option value="">Todos</option>
                    {optTipos.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">Formulário</label>
                  <select className={selectClass} value={filters.form} onChange={(e) => setFilter('form', e.target.value)}>
                    <option value="">Todos</option>
                    {optForms.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">Status</label>
                  <select className={selectClass} value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
                    <option value="">Todos</option>
                    {optStatus.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-600">Origem</label>
                  <select className={selectClass} value={filters.origem} onChange={(e) => setFilter('origem', e.target.value)}>
                    <option value="">Todas</option>
                    {optOrigens.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  Limpar filtros
                </button>
              </div>
            </div>

            {/* Charts row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <HBarChartCard title="Chamados por Módulo" data={chartModulo} color="#3b82f6" />
              <HBarChartCard title="Chamados por Tipo" data={chartTipo} color="#8b5cf6" />
            </div>

            {/* Charts row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <HBarChartCard title="Top 15 Submódulos" data={chartSub} maxItems={15} color="#10b981" />
              <HBarChartCard title="Por Formulário" data={chartForm} color="#f59e0b" />
            </div>

            {/* Ticket table */}
            <div className="rounded-2xl shadow-sm border border-slate-100 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-700">
                  Lista de Chamados{' '}
                  <span className="text-slate-400 font-normal">
                    ({filteredTickets.length} {filteredTickets.length === 1 ? 'chamado' : 'chamados'})
                  </span>
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Nº', 'Assunto', 'Módulo', 'Submódulo', 'Tipo', 'Status', 'Grupo', 'Unidade'].map((h) => (
                        <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide py-2 px-3 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center text-slate-400 py-10">
                          Nenhum chamado encontrado com os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      tableRows.map((t, i) => (
                        <tr
                          key={`${t.id}-${i}`}
                          className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                            i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                          }`}
                        >
                          <td className="py-2 px-3 font-mono text-xs text-slate-500 whitespace-nowrap">{t.id}</td>
                          <td className="py-2 px-3 text-slate-700 max-w-xs truncate" title={t.assunto}>{t.assunto || '—'}</td>
                          <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{t.modulo}</td>
                          <td className="py-2 px-3 text-slate-600 max-w-[180px] truncate" title={t.submodulo}>{t.submodulo}</td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              t.tipo === 'Incidente'
                                ? 'bg-red-100 text-red-700'
                                : t.tipo === 'Dúvida'
                                ? 'bg-blue-100 text-blue-700'
                                : t.tipo === 'Tarefa'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {t.tipo}
                            </span>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              t.status === 'Resolvido'
                                ? 'bg-green-100 text-green-700'
                                : t.status === 'Aberto'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              t.grupo === 'N1'
                                ? 'bg-green-100 text-green-700'
                                : t.grupo === 'N3'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {t.grupo}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-500 max-w-[180px] truncate text-xs" title={t.unidade}>{t.unidade || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {filteredTickets.length > 100 && !showAll && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowAll(true)}
                    className="px-5 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    Ver mais ({filteredTickets.length - 100} chamados restantes)
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default TicketsDashboard;
