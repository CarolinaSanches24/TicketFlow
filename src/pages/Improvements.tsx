import { useState, useMemo, useEffect } from 'react';
import Layout from '../components/layouts/Layout';
import { 
  flexRender, 
  getCoreRowModel, 
  useReactTable, 
  createColumnHelper 
} from '@tanstack/react-table';
import { useUser } from '../contexts/UserContext';
import { improvementService, authService } from '../services/api';
import { useSearchParams } from 'react-router-dom';
import EntityAutocompleteSearch from '../components/EntityAutocompleteSearch';
import EmployeeAutocompleteSearch from '../components/EmployeeAutocompleteSearch';
import ModuleAutocompleteSearch from '../components/ModuleAutocompleteSearch';
import { Plus, Search, User as UserIcon, Calendar, CheckCircle2, Clock, PlayCircle, Beaker, AlertTriangle, Eye, EyeOff, Edit2, Trash2, TrendingUp, Ban } from 'lucide-react';

interface Improvement {
  id: string;
  external_id: string | null;
  external_url: string | null;
  title: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'IN_TEST' | 'FINISHED' | 'CONVERTED_TO_DEBT' | 'CANCELED';
  analyst_id: string | null;
  analyst?: { name: string };
  organization?: string | null;
  module?: string | null;
  submodule?: string | null;
  responsible?: string | null;
  pm_responsible?: string | null;
  requester?: string | null;
  opened_at: string | null;
  created_at: string;
}

const columnHelper = createColumnHelper<Improvement>();

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  'OPEN': { label: 'Aberta', color: 'bg-blue-100 text-blue-700', icon: PlayCircle },
  'IN_PROGRESS': { label: 'Em Desenv.', color: 'bg-indigo-100 text-indigo-700', icon: Clock },
  'IN_TEST': { label: 'Em Teste', color: 'bg-purple-100 text-purple-700', icon: Beaker },
  'FINISHED': { label: 'Finalizada', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  'CONVERTED_TO_DEBT': { label: 'Débito Técnico', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  'CANCELED': { label: 'Cancelada', color: 'bg-slate-100 text-slate-700', icon: Ban },
};

export default function Improvements() {
  const { user } = useUser();
  const [data, setData] = useState<Improvement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showClosed, setShowClosed] = useState(false);

  // Advanced Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAnalyst, setFilterAnalyst] = useState('');
  const [filterOrg, setFilterOrg] = useState('');
  const [filterNumber, setFilterNumber] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Creation Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysts, setAnalysts] = useState<{id: string, name: string}[]>([]);
  const [newItem, setNewItem] = useState({
    external_id: '',
    external_url: '',
    title: '',
    description: '',
    analystId: '',
    organization: '',
    opened_at: '',
    module: '',
    submodule: '',
    status: 'OPEN' as Improvement['status'],
    responsible: '',
    pm_responsible: '',
    requester: ''
  });

  // Edit/Delete States
  const [editingItem, setEditingItem] = useState<Improvement | null>(null);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const items = await improvementService.getAll();
      setData(items);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalysts = async () => {
    try {
      const data = await authService.getAnalysts();
      setAnalysts(data);
    } catch (error) {
      console.error('Error fetching analysts:', error);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchAnalysts();
  }, []);

  const handleCreateImprovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.title) return;

    try {
      setIsSubmitting(true);
      await improvementService.create({
        external_id: newItem.external_id || null,
        external_url: newItem.external_url || null,
        title: newItem.title,
        description: newItem.description,
        analyst_id: newItem.analystId || null,
        organization: newItem.organization || null,
        opened_at: newItem.opened_at || null,
        module: newItem.module || null,
        submodule: newItem.submodule || null,
        status: newItem.status || 'OPEN',
        responsible: newItem.responsible || null,
        pm_responsible: newItem.pm_responsible || null,
        requester: newItem.requester || null
      });
      
      setIsModalOpen(false);
      setNewItem({ 
        external_id: '', external_url: '', title: '', description: '', 
        analystId: '', organization: '', opened_at: '', module: '', submodule: '',
        status: 'OPEN', responsible: '', pm_responsible: '', requester: ''
      });
      fetchItems();
    } catch (error) {
      alert('Erro ao criar melhoria');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await improvementService.updateStatus(id, newStatus);
      fetchItems();
    } catch (error) {
      alert('Erro ao atualizar status');
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.title) return;

    try {
      setIsSubmitting(true);
      await improvementService.update(editingItem.id, {
        external_id: editingItem.external_id,
        external_url: editingItem.external_url,
        title: editingItem.title,
        description: editingItem.description,
        analyst_id: editingItem.analyst_id,
        organization: editingItem.organization,
        opened_at: editingItem.opened_at,
        module: editingItem.module,
        submodule: editingItem.submodule,
        status: editingItem.status,
        responsible: editingItem.responsible || null,
        pm_responsible: editingItem.pm_responsible || null,
        requester: editingItem.requester || null
      });
      setEditingItem(null);
      fetchItems();
    } catch (error) {
      alert('Erro ao atualizar melhoria');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta melhoria?')) return;
    try {
      await improvementService.delete(id);
      fetchItems();
    } catch (error) {
      alert('Erro ao excluir melhoria');
    }
  };

  const columns = useMemo(() => [
    columnHelper.accessor('external_id', {
      header: 'Nº',
      cell: info => {
        const item = info.row.original;
        if (item.external_url) {
          return (
            <a 
              href={item.external_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-mono text-xs font-bold bg-primary-50 px-2 py-0.5 rounded text-primary-600 hover:bg-primary-100 transition-colors inline-flex items-center gap-1 whitespace-nowrap"
              title="Abrir no sistema externo"
            >
              #{info.getValue() || 'LINK'}
              <TrendingUp className="w-2.5 h-2.5" />
            </a>
          );
        }
        return <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600 whitespace-nowrap">#{info.getValue() || '---'}</span>;
      },
    }),
    columnHelper.accessor('title', {
      header: 'Título',
      cell: info => (
        <div className="min-w-[150px] max-w-[240px]">
          <span className="font-semibold text-slate-900 text-xs sm:text-sm block truncate" title={info.getValue()}>
            {info.getValue()}
          </span>
          {info.row.original.description && (
            <span className="text-xs text-slate-400 block truncate" title={info.row.original.description}>
              {info.row.original.description}
            </span>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('analyst.name', {
      header: 'Analista',
      cell: info => (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <div className="w-5 h-5 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
            <UserIcon className="w-3 h-3 text-primary-600" />
          </div>
          <span className="text-xs text-slate-700 truncate max-w-[110px]" title={info.getValue() || 'Não atribuído'}>
            {info.getValue() || 'Não atribuído'}
          </span>
        </div>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => {
        const val = info.getValue();
        const config = statusConfig[val] || statusConfig['OPEN'];
        const Icon = config.icon;
        return (
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap ${config.color}`}>
            <Icon className="w-3 h-3 flex-shrink-0" />
            {config.label}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: 'responsibles',
      header: 'Responsáveis',
      cell: info => {
        const item = info.row.original;
        if (!item.responsible && !item.pm_responsible && !item.requester) {
          return <span className="text-xs text-slate-300">—</span>;
        }
        return (
          <div className="text-[11px] leading-snug space-y-0.5 whitespace-nowrap">
            {item.responsible && (
              <div className="text-slate-700 truncate max-w-[130px]" title={`Dev: ${item.responsible}`}>
                <span className="font-semibold text-slate-400">Dev:</span> {item.responsible}
              </div>
            )}
            {item.pm_responsible && (
              <div className="text-slate-700 truncate max-w-[130px]" title={`PM: ${item.pm_responsible}`}>
                <span className="font-semibold text-primary-600">PM:</span> {item.pm_responsible}
              </div>
            )}
            {item.requester && (
              <div className="text-slate-500 truncate max-w-[130px]" title={`Sol: ${item.requester}`}>
                <span className="font-semibold text-slate-400">Sol:</span> {item.requester}
              </div>
            )}
          </div>
        );
      },
    }),
    columnHelper.display({
      id: 'opened_at_col',
      header: 'Abertura',
      cell: (info) => {
        const item = info.row.original;
        const raw = item.opened_at || item.created_at;
        const d = raw.length === 10 ? new Date(raw + 'T12:00:00') : new Date(raw);
        return (
          <div className="flex items-center gap-1 text-slate-500 whitespace-nowrap text-xs">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span>{d.toLocaleDateString('pt-BR')}</span>
          </div>
        );
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Ações',
      cell: (info) => {
        const item = info.row.original;
        const isClosed = ['FINISHED', 'CONVERTED_TO_DEBT', 'CANCELED'].includes(item.status);
        
        return (
          <div className="flex items-center justify-end gap-1 whitespace-nowrap">
             {!isClosed && (
               <>
                 {item.status === 'OPEN' && (
                   <button onClick={() => handleStatusUpdate(item.id, 'IN_PROGRESS')} className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded transition-colors whitespace-nowrap">Iniciar</button>
                 )}
                 {item.status === 'IN_PROGRESS' && (
                   <button onClick={() => handleStatusUpdate(item.id, 'IN_TEST')} className="px-2 py-1 text-xs font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 rounded transition-colors whitespace-nowrap">Testar</button>
                 )}
                 {item.status === 'IN_TEST' && (
                   <button onClick={() => handleStatusUpdate(item.id, 'FINISHED')} className="px-2 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded transition-colors whitespace-nowrap">Finalizar</button>
                 )}
                 <button onClick={() => handleStatusUpdate(item.id, 'CONVERTED_TO_DEBT')} className="px-1.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition-colors whitespace-nowrap" title="Converter em Débito Técnico">Débito</button>
                 <button onClick={() => handleStatusUpdate(item.id, 'CANCELED')} className="px-1.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded transition-colors whitespace-nowrap" title="Cancelar melhoria">Cancelar</button>
                 <div className="w-px h-3.5 bg-slate-200 mx-0.5" />
               </>
             )}

             <button 
               onClick={() => setEditingItem(item)}
               className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
               title="Editar"
             >
               <Edit2 className="w-3.5 h-3.5" />
             </button>

             <button 
               onClick={() => handleDeleteItem(item.id)}
               className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
               title="Excluir"
             >
               <Trash2 className="w-3.5 h-3.5" />
             </button>
          </div>
        );
      },
    }),
  ], []);

  const filteredData = useMemo(() => {
    return data.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           t.analyst?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const isClosed = ['FINISHED', 'CONVERTED_TO_DEBT', 'CANCELED'].includes(t.status);
      
      const matchesAnalyst = !filterAnalyst || t.analyst_id === filterAnalyst;
      const matchesOrg = !filterOrg || (t.organization && t.organization.toLowerCase().includes(filterOrg.toLowerCase()));
      const matchesNumber = !filterNumber || (t.external_id && t.external_id.toLowerCase().includes(filterNumber.toLowerCase()));
      const matchesStatus = !filterStatus || t.status === filterStatus;
      
      let matchesDate = true;
      if (filterStartDate || filterEndDate) {
        const dateToCompare = t.opened_at || t.created_at;
        const d = new Date(dateToCompare);
        if (filterStartDate) matchesDate = matchesDate && d >= new Date(filterStartDate);
        if (filterEndDate) {
          const end = new Date(filterEndDate);
          end.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && d <= end;
        }
      }

      const matchesFilters = matchesAnalyst && matchesOrg && matchesNumber && matchesDate && matchesStatus;
      
      if (filterStatus) return matchesSearch && matchesFilters;
      if (showClosed) return matchesSearch && matchesFilters;
      return matchesSearch && !isClosed && matchesFilters;
    });
  }, [data, searchTerm, showClosed, filterAnalyst, filterOrg, filterNumber, filterStatus, filterStartDate, filterEndDate]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Melhorias</h1>
            <p className="text-slate-500">Evolução contínua do sistema</p>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg shadow-primary-100 transition-all active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            Nova Melhoria
          </button>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar melhorias..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm"
              />
            </div>
  
            <button
              onClick={() => setShowClosed(!showClosed)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium text-sm whitespace-nowrap ${
                showClosed 
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
                  : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
              }`}
            >
              {showClosed ? (
                <><EyeOff className="w-4 h-4" /> Ocultar Finalizadas</>
              ) : (
                <><Eye className="w-4 h-4" /> Ver Finalizadas</>
              )}
            </button>
          </div>

          {/* Advanced Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3 border-t border-slate-100 relative z-20">
            <div>
              <input 
                type="text" 
                placeholder="Número (ex: 123)"
                value={filterNumber}
                onChange={(e) => setFilterNumber(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-xs"
              />
            </div>
            <div>
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-xs bg-white"
              >
                <option value="">Todos os Status</option>
                {Object.entries(statusConfig).map(([val, config]) => (
                  <option key={val} value={val}>{config.label}</option>
                ))}
              </select>
            </div>
            <div>
              <select 
                value={filterAnalyst}
                onChange={(e) => setFilterAnalyst(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-xs bg-white"
              >
                <option value="">Todos Analistas</option>
                {analysts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="relative">
              <EntityAutocompleteSearch 
                value={filterOrg}
                onChange={setFilterOrg}
                placeholder="Organização..."
                allowCreate={false}
                className="w-full pl-3 pr-8 py-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-xs bg-white"
              />
            </div>
            <div className="flex items-center gap-1.5 lg:col-span-2">
              <input 
                type="date" 
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-xs"
                title="Data inicial"
              />
              <span className="text-slate-400 text-xs">até</span>
              <input 
                type="date" 
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="flex-1 min-w-0 px-2 py-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-xs"
                title="Data final"
              />
              {(filterNumber || filterStatus || filterAnalyst || filterOrg || filterStartDate || filterEndDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterNumber('');
                    setFilterStatus('');
                    setFilterAnalyst('');
                    setFilterOrg('');
                    setFilterStartDate('');
                    setFilterEndDate('');
                  }}
                  className="px-2 py-1.5 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200 transition-colors whitespace-nowrap"
                  title="Limpar filtros"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Carregando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id} className="border-b border-slate-100 bg-slate-50/50">
                      {headerGroup.headers.map(header => (
                        <th key={header.id} className="px-3.5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-50 last:border-0">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-3.5 py-2.5">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
              <h2 className="text-lg font-bold text-slate-900">Nova Melhoria</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleCreateImprovement} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Número</label>
                  <input 
                    type="text" 
                    placeholder="ex: 123"
                    value={newItem.external_id}
                    onChange={e => setNewItem({...newItem, external_id: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Link do Card (Jira/URL)</label>
                  <input 
                    type="url" 
                    placeholder="https://jira.exemplo.com/browse/KEY-123"
                    value={newItem.external_url}
                    onChange={e => setNewItem({...newItem, external_url: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Título</label>
                <input 
                  required
                  type="text" 
                  value={newItem.title}
                  onChange={e => setNewItem({...newItem, title: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                  placeholder="Ex: Refatorar módulo de autenticação"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Descrição</label>
                <textarea 
                  rows={3}
                  value={newItem.description}
                  onChange={e => setNewItem({...newItem, description: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm resize-none"
                  placeholder="Descreva a melhoria desejada..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                  <select 
                    value={newItem.status}
                    onChange={e => setNewItem({...newItem, status: e.target.value as any})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                  >
                    {Object.entries(statusConfig).map(([val, config]) => (
                      <option key={val} value={val}>{config.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Data de Abertura</label>
                  <input 
                    type="date"
                    value={newItem.opened_at}
                    onChange={e => setNewItem({...newItem, opened_at: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Módulo</label>
                  <ModuleAutocompleteSearch
                    mode="module"
                    value={newItem.module}
                    onChange={val => setNewItem({...newItem, module: val, submodule: ''})}
                    placeholder="Ex: Financeiro"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Submódulo</label>
                  <ModuleAutocompleteSearch
                    mode="submodule"
                    moduleFilter={newItem.module}
                    value={newItem.submodule}
                    onChange={val => setNewItem({...newItem, submodule: val})}
                    placeholder="Ex: Contas a Pagar"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Analista (Opcional)</label>
                <select 
                  value={newItem.analystId}
                  onChange={e => setNewItem({...newItem, analystId: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                >
                  <option value="">Não atribuído</option>
                  {analysts.map(analyst => (
                    <option key={analyst.id} value={analyst.id}>{analyst.name}</option>
                  ))}
                </select>
              </div>

              <div className="relative z-[40]">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Organização (Opcional)</label>
                <EntityAutocompleteSearch 
                  value={newItem.organization}
                  onChange={val => setNewItem({...newItem, organization: val})}
                  placeholder="Ex: Departamento/Empresa"
                />
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Responsáveis & Envolvidos</h3>

                <div className="relative z-[30]">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Responsável (Desenvolvimento)</label>
                  <EmployeeAutocompleteSearch 
                    value={newItem.responsible || ''}
                    onChange={val => setNewItem({...newItem, responsible: val})}
                    sectorFilter="Desenvolvimento"
                    placeholder="Buscar responsável de Desenvolvimento..."
                  />
                </div>

                <div className="relative z-[20]">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">PM Responsável do Squad (Produto)</label>
                  <EmployeeAutocompleteSearch 
                    value={newItem.pm_responsible || ''}
                    onChange={val => setNewItem({...newItem, pm_responsible: val})}
                    sectorFilter="Produto"
                    placeholder="Buscar PM de Produto..."
                  />
                </div>

                <div className="relative z-[10]">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Solicitante da Demanda</label>
                  <EmployeeAutocompleteSearch 
                    value={newItem.requester || ''}
                    onChange={val => setNewItem({...newItem, requester: val})}
                    placeholder="Buscar solicitante..."
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-all text-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg shadow-primary-100 transition-all active:scale-[0.98] disabled:opacity-50 text-sm"
                >
                  {isSubmitting ? 'Criando...' : 'Criar Melhoria'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
              <h2 className="text-lg font-bold text-slate-900">Editar Melhoria</h2>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateItem} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Número</label>
                  <input 
                    type="text" 
                    value={editingItem.external_id || ''}
                    onChange={e => editingItem && setEditingItem({...editingItem, external_id: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Link do Card (Jira/URL)</label>
                  <input 
                    type="url" 
                    placeholder="https://jira.exemplo.com/browse/KEY-123"
                    value={editingItem.external_url || ''}
                    onChange={e => editingItem && setEditingItem({...editingItem, external_url: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Título</label>
                <input 
                  type="text" 
                  required
                  value={editingItem.title}
                  onChange={e => editingItem && setEditingItem({...editingItem, title: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Descrição</label>
                <textarea 
                  rows={3}
                  value={editingItem.description}
                  onChange={e => editingItem && setEditingItem({...editingItem, description: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                  <select 
                    value={editingItem.status}
                    onChange={e => editingItem && setEditingItem({...editingItem, status: e.target.value as any})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                  >
                    {Object.entries(statusConfig).map(([val, config]) => (
                      <option key={val} value={val}>{config.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Data de Abertura</label>
                  <input 
                    type="date"
                    value={editingItem.opened_at ? editingItem.opened_at.substring(0, 10) : ''}
                    onChange={e => editingItem && setEditingItem({...editingItem, opened_at: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Módulo</label>
                  <ModuleAutocompleteSearch
                    mode="module"
                    value={editingItem.module || ''}
                    onChange={val => editingItem && setEditingItem({...editingItem, module: val, submodule: ''})}
                    placeholder="Ex: Financeiro"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Submódulo</label>
                  <ModuleAutocompleteSearch
                    mode="submodule"
                    moduleFilter={editingItem.module || ''}
                    value={editingItem.submodule || ''}
                    onChange={val => editingItem && setEditingItem({...editingItem, submodule: val})}
                    placeholder="Ex: Contas a Pagar"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Analista</label>
                <select 
                  value={editingItem.analyst_id || ''}
                  onChange={e => editingItem && setEditingItem({...editingItem, analyst_id: e.target.value || null})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                >
                  <option value="">Não atribuído</option>
                  {analysts.map(analyst => (
                    <option key={analyst.id} value={analyst.id}>{analyst.name}</option>
                  ))}
                </select>
              </div>

              <div className="relative z-[40]">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Organização</label>
                <EntityAutocompleteSearch 
                  value={editingItem.organization || ''}
                  onChange={val => editingItem && setEditingItem({...editingItem, organization: val})}
                />
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Responsáveis & Envolvidos</h3>

                <div className="relative z-[30]">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Responsável (Desenvolvimento)</label>
                  <EmployeeAutocompleteSearch 
                    value={editingItem.responsible || ''}
                    onChange={val => editingItem && setEditingItem({...editingItem, responsible: val})}
                    sectorFilter="Desenvolvimento"
                    placeholder="Buscar responsável de Desenvolvimento..."
                  />
                </div>

                <div className="relative z-[20]">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">PM Responsável do Squad (Produto)</label>
                  <EmployeeAutocompleteSearch 
                    value={editingItem.pm_responsible || ''}
                    onChange={val => editingItem && setEditingItem({...editingItem, pm_responsible: val})}
                    sectorFilter="Produto"
                    placeholder="Buscar PM de Produto..."
                  />
                </div>

                <div className="relative z-[10]">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Solicitante da Demanda</label>
                  <EmployeeAutocompleteSearch 
                    value={editingItem.requester || ''}
                    onChange={val => editingItem && setEditingItem({...editingItem, requester: val})}
                    placeholder="Buscar solicitante..."
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition-all text-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg shadow-primary-100 transition-all active:scale-[0.98] disabled:opacity-50 text-sm"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
