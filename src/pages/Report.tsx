import { useState, useEffect, useRef } from 'react';
import Layout from '../components/layouts/Layout';
import { dashboardService, authService } from '../services/api';
import { Printer, Filter, TrendingUp, Wrench, Database, AlertCircle, Ticket } from 'lucide-react';

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
};

const translateStatus = (s: string) => TRANSLATIONS[s] || s;

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  const d = dateStr.length === 10 ? new Date(dateStr + 'T12:00:00') : new Date(dateStr);
  return d.toLocaleDateString('pt-BR');
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
              <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Nº</th>
              <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Título / Descrição</th>
              <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Analista</th>
              <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
              <th className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Abertura</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any) => (
              <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                <td className="px-4 py-2.5">
                  {item.external_url ? (
                    <a
                      href={item.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs font-bold text-primary-600 hover:underline print:text-slate-800 print:no-underline"
                    >
                      #{item.external_id || 'LINK'}
                    </a>
                  ) : (
                    <span className="font-mono text-xs text-slate-500">#{item.external_id || '—'}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 max-w-xs">
                  <span className="font-semibold text-slate-900 block truncate">
                    {item.title || item.description?.substring(0, 60) + '...' || '—'}
                  </span>
                  {item.title && item.description && (
                    <span className="text-xs text-slate-400 block truncate">{item.description}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                  {item.analyst?.name || '—'}
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 whitespace-nowrap">
                    {translateStatus(item.status)}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap text-xs">
                  {formatDate(item.opened_at || item.created_at)}
                </td>
              </tr>
            ))}
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

  const filterByAnalyst = (items: any[]) => {
    if (!selectedAnalyst) return items;
    return items.filter((i: any) => i.analyst?.name === selectedAnalyst);
  };

  const filterOpen = (items: any[]) =>
    filterByAnalyst(items).filter((i: any) => isOpen(i.status));

  const improvements = stats ? filterOpen(stats.lists.improvements) : [];
  const debts = stats ? filterOpen(stats.lists.debts) : [];
  const dataRequests = stats ? filterOpen(stats.lists.dataRequests) : [];

  const totalOpen = improvements.length + debts.length + dataRequests.length;

  const handlePrint = () => window.print();

  const handleApplyFilters = () => fetchData();

  return (
    <Layout>
      {/* Print styles — hidden in screen, visible in print */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #report-print-area, #report-print-area * { visibility: visible; }
          #report-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 24px; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Relatório Consolidado</h1>
            <p className="text-slate-500">Melhorias, Débitos Técnicos e Solicitações de Dados em aberto</p>
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
                <option value="">Todos os analistas</option>
                {analysts.map(a => (
                  <option key={a.id} value={a.name}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={handleApplyFilters}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all"
              >
                Aplicar
              </button>
              {(startDate || endDate || selectedAnalyst) && (
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); setSelectedAnalyst(''); fetchData(); }}
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
            <h1 className="text-2xl font-bold text-slate-900">Relatório Consolidado — TicketFlow</h1>
            <p className="text-sm text-slate-500 mt-1">
              {selectedAnalyst ? `Analista: ${selectedAnalyst}` : 'Todos os analistas'}
              {startDate || endDate ? ` · Período: ${startDate ? formatDate(startDate) : '...'} até ${endDate ? formatDate(endDate) : '...'}` : ''}
              {` · Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`}
            </p>
          </div>

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
                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total em Aberto</p>
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
                    title="Melhorias em Aberto"
                    icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
                    color="border-emerald-100"
                    items={improvements}
                  />
                )}
                {(selectedType === 'ALL' || selectedType === 'DEBTS') && (
                  <SectionTable
                    title="Débitos Técnicos em Aberto"
                    icon={<Wrench className="w-4 h-4 text-amber-600" />}
                    color="border-amber-100"
                    items={debts}
                  />
                )}
                {(selectedType === 'ALL' || selectedType === 'DATA_REQUESTS') && (
                  <SectionTable
                    title="Solicitações de Dados em Aberto"
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
