import { useState, useEffect, useRef, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Layout from '../components/layouts/Layout';
import { dashboardService, authService } from '../services/api';
import { Printer, Filter, TrendingUp, Wrench, Database, AlertCircle, Ticket, ExternalLink } from 'lucide-react';
import EntityAutocompleteSearch from '../components/EntityAutocompleteSearch';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

const TRANSLATIONS: Record<string, string> = {
  'PENDING': 'Pendente',
  'OPEN': 'Aberto',
  'ON_HOLD': 'Em Espera',
  'FINISHED': 'Finalizado',
  'CONVERTED_TO_IMPROVEMENT': 'Virou Melhoria',
  'CONVERTED_TO_DEBT': 'Virou Débito',
  'IN_PROGRESS': 'Em Desenv.',
  'IN_TEST': 'Em Teste',
  'IN_CORRECTION': 'Em Correção',
  'RESOLVED': 'Resolvido',
  'CANCELED': 'Cancelada',
};

const translateStatus = (s: string) => TRANSLATIONS[s] || s;

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  const d = dateStr.length === 10 ? new Date(dateStr + 'T12:00:00') : new Date(dateStr);
  return d.toLocaleDateString('pt-BR');
};

const formatUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const OPEN_STATUSES = new Set([
  'PENDING', 'OPEN', 'ON_HOLD', 'IN_PROGRESS', 'IN_TEST', 'IN_CORRECTION',
]);

const isOpen = (status: string) => OPEN_STATUSES.has(status);

interface SectionTableProps {
  title: string;
  icon: React.ReactNode;
  color: string;
  items: any[];
}

function SectionTable({ title, icon, color, items }: SectionTableProps) {
  if (items.length === 0) return (
    <div className={`rounded-xl border ${color} p-4 print:p-2`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="font-bold text-slate-800">{title}</h3>
        <span className="ml-auto text-xs font-bold text-slate-500">0 itens</span>
      </div>
      <p className="text-sm text-slate-400 italic">Nenhum item encontrado.</p>
    </div>
  );

  const hasTitleColumn = items.some((i: any) => i.title);

  return (
    <div className={`rounded-xl border ${color} overflow-hidden print:break-inside-avoid`}>
      <div className="flex items-center gap-2 px-5 py-3 bg-slate-50/80 border-b border-slate-100">
        {icon}
        <h3 className="font-bold text-slate-800">{title}</h3>
        <span className="ml-auto text-xs font-bold bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-600">
          {items.length} {items.length === 1 ? 'item' : 'itens'}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-white">
              <th className="px-4 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Nº</th>
              {hasTitleColumn && (
                <th className="px-4 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Título</th>
              )}
              <th className="px-4 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Descrição</th>
              {!hasTitleColumn && (
                <th className="px-4 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Origem</th>
              )}
              <th className="px-4 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Responsáveis</th>
              <th className="px-4 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Analista</th>
              <th className="px-4 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Status</th>
              <th className="px-4 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Abertura</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any) => {
              const formattedLink = formatUrl(item.external_url);
              return (
                <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                  <td className="px-4 py-2.5 whitespace-nowrap align-top">
                    {formattedLink ? (
                      <a
                        href={formattedLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs font-bold text-blue-600 hover:text-blue-800 underline print:text-blue-600 print:underline inline-flex items-center gap-1 cursor-pointer"
                        title={formattedLink}
                      >
                        #{item.external_id || 'LINK'}
                        <ExternalLink className="w-2.5 h-2.5 opacity-60 no-print" />
                      </a>
                    ) : (
                      <span className="font-mono text-xs text-slate-500">#{item.external_id || '—'}</span>
                    )}
                  </td>
                  {hasTitleColumn && (
                    <td className="px-4 py-2.5 align-top min-w-[140px] max-w-[200px]">
                      <span className="font-semibold text-slate-900 text-xs sm:text-sm block">
                        {item.title || '—'}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-2.5 align-top min-w-[200px] max-w-md">
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line break-words">
                      {item.description || '—'}
                    </p>
                  </td>
                  {!hasTitleColumn && (
                    <td className="px-4 py-2.5 whitespace-nowrap align-top">
                      <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-bold">
                        {item.origin_type || 'MANUAL'}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-2.5 text-xs text-slate-600 whitespace-nowrap align-top">
                    {item.responsible && (
                      <div className="truncate max-w-[140px]" title={`Responsável: ${item.responsible}`}>
                        <span className="font-semibold text-slate-400">Dev:</span> {item.responsible}
                      </div>
                    )}
                    {item.pm_responsible && (
                      <div className="truncate max-w-[140px]" title={`PM: ${item.pm_responsible}`}>
                        <span className="font-semibold text-primary-500">PM:</span> {item.pm_responsible}
                      </div>
                    )}
                    {item.requester && (
                      <div className="truncate max-w-[140px]" title={`Solicitante: ${item.requester}`}>
                        <span className="font-semibold text-slate-400">Sol:</span> {item.requester}
                      </div>
                    )}
                    {!item.responsible && !item.pm_responsible && !item.requester && (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap align-top">
                    {item.analyst?.name || '—'}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap align-top">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 whitespace-nowrap">
                      {translateStatus(item.status)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap text-xs align-top">
                    {formatDate(item.opened_at || item.created_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Report() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [analysts, setAnalysts] = useState<{ id: string; name: string }[]>([]);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedAnalyst, setSelectedAnalyst] = useState('');
  const [filterOrganization, setFilterOrganization] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterSubmodule, setFilterSubmodule] = useState('');
  const [selectedType, setSelectedType] = useState<'ALL' | 'TICKETS' | 'IMPROVEMENTS' | 'DEBTS' | 'DATA_REQUESTS'>('ALL');

  const printRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await dashboardService.getStats(startDate || undefined, endDate || undefined);
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalysts = async () => {
    try {
      const list = await authService.getAnalysts();
      setAnalysts(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
    fetchAnalysts();
  }, []);

  const filterByAdvanced = (items: any[]) => {
    return items.filter((i: any) => {
      const matchAnalyst = !selectedAnalyst || i.analyst?.name === selectedAnalyst;
      const matchOrganization = !filterOrganization || (i.organization && i.organization.toLowerCase().includes(filterOrganization.toLowerCase()));
      const matchStatus = !filterStatus || i.status === filterStatus;
      const matchModule = !filterModule || (i.module && i.module.toLowerCase().includes(filterModule.toLowerCase()));
      const matchSubmodule = !filterSubmodule || (i.submodule && i.submodule.toLowerCase().includes(filterSubmodule.toLowerCase()));
      return matchAnalyst && matchOrganization && matchStatus && matchModule && matchSubmodule;
    });
  };

  const filterOpen = (items: any[]) =>
    filterByAdvanced(items).filter((i: any) => !filterStatus ? isOpen(i.status) : true);

  const improvements = stats ? filterOpen(stats.lists.improvements) : [];
  const debts = stats ? filterOpen(stats.lists.debts) : [];
  const dataRequests = stats ? filterOpen(stats.lists.dataRequests) : [];

  const totalOpen = improvements.length + debts.length + dataRequests.length;

  // Module/submodule distribution for pie chart
  const moduleChartData = useMemo(() => {
    const allItems = [...improvements, ...debts, ...dataRequests];
    const counts: Record<string, number> = {};
    allItems.forEach((item: any) => {
      const mod = item.module?.trim() || null;
      const sub = item.submodule?.trim() || null;
      const key = mod ? (sub ? `${mod} › ${sub}` : mod) : 'Sem módulo';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [improvements, debts, dataRequests]);

  const handlePrint = () => window.print();

  const handleApplyFilters = () => fetchData();

  return (
    <Layout>
      {/* Print styles */}
      <style>{`
        @media print {
          @page {
            margin: 10mm;
            size: auto;
          }
          .no-print {
            display: none !important;
          }
          a[href] {
            color: #2563eb !important;
            text-decoration: underline !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #report-print-area {
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          svg, svg * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Relatório Consolidado{filterOrganization ? ` — ${filterOrganization}` : ''}
            </h1>
            <p className="text-slate-500">Melhorias, Débitos Técnicos e Solicitações de Dados</p>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl font-semibold shadow transition-all active:scale-[0.98]"
          >
            <Printer className="w-5 h-5" />
            Imprimir / PDF
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 no-print">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-bold text-slate-600">Filtros</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">De</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Até</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Analista</label>
              <select
                value={selectedAnalyst}
                onChange={e => setSelectedAnalyst(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white"
              >
                <option value="">Todos</option>
                {analysts.map(a => (
                  <option key={a.id} value={a.name}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Organização</label>
              <EntityAutocompleteSearch
                value={filterOrganization}
                onChange={setFilterOrganization}
                placeholder="Buscar organização cadastrada..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Status</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white"
              >
                <option value="">Status em Aberto</option>
                {Object.keys(TRANSLATIONS).map(k => (
                  <option key={k} value={k}>{TRANSLATIONS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Módulo</label>
              <input
                type="text"
                placeholder="Módulo"
                value={filterModule}
                onChange={e => setFilterModule(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Submódulo</label>
              <input
                type="text"
                placeholder="Submódulo"
                value={filterSubmodule}
                onChange={e => setFilterSubmodule(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleApplyFilters}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all"
              >
                Aplicar
              </button>
              {(startDate || endDate || selectedAnalyst || filterOrganization || filterStatus || filterModule || filterSubmodule) && (
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); setSelectedAnalyst(''); setFilterOrganization(''); setFilterStatus(''); setFilterModule(''); setFilterSubmodule(''); fetchData(); }}
                  className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Print Area */}
        <div id="report-print-area" ref={printRef}>
          {/* Print Header */}
          <div className="hidden print:block mb-6 border-b pb-4">
            <h1 className="text-2xl font-bold text-slate-900">
              Relatório Consolidado — {filterOrganization || 'Todas as Organizações'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {startDate || endDate
                ? `Período: ${startDate ? formatDate(startDate) : 'início'} até ${endDate ? formatDate(endDate) : 'hoje'}`
                : 'Período: Todos os registros'}
              {selectedAnalyst ? ` · Analista: ${selectedAnalyst}` : ''}
              {` · Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`}
            </p>
          </div>

          {/* Module/Submodule Pie Chart */}
          {moduleChartData.length > 0 && (
            <div className="mb-6 bg-white rounded-2xl border border-slate-100 p-5 print:border print:rounded-lg">
              <h2 className="text-lg font-bold text-slate-800 mb-1">Incidência por Módulo / Submódulo</h2>
              <p className="text-xs text-slate-400 mb-4">
                Total de {improvements.length + debts.length + dataRequests.length} demandas no período filtrado
              </p>
              <div style={{ width: '100%', height: 340 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={moduleChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      dataKey="value"
                      label={({ name, value, percent }) =>
                        `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                      }
                      labelLine={true}
                    >
                      {moduleChartData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value} demandas`, 'Total']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {loading ? (
            <div className="p-16 text-center text-slate-400">Carregando relatório...</div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
                <div 
                  onClick={() => setSelectedType('ALL')}
                  className={`bg-white border rounded-2xl p-5 print:shadow-none print:border print:rounded-lg cursor-pointer transition-all ${selectedType === 'ALL' ? 'ring-2 ring-primary-500 border-primary-500 shadow-md' : 'border-slate-100 shadow-sm hover:border-slate-300'}`}
                >
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total</p>
                  <p className="text-3xl font-bold text-slate-900">{totalOpen}</p>
                </div>
                <div 
                  onClick={() => setSelectedType(prev => prev === 'IMPROVEMENTS' ? 'ALL' : 'IMPROVEMENTS')}
                  className={`bg-emerald-50 border rounded-2xl p-5 print:shadow-none print:border print:rounded-lg cursor-pointer transition-all ${selectedType === 'IMPROVEMENTS' ? 'ring-2 ring-emerald-500 border-emerald-500 shadow-md' : 'border-emerald-100 shadow-sm hover:border-emerald-300'}`}
                >
                  <p className="text-xs font-bold text-emerald-600 uppercase mb-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Melhorias
                  </p>
                  <p className="text-3xl font-bold text-emerald-700">{improvements.length}</p>
                </div>
                <div 
                  onClick={() => setSelectedType(prev => prev === 'DEBTS' ? 'ALL' : 'DEBTS')}
                  className={`bg-amber-50 border rounded-2xl p-5 print:shadow-none print:border print:rounded-lg cursor-pointer transition-all ${selectedType === 'DEBTS' ? 'ring-2 ring-amber-500 border-amber-500 shadow-md' : 'border-amber-100 shadow-sm hover:border-amber-300'}`}
                >
                  <p className="text-xs font-bold text-amber-600 uppercase mb-1 flex items-center gap-1">
                    <Wrench className="w-3 h-3" /> Débitos
                  </p>
                  <p className="text-3xl font-bold text-amber-700">{debts.length}</p>
                </div>
                <div 
                  onClick={() => setSelectedType(prev => prev === 'DATA_REQUESTS' ? 'ALL' : 'DATA_REQUESTS')}
                  className={`bg-indigo-50 border rounded-2xl p-5 print:shadow-none print:border print:rounded-lg cursor-pointer transition-all ${selectedType === 'DATA_REQUESTS' ? 'ring-2 ring-indigo-500 border-indigo-500 shadow-md' : 'border-indigo-100 shadow-sm hover:border-indigo-300'}`}
                >
                  <p className="text-xs font-bold text-indigo-600 uppercase mb-1 flex items-center gap-1">
                    <Database className="w-3 h-3" /> Dados
                  </p>
                  <p className="text-3xl font-bold text-indigo-700">{dataRequests.length}</p>
                </div>
              </div>

              {/* Tables */}
              <div className="space-y-6">
                {(selectedType === 'ALL' || selectedType === 'IMPROVEMENTS') && (
                  <SectionTable
                    title="Melhorias"
                    icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
                    color="border-emerald-100"
                    items={improvements}
                  />
                )}
                {(selectedType === 'ALL' || selectedType === 'DEBTS') && (
                  <SectionTable
                    title="Débitos Técnicos"
                    icon={<Wrench className="w-4 h-4 text-amber-600" />}
                    color="border-amber-100"
                    items={debts}
                  />
                )}
                {(selectedType === 'ALL' || selectedType === 'DATA_REQUESTS') && (
                  <SectionTable
                    title="Solicitações de Dados"
                    icon={<Database className="w-4 h-4 text-indigo-600" />}
                    color="border-indigo-100"
                    items={dataRequests}
                  />
                )}
              </div>

              {totalOpen === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <AlertCircle className="w-12 h-12 mb-3 opacity-30" />
                  <p className="text-lg font-semibold">Nenhum item em aberto encontrado</p>
                  <p className="text-sm">Tente ajustar os filtros aplicados</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
