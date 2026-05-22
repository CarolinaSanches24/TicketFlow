import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layouts/Layout';
import { entityService } from '../services/api';
import { Landmark, Plus, Search, Pencil, Trash2, X, AlertCircle, Settings } from 'lucide-react';

interface Entity {
  id: string;
  name: string;
  identifier?: string;
  admin_responsible?: string;
  secretariat_type?: string;
  account_manager?: string;
  cs_account_manager?: string;
  created_at: string;
}

export default function Entities() {
  const navigate = useNavigate();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const loadEntities = async () => {
    try {
      setLoading(true);
      const data = await entityService.getAll();
      setEntities(data);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao carregar entidades. Verifique sua conexão e se a tabela de entidades foi criada.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntities();
  }, []);

  const openForm = (entity?: Entity) => {
    setError(null);
    if (entity) {
      setEditingEntity(entity);
      reset(entity);
    } else {
      setEditingEntity(null);
      reset({
        name: '', identifier: '', admin_responsible: '', 
        secretariat_type: '', account_manager: '', 
        cs_account_manager: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeForm = () => {
    setIsModalOpen(false);
    setEditingEntity(null);
    reset();
  };

  const onSubmit = async (data: any) => {
    try {
      if (editingEntity) {
        await entityService.update(editingEntity.id, data);
      } else {
        await entityService.create(data);
      }
      await loadEntities();
      closeForm();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar a entidade');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta entidade?')) {
      try {
        await entityService.delete(id);
        await loadEntities();
      } catch (err: any) {
        setError(err.message || 'Erro ao excluir entidade');
      }
    }
  };

  const filteredEntities = entities.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Entidades</h1>
            <p className="text-slate-500">Gestão das entidades de negócio, com informações organizacionais</p>
          </div>
          <button
            onClick={() => openForm()}
            className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg shadow-primary-200 transition-all active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" />
            Nova Entidade
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar entidades..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-100 bg-white">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Entidade</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Gestores</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Classificação</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-primary-600"></div>
                      <p className="text-slate-500 mt-2 text-sm">Carregando entidades...</p>
                    </td>
                  </tr>
                ) : filteredEntities.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                      Nenhuma entidade encontrada.
                    </td>
                  </tr>
                ) : (
                  filteredEntities.map((entity) => (
                    <tr key={entity.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 flex-shrink-0">
                            <Landmark className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{entity.name}</p>
                            {entity.identifier && (
                              <p className="text-xs text-slate-500 mt-0.5 truncate font-mono">
                                ID: {entity.identifier}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-700">Admin: {entity.admin_responsible || '—'}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Resp: {entity.account_manager || '—'}</p>
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 w-fit">
                            {entity.secretariat_type?.toUpperCase() || 'NÃO DEFINIDO'}
                          </span>
                          <span className="text-xs text-slate-500">
                            CS: {entity.cs_account_manager || 'Não atribuído'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                           <button
                             onClick={() => navigate(`/entities/${entity.id}`)}
                             className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-2"
                             title="Gerenciar Módulos da Entidade (Unidades, Documentos, etc)"
                           >
                              <Settings className="w-4 h-4" />
                              <span className="text-xs font-semibold hidden md:inline">Módulos</span>
                           </button>
                           <div className="w-px h-6 bg-slate-200 mx-1 align-middle my-auto" />
                          <button
                            onClick={() => openForm(entity)}
                            className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(entity.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl my-8">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">
                {editingEntity ? 'Editar Entidade' : 'Nova Entidade'}
              </h2>
              <button
                onClick={closeForm}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6">
              <div className="space-y-6">
                
                {/* Dados da Entidade */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase bg-slate-100 px-3 py-1 rounded-lg inline-block mb-4">Informações Gerais</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Nome da Entidade *</label>
                      <input
                        {...register('name', { required: true })}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all"
                        placeholder="Ex: Associação XYZ"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Identificador (CNPJ, Código)</label>
                      <input
                        {...register('identifier')}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all"
                        placeholder="Ex: 00.000.000/0001-00"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo da Secretaria</label>
                      <select
                        {...register('secretariat_type')}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all"
                      >
                         <option value="">Selecione...</option>
                         <option value="Estadual">Estadual</option>
                         <option value="Municipal">Municipal</option>
                         <option value="Federal">Federal</option>
                         <option value="Particular">Particular</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Gestão */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase bg-slate-100 px-3 py-1 rounded-lg inline-block mb-4">Equipe Gestora</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Administrador Responsável</label>
                      <input
                        {...register('admin_responsible')}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all"
                        placeholder="Nome do Administrador"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Gestor(a) Responsável (Conta)</label>
                      <input
                        {...register('account_manager')}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all"
                        placeholder="Responsável Financeiro/Comercial"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-1">CS Responsável Interno</label>
                      <input
                        {...register('cs_account_manager')}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all"
                        placeholder="Nome do Customer Success no Sistema"
                      />
                    </div>
                  </div>
                </div>

              </div>

              <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-lg shadow-primary-200 transition-all active:scale-[0.98] disabled:opacity-70"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Entidade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
