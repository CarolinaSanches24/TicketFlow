import { useState, useMemo, useEffect } from 'react';
import Layout from '../components/layouts/Layout';
import { 
  flexRender, 
  getCoreRowModel, 
  useReactTable, 
  createColumnHelper 
} from '@tanstack/react-table';
import { useUser } from '../contexts/UserContext';
import { debtService, authService } from '../services/api';
import { Plus, Search, User as UserIcon, Calendar, CheckCircle2, Clock, PlayCircle, Wrench, Info, Edit2, Trash2 } from 'lucide-react';

interface Debt {
  id: string;
  external_id: string | null;
  external_url: string | null;
  description: string;
  status: 'OPEN' | 'IN_CORRECTION' | 'RESOLVED';
  origin_type: string;
  analyst_id: string | null;
  analyst?: { name: string };
  created_at: string;
}

const columnHelper = createColumnHelper<Debt>();

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  'OPEN': { label: 'Aberto', color: 'bg-red-100 text-red-700', icon: Clock },
  'IN_CORRECTION': { label: 'Em Correção', color: 'bg-amber-100 text-amber-700', icon: PlayCircle },
  'RESOLVED': { label: 'Resolvido', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
};

export default function Debts() {
  const { user } = useUser();
  const [data, setData] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Creation Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysts, setAnalysts] = useState<{id: string, name: string}[]>([]);
  const [newItem, setNewItem] = useState({
    external_id: '',
    external_url: '',
    description: '',
    analystId: ''
  });

  // Edit/Delete States
  const [editingItem, setEditingItem] = useState<Debt | null>(null);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const items = await debtService.getAll();
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

  const handleCreateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.description) return;

    try {
      setIsSubmitting(true);
      await debtService.create({
    external_id: newItem.external_id || null,
    external_url: newItem.external_url || null,
    description: newItem.description,
    analyst_id: newItem.analystId || null,
    origin_type: 'MANUAL',
    status: 'OPEN'
  });
  
  setIsModalOpen(false);
  setNewItem({ external_id: '', external_url: '', description: '', analystId: '' });
      fetchItems();
    } catch (error) {
      alert('Erro ao criar débito');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await debtService.updateStatus(id, newStatus);
      fetchItems();
    } catch (error) {
      alert('Erro ao atualizar status');
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.description) return;

    try {
      setIsSubmitting(true);
      await debtService.update(editingItem.id, {
    external_id: editingItem.external_id,
    external_url: editingItem.external_url,
    description: editingItem.description,
    analyst_id: editingItem.analyst_id,
    status: editingItem.status,
    origin_type: editingItem.origin_type
  });
      setEditingItem(null);
      fetchItems();
    } catch (error) {
      alert('Erro ao atualizar débito');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este débito técnico?')) return;
    try {
      await debtService.delete(id);
      fetchItems();
    } catch (error) {
      alert('Erro ao excluir débito');
    }
  };

  const columns = useMemo(() => [
    columnHelper.accessor('external_id', {
  header: 'Número',
  cell: info => {
    const item = info.row.original;
    if (item.external_url) {
      return (
        <a 
          href={item.external_url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="font-mono text-xs font-bold bg-primary-50 px-2 py-1 rounded text-primary-600 hover:bg-primary-100 transition-colors flex items-center gap-1 w-fit"
          title="Abrir no sistema externo"
        >
          #{info.getValue() || 'LINK'}
          <Wrench className="w-3 h-3" />
        </a>
      );
    }
    return <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-600">#{info.getValue() || '---'}</span>;
  },
}),
    columnHelper.accessor('description', {
      header: 'Descrição',
      cell: info => <span className="font-medium text-slate-900">{info.getValue()}</span>,
    }),
    columnHelper.accessor('origin_type', {
      header: 'Origem',
      cell: info => <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">{info.getValue()}</span>,
    }),
    columnHelper.accessor('analyst.name', {
      header: 'Analista',
      cell: info => (
        <div className="flex items-center gap-2">
          <UserIcon className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-sm text-slate-600">{info.getValue() || 'Sem analista'}</span>
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
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 w-fit ${config.color}`}>
            <Icon className="w-3 h-3" />
            {config.label}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => {
        const item = info.row.original;
        const isResolved = item.status === 'RESOLVED';
        
        return (
          <div className="flex items-center gap-2">
             {!isResolved && (
               <>
                 {item.status === 'OPEN' && (
                   <button onClick={() => handleStatusUpdate(item.id, 'IN_CORRECTION')} className="text-xs font-medium text-primary-600 hover:bg-primary-50 p-1 rounded">Corrigir</button>
                 )}
                 {item.status === 'IN_CORRECTION' && (
                   <button onClick={() => handleStatusUpdate(item.id, 'RESOLVED')} className="text-xs font-medium text-emerald-600 hover:bg-emerald-50 p-1 rounded">Resolver</button>
                 )}
                 <div className="w-px h-4 bg-slate-100 mx-1" />
               </>
             )}

             {!isResolved && (
               <button 
                 onClick={() => setEditingItem(item)}
                 className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                 title="Editar"
               >
                 <Edit2 className="w-4 h-4" />
               </button>
             )}

             <button 
               onClick={() => handleDeleteItem(item.id)}
               className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
               title="Excluir"
             >
               <Trash2 className="w-4 h-4" />
             </button>
          </div>
        );
      },
    }),
  ], []);

  const filteredData = useMemo(() => {
    return data.filter(t => 
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.analyst?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [data, searchTerm]);

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
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Wrench className="text-primary-600" />
              Débitos Técnicos
            </h1>
            <p className="text-slate-500">Gestão de dívidas técnicas e correções pendentes</p>
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg shadow-primary-100 transition-all active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            Novo Débito
          </button>
        </div>

        {/* Legend Box */}
        <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Info className="w-5 h-5 text-blue-600" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-blue-900">Legenda de Origens:</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono bg-white border border-blue-200 px-1.5 py-0.5 rounded text-blue-700 font-bold">MANUAL</span>
                <span className="text-xs text-blue-800">Criado diretamente</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono bg-white border border-blue-200 px-1.5 py-0.5 rounded text-blue-700 font-bold">IMPROVEMENT</span>
                <span className="text-xs text-blue-800">Vindo de uma Melhoria</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono bg-white border border-blue-200 px-1.5 py-0.5 rounded text-blue-700 font-bold">TICKET</span>
                <span className="text-xs text-blue-800">Vindo de Suporte</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar débitos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Carregando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id} className="border-b border-slate-100 bg-slate-50/50">
                      {headerGroup.headers.map(header => (
                        <th key={header.id} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
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
                        <td key={cell.id} className="px-6 py-4">
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">Novo Débito</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleCreateDebt} className="p-6 space-y-4">
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
                <label className="block text-sm font-semibold text-slate-700 mb-1">Descrição</label>
                <textarea 
                  required
                  rows={3}
                  value={newItem.description}
                  onChange={e => setNewItem({...newItem, description: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm resize-none"
                  placeholder="Ex: Refatorar componente de busca..."
                />
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
                  {isSubmitting ? 'Criando...' : 'Criar Débito'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">Editar Débito Técnico</h2>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateItem} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Número</label>
                  <input 
                    type="text" 
                    value={editingItem.external_id || ''}
                    onChange={e => setEditingItem({...editingItem, external_id: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Link do Card (Jira/URL)</label>
                  <input 
                    type="url" 
                    placeholder="https://jira.exemplo.com/browse/KEY-123"
                    value={editingItem.external_url || ''}
                    onChange={e => setEditingItem({...editingItem, external_url: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Descrição</label>
                <textarea 
                  required
                  rows={3}
                  value={editingItem.description}
                  onChange={e => setEditingItem({...editingItem, description: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                <select 
                  value={editingItem.status}
                  onChange={e => setEditingItem({...editingItem, status: e.target.value as any})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                >
                  {Object.entries(statusConfig).map(([val, config]) => (
                    <option key={val} value={val}>{config.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Analista</label>
                <select 
                  value={editingItem.analyst_id || ''}
                  onChange={e => setEditingItem({...editingItem, analyst_id: e.target.value || null})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                >
                  <option value="">Não atribuído</option>
                  {analysts.map(analyst => (
                    <option key={analyst.id} value={analyst.id}>{analyst.name}</option>
                  ))}
                </select>
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
