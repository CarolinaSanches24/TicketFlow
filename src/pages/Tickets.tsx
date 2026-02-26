import { useState, useMemo, useEffect } from 'react';
import Layout from '../components/layouts/Layout';
import { 
  flexRender, 
  getCoreRowModel, 
  useReactTable, 
  createColumnHelper 
} from '@tanstack/react-table';
import { useUser } from '../contexts/UserContext';
import { ticketService, authService } from '../services/api';
import { Plus, Search, Tag, User as UserIcon, Calendar, MoreVertical, CheckCircle2, Clock, PlayCircle, TrendingUp, AlertCircle, Eye, EyeOff, Edit2, Trash2, Settings } from 'lucide-react';

interface Ticket {
  id: string;
  external_id: string | null;
  external_url: string | null;
  title: string;
  description: string;
  status: 'PENDING' | 'OPEN' | 'ON_HOLD' | 'FINISHED';
  analyst_id: string | null;
  analyst?: { name: string };
  created_at: string;
  updated_at: string;
}

const columnHelper = createColumnHelper<Ticket>();

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  'PENDING': { label: 'Pendente', color: 'bg-slate-100 text-slate-700', icon: Clock },
  'OPEN': { label: 'Aberto', color: 'bg-blue-100 text-blue-700', icon: PlayCircle },
  'ON_HOLD': { label: 'Em Espera', color: 'bg-amber-100 text-amber-700', icon: Clock },
  'FINISHED': { label: 'Finalizado', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  'CONVERTED_TO_IMPROVEMENT': { label: 'Virou Melhoria', color: 'bg-indigo-100 text-indigo-700', icon: TrendingUp },
  'CONVERTED_TO_DEBT': { label: 'Virou Débito', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
};

export default function Tickets() {
  const { user } = useUser();
  const [data, setData] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showClosed, setShowClosed] = useState(false);
  
  // Creation Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysts, setAnalysts] = useState<{id: string, name: string}[]>([]);
  const [newTicket, setNewTicket] = useState({
    external_id: '',
    external_url: '',
    title: '',
    description: '',
    analystId: ''
  });

  // Edit/Delete States
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const tickets = await ticketService.getAll();
      setData(tickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
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
    fetchTickets();
    fetchAnalysts();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.title) return;

    try {
      setIsSubmitting(true);
      await ticketService.create({
    external_id: newTicket.external_id || null,
    external_url: newTicket.external_url || null,
    title: newTicket.title,
    description: newTicket.description,
    analyst_id: newTicket.analystId || null,
    status: 'PENDING'
  });
  
  setIsModalOpen(false);
  setNewTicket({ external_id: '', external_url: '', title: '', description: '', analystId: '' });
      fetchTickets();
    } catch (error) {
      alert('Erro ao criar ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await ticketService.updateStatus(id, newStatus);
      fetchTickets();
    } catch (error) {
      alert('Erro ao atualizar status');
    }
  };

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTicket || !editingTicket.title) return;

    try {
      setIsSubmitting(true);
      await ticketService.update(editingTicket.id, {
    external_id: editingTicket.external_id,
    external_url: editingTicket.external_url,
    title: editingTicket.title,
    description: editingTicket.description,
    analyst_id: editingTicket.analyst_id,
    status: editingTicket.status
  });
      setEditingTicket(null);
      fetchTickets();
    } catch (error) {
      alert('Erro ao atualizar ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTicket = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este ticket?')) return;
    try {
      await ticketService.delete(id);
      fetchTickets();
    } catch (error) {
      alert('Erro ao excluir ticket');
    }
  };

  const columns = useMemo(() => [
    columnHelper.accessor('external_id', {
  header: 'Número',
  cell: info => {
    const ticket = info.row.original;
    if (ticket.external_url) {
      return (
        <a 
          href={ticket.external_url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="font-mono text-xs font-bold bg-primary-50 px-2 py-1 rounded text-primary-600 hover:bg-primary-100 transition-colors flex items-center gap-1 w-fit"
          title="Abrir no sistema externo"
        >
          #{info.getValue() || 'LINK'}
          <TrendingUp className="w-3 h-3" />
        </a>
      );
    }
    return <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-600">#{info.getValue() || '---'}</span>;
  },
}),
    columnHelper.accessor('title', {
      header: 'Título',
      cell: info => (
        <div>
          <span className="font-semibold text-slate-900 block">{info.getValue()}</span>
          <span className="text-xs text-slate-500 truncate max-w-xs block">{info.row.original.description}</span>
        </div>
      ),
    }),
    columnHelper.accessor('analyst.name', {
      header: 'Analista',
      cell: info => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary-50 flex items-center justify-center">
            <UserIcon className="w-3 h-3 text-primary-600" />
          </div>
          <span className="text-sm text-slate-600">{info.getValue() || 'Não atribuído'}</span>
        </div>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => {
        const val = info.getValue();
        const config = statusConfig[val] || statusConfig['PENDING'];
        const Icon = config.icon;
        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 w-fit ${config.color}`}>
            <Icon className="w-3 h-3" />
            {config.label}
          </span>
        );
      },
    }),
    columnHelper.accessor('created_at', {
      header: 'Criação',
      cell: info => (
        <div className="flex items-center gap-1.5 text-slate-500">
          <Calendar className="w-3.5 h-3.5" />
          <span className="text-xs">{new Date(info.getValue()).toLocaleDateString('pt-BR')}</span>
        </div>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => {
        const ticket = info.row.original;
        const isClosed = ['FINISHED', 'CONVERTED_TO_IMPROVEMENT', 'CONVERTED_TO_DEBT'].includes(ticket.status);
        
        return (
          <div className="flex items-center gap-2">
             {!isClosed && (
               <>
                 <button 
                   onClick={() => handleStatusUpdate(ticket.id, 'FINISHED')}
                   className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                   title="Finalizar"
                 >
                   <CheckCircle2 className="w-4 h-4" />
                 </button>
                 <button 
                   onClick={() => handleStatusUpdate(ticket.id, 'CONVERTED_TO_IMPROVEMENT')}
                   className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                   title="Converter para Melhoria"
                 >
                   <TrendingUp className="w-4 h-4" />
                 </button>
                 <button 
                   onClick={() => handleStatusUpdate(ticket.id, 'CONVERTED_TO_DEBT')}
                   className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                   title="Converter para Débito Técnico"
                 >
                   <AlertCircle className="w-4 h-4" />
                 </button>
                 <div className="w-px h-4 bg-slate-100 mx-1" />
               </>
             )}
             
             {!isClosed && (
               <button 
                 onClick={() => setEditingTicket(ticket)}
                 className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                 title="Editar"
               >
                 <Edit2 className="w-4 h-4" />
               </button>
             )}

             <button 
               onClick={() => handleDeleteTicket(ticket.id)}
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
    return data.filter(t => {
      const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           t.analyst?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const isClosed = ['FINISHED', 'CONVERTED_TO_IMPROVEMENT', 'CONVERTED_TO_DEBT'].includes(t.status);
      
      if (showClosed) return matchesSearch;
      return matchesSearch && !isClosed;
    });
  }, [data, searchTerm, showClosed]);

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
            <h1 className="text-3xl font-bold text-slate-900">Tickets</h1>
            <p className="text-slate-500">Fluxo de atendimentos e suporte</p>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg shadow-primary-100 transition-all active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            Novo Ticket
          </button>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por título ou analista..."
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
              <><EyeOff className="w-4 h-4" /> Ocultar Finalizados</>
            ) : (
              <><Eye className="w-4 h-4" /> Ver Finalizados</>
            )}
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Carregando tickets...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id} className="border-b border-slate-100 bg-slate-50/50">
                      {headerGroup.headers.map(header => (
                        <th key={header.id} className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
          {!loading && filteredData.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-slate-500">Nenhum ticket encontrado.</p>
            </div>
          )}
        </div>
      </div>

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">Novo Ticket</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Número</label>
                  <input 
                    type="text" 
                    placeholder="ex: 123"
                    value={newTicket.external_id}
                    onChange={e => setNewTicket({...newTicket, external_id: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Link do Chamado (URL)</label>
                  <input 
                    type="url" 
                    placeholder="https://suporte.exemplo.com/..."
                    value={newTicket.external_url}
                    onChange={e => setNewTicket({...newTicket, external_url: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Título</label>
                <input 
                  required
                  type="text" 
                  value={newTicket.title}
                  onChange={e => setNewTicket({...newTicket, title: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                  placeholder="Ex: Erro ao carregar dashboard"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Descrição</label>
                <textarea 
                  rows={3}
                  value={newTicket.description}
                  onChange={e => setNewTicket({...newTicket, description: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm resize-none"
                  placeholder="Descreva o problema..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Analista (Opcional)</label>
                <select 
                  value={newTicket.analystId}
                  onChange={e => setNewTicket({...newTicket, analystId: e.target.value})}
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
                  {isSubmitting ? 'Criando...' : 'Criar Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Modal */}
      {editingTicket && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">Editar Ticket</h2>
              <button onClick={() => setEditingTicket(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateTicket} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Número</label>
                  <input 
                    type="text" 
                    value={editingTicket.external_id || ''}
                    onChange={e => setEditingTicket({...editingTicket, external_id: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Link do Chamado (URL)</label>
                  <input 
                    type="url" 
                    value={editingTicket.external_url || ''}
                    onChange={e => setEditingTicket({...editingTicket, external_url: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Título</label>
                <input 
                  type="text" 
                  required
                  value={editingTicket.title}
                  onChange={e => setEditingTicket({...editingTicket, title: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Descrição</label>
                <textarea 
                  rows={3}
                  value={editingTicket.description}
                  onChange={e => setEditingTicket({...editingTicket, description: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                <select 
                  value={editingTicket.status}
                  onChange={e => setEditingTicket({...editingTicket, status: e.target.value as any})}
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
                  value={editingTicket.analyst_id || ''}
                  onChange={e => setEditingTicket({...editingTicket, analyst_id: e.target.value || null})}
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
                  onClick={() => setEditingTicket(null)}
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
