import { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import Layout from '../components/layouts/Layout';
import { TrendingUp, AlertCircle, CheckCircle2, Database } from 'lucide-react';
import { dashboardService } from '../services/api';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filterAnalyst, setFilterAnalyst] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOrganization, setFilterOrganization] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterSubmodule, setFilterSubmodule] = useState('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await dashboardService.getStats(startDate || undefined, endDate || undefined);
      setStats(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [startDate, endDate]);

  if (loading || !stats) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64 text-slate-500 italic">
          Carregando indicadores...
        </div>
      </Layout>
    );
  }

  const translateStatus = (status: string) => TRANSLATIONS[status] || status;
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    // DATE fields (YYYY-MM-DD) from PostgreSQL are treated as UTC midnight.
    // Adding T12:00:00 avoids the timezone shift (e.g. UTC-3 showing previous day).
    const d = dateStr.length === 10 ? new Date(dateStr + 'T12:00:00') : new Date(dateStr);
    return d.toLocaleDateString('pt-BR');
  };

  const statusPieData = [
    ...stats.byStatus.improvements.map((s: any) => ({ name: `M: ${translateStatus(s.status)}`, value: s._count })),
    ...stats.byStatus.debts.map((s: any) => ({ name: `D: ${translateStatus(s.status)}`, value: s._count })),
    ...stats.byStatus.dataRequests.map((s: any) => ({ name: `DR: ${translateStatus(s.status)}`, value: s._count })),
  ];

  const analystBarData = stats.byAnalyst.map((a: any) => ({
    name: a.name,
    improvements: a._count.improvements,
    debts: a._count.debts,
    dataRequests: a._count.dataRequests
  }));

  const cards = [
    { id: 'improvements', label: 'Total Melhorias', value: stats.totals.improvements, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'debts', label: 'Total Débitos', value: stats.totals.debts, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'data-requests', label: 'Total de solicitações realizadas para dados', value: stats.totals.dataRequests, icon: Database, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'all', label: 'Total Geral', value: stats.totals.grandTotal, icon: CheckCircle2, color: 'text-primary-600', bg: 'bg-primary-50' },
  ];

  const getSelectedData = () => {
    if (selectedCategory === 'improvements') return stats.lists.improvements.map((item: any) => ({ ...item, type: 'Melhoria' }));
    if (selectedCategory === 'debts') return stats.lists.debts.map((item: any) => ({ ...item, type: 'Débito' }));
    if (selectedCategory === 'data-requests') return stats.lists.dataRequests.map((item: any) => ({ ...item, type: 'Dados' }));
    if (selectedCategory === 'all') {
      return [
        ...stats.lists.improvements.map((item: any) => ({ ...item, type: 'Melhoria' })),
        ...stats.lists.debts.map((item: any) => ({ ...item, type: 'Débito' })),
        ...stats.lists.dataRequests.map((item: any) => ({ ...item, type: 'Dados' }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return [];
  };

  const rawSelectedData = getSelectedData();

  const selectedData = rawSelectedData.filter((item: any) => {
    const analystMatch = !filterAnalyst || item.analyst?.name === filterAnalyst;
    const statusMatch = !filterStatus || item.status === filterStatus;
    const orgMatch = !filterOrganization || (item.organization && item.organization.toLowerCase().includes(filterOrganization.toLowerCase()));
    const moduleMatch = !filterModule || (item.module && item.module.toLowerCase().includes(filterModule.toLowerCase()));
    const submoduleMatch = !filterSubmodule || (item.submodule && item.submodule.toLowerCase().includes(filterSubmodule.toLowerCase()));
    return analystMatch && statusMatch && orgMatch && moduleMatch && submoduleMatch;
  });

  const availableStatuses = [...new Set(rawSelectedData.map((item: any) => item.status))];
  const allAnalysts = stats.byAnalyst.map((a: any) => a.name);

  return (
    <Layout>
      <div className="space-y-8 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500">Indicadores de desempenho e fluxo técnico</p>
          </div>

          <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">De</label>
              <input 
                type="date" 
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="text-sm border-none focus:ring-0 text-slate-600 bg-transparent"
              />
            </div>
            <div className="w-px h-4 bg-slate-100" />
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Até</label>
              <input 
                type="date" 
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="text-sm border-none focus:ring-0 text-slate-600 bg-transparent"
              />
            </div>
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-[10px] font-bold text-primary-600 hover:text-primary-700 px-2"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {cards.map((stat) => (
            <button 
              key={stat.id} 
              onClick={() => setSelectedCategory(selectedCategory === stat.id ? null : stat.id)}
              className={`bg-white p-6 rounded-2xl shadow-sm border transition-all text-left flex items-center gap-4 hover:scale-[1.02] active:scale-[0.98] ${
                selectedCategory === stat.id ? 'ring-2 ring-primary-500 border-primary-500' : 'border-slate-100'
              }`}
            >
              <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Analyst Performance Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-6 font-primary">Desempenho por Analista</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analystBarData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" />
                  <Bar dataKey="improvements" name="Melhorias" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="debts" name="Débitos" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="dataRequests" name="Dados" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Distribution Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-slate-900 mb-6 font-primary">Distribuição por Status</h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusPieData.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Drill-down Details Table */}
        {selectedCategory && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-in slide-in-from-bottom duration-500">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-slate-900">
                  Detalhes: {cards.find(c => c.id === selectedCategory)?.label}
                </h2>
                <div className="flex items-center flex-wrap gap-2">
                  <select
                    value={filterAnalyst}
                    onChange={e => setFilterAnalyst(e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                  >
                    <option value="">Todos os analistas</option>
                    {allAnalysts.map((name: string) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                  >
                    <option value="">Todos os status</option>
                    {availableStatuses.map((s: any) => (
                      <option key={s} value={s}>{translateStatus(s)}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Organização"
                    value={filterOrganization}
                    onChange={e => setFilterOrganization(e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 focus:ring-2 focus:ring-primary-500 outline-none bg-white w-32"
                  />
                  <input
                    type="text"
                    placeholder="Módulo"
                    value={filterModule}
                    onChange={e => setFilterModule(e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 focus:ring-2 focus:ring-primary-500 outline-none bg-white w-24"
                  />
                  <input
                    type="text"
                    placeholder="Submódulo"
                    value={filterSubmodule}
                    onChange={e => setFilterSubmodule(e.target.value)}
                    className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 focus:ring-2 focus:ring-primary-500 outline-none bg-white w-28"
                  />
                  {(filterAnalyst || filterStatus || filterOrganization || filterModule || filterSubmodule) && (
                    <button
                      onClick={() => { setFilterAnalyst(''); setFilterStatus(''); setFilterOrganization(''); setFilterModule(''); setFilterSubmodule(''); }}
                      className="text-xs font-bold text-primary-600 hover:text-primary-700 px-2 py-1.5"
                    >
                      Limpar filtros
                    </button>
                  )}
                  <button
                    onClick={() => { setSelectedCategory(null); setFilterAnalyst(''); setFilterStatus(''); setFilterOrganization(''); setFilterModule(''); setFilterSubmodule(''); }}
                    className="text-sm font-bold text-slate-400 hover:text-slate-600"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Número</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Título / Descrição</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Analista</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Criado em</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                        Nenhum registro encontrado para este período e categoria.
                      </td>
                    </tr>
                  ) : (
                    selectedData.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                        <td className="px-6 py-4">
                          {item.external_url ? (
                            <a 
                              href={item.external_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="font-mono text-xs font-bold bg-primary-50 px-2 py-1 rounded text-primary-600 hover:bg-primary-100 transition-colors flex items-center gap-1 w-fit"
                              title="Abrir link externo"
                            >
                              #{item.external_id || '---'}
                              <TrendingUp className="w-3 h-3 inline ml-1" />
                            </a>
                          ) : (
                            <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-600">
                              #{item.external_id || '---'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-600">{item.type}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-slate-900 block">{item.title || item.description?.substring(0, 50) + '...'}</span>
                          {item.title && <span className="text-xs text-slate-500 block truncate max-w-xs">{item.description}</span>}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {item.analyst?.name || 'Não atribuído'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                            {translateStatus(item.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {formatDate(item.opened_at || item.created_at)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
