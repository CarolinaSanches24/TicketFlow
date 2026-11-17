import React, { useState, useEffect } from 'react';
import Layout from '../components/layouts/Layout';
import { moduleService } from '../services/api';
import { Layers, ChevronDown, ChevronRight, Plus, Pencil, Trash2, X, Search, AlertCircle, Package } from 'lucide-react';

interface SystemModule {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
}

interface SystemSubmodule {
  id: string;
  name: string;
  module_id: string;
  description?: string;
  module?: SystemModule;
  created_at?: string;
}

export default function Modules() {
  const [modules, setModules] = useState<SystemModule[]>([]);
  const [submodules, setSubmodules] = useState<SystemSubmodule[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Modal state (shared for module and submodule)
  type ModalMode = 'createModule' | 'editModule' | 'createSubmodule' | 'editSubmodule';
  const [modalMode, setModalMode] = useState<ModalMode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Module form
  const [editingModule, setEditingModule] = useState<SystemModule | null>(null);
  const [moduleForm, setModuleForm] = useState({ name: '', description: '' });

  // Submodule form
  const [editingSubmodule, setEditingSubmodule] = useState<SystemSubmodule | null>(null);
  const [submoduleForm, setSubmoduleForm] = useState({ name: '', module_id: '', description: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [mods, subs] = await Promise.all([
        moduleService.getAllModules(),
        moduleService.getAllSubmodules(),
      ]);
      setModules(mods);
      setSubmodules(subs);
    } catch (err) {
      console.error('Erro ao carregar módulos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Module modal ──
  const openCreateModule = () => {
    setEditingModule(null);
    setModuleForm({ name: '', description: '' });
    setErrorMessage(null);
    setModalMode('createModule');
  };

  const openEditModule = (mod: SystemModule) => {
    setEditingModule(mod);
    setModuleForm({ name: mod.name, description: mod.description || '' });
    setErrorMessage(null);
    setModalMode('editModule');
  };

  const handleModuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleForm.name.trim()) return;
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      if (editingModule) {
        await moduleService.updateModule(editingModule.id, {
          name: moduleForm.name.trim(),
          description: moduleForm.description.trim() || undefined,
        });
      } else {
        await moduleService.createModule({
          name: moduleForm.name.trim(),
          description: moduleForm.description.trim() || undefined,
        });
      }
      setModalMode(null);
      fetchData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar módulo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteModule = async (mod: SystemModule) => {
    const count = submodules.filter((s) => s.module_id === mod.id).length;
    const msg = count > 0
      ? `Atenção: existem ${count} submódulo(s) vinculados a "${mod.name}". Ao excluir, os submódulos também serão removidos. Deseja continuar?`
      : `Deseja realmente excluir o módulo "${mod.name}"?`;
    if (!confirm(msg)) return;
    try {
      await moduleService.deleteModule(mod.id);
      fetchData();
    } catch (err: any) {
      alert('Erro ao excluir módulo: ' + (err.message || ''));
    }
  };

  // ── Submodule modal ──
  const openCreateSubmodule = (moduleId?: string) => {
    setEditingSubmodule(null);
    setSubmoduleForm({ name: '', module_id: moduleId || '', description: '' });
    setErrorMessage(null);
    setModalMode('createSubmodule');
  };

  const openEditSubmodule = (sub: SystemSubmodule) => {
    setEditingSubmodule(sub);
    setSubmoduleForm({ name: sub.name, module_id: sub.module_id, description: sub.description || '' });
    setErrorMessage(null);
    setModalMode('editSubmodule');
  };

  const handleSubmoduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submoduleForm.name.trim() || !submoduleForm.module_id) return;
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      if (editingSubmodule) {
        await moduleService.updateSubmodule(editingSubmodule.id, {
          name: submoduleForm.name.trim(),
          module_id: submoduleForm.module_id,
          description: submoduleForm.description.trim() || undefined,
        });
      } else {
        await moduleService.createSubmodule({
          name: submoduleForm.name.trim(),
          module_id: submoduleForm.module_id,
          description: submoduleForm.description.trim() || undefined,
        });
      }
      setModalMode(null);
      fetchData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao salvar submódulo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmodule = async (sub: SystemSubmodule) => {
    if (!confirm(`Deseja realmente excluir o submódulo "${sub.name}"?`)) return;
    try {
      await moduleService.deleteSubmodule(sub.id);
      fetchData();
    } catch (err: any) {
      alert('Erro ao excluir submódulo: ' + (err.message || ''));
    }
  };

  // ── Filter ──
  const filteredModules = modules.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submodules
        .filter((s) => s.module_id === m.id)
        .some(
          (s) =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.description?.toLowerCase().includes(searchTerm.toLowerCase())
        )
  );

  const isModalOpen = modalMode !== null;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-8 h-8 text-primary-600" /> Módulos e Submódulos
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Gerencie os módulos e submódulos do sistema. Eles são utilizados no cadastro de Melhorias, Débitos Técnicos, Solicitações de Dados e Entidades.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => openCreateSubmodule()}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-semibold transition-all active:scale-[0.98] text-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Novo Submódulo
            </button>
            <button
              onClick={openCreateModule}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md transition-all active:scale-[0.98] text-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Novo Módulo
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar módulo ou submódulo..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <span className="text-xs text-slate-400 whitespace-nowrap">
            {modules.length} módulo{modules.length !== 1 ? 's' : ''} · {submodules.length} submódulo{submodules.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Module List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Carregando módulos...</div>
          ) : filteredModules.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-slate-700">Nenhum módulo encontrado</p>
              <p className="text-xs text-slate-500 mt-1">
                Clique em "Novo Módulo" para adicionar o primeiro módulo do sistema.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredModules.map((mod) => {
                const modSubmodules = submodules.filter((s) => s.module_id === mod.id);
                const isExpanded = expandedModules.has(mod.id);
                return (
                  <div key={mod.id}>
                    {/* Module Row */}
                    <div className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50/80 transition-colors group">
                      <button
                        type="button"
                        onClick={() => toggleExpand(mod.id)}
                        className="text-slate-400 hover:text-slate-600 flex-shrink-0"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm">{mod.name}</p>
                        {mod.description && (
                          <p className="text-xs text-slate-500 truncate mt-0.5">{mod.description}</p>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {modSubmodules.length} submódulo{modSubmodules.length !== 1 ? 's' : ''}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { openCreateSubmodule(mod.id); }}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Adicionar submódulo"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModule(mod)}
                          className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar módulo"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteModule(mod)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Excluir módulo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Submodule Rows (expanded) */}
                    {isExpanded && (
                      <div className="bg-slate-50/60 border-t border-slate-100">
                        {modSubmodules.length === 0 ? (
                          <div className="pl-16 pr-5 py-3 text-xs text-slate-400 italic">
                            Nenhum submódulo cadastrado para este módulo.{' '}
                            <button
                              type="button"
                              onClick={() => openCreateSubmodule(mod.id)}
                              className="text-primary-600 hover:underline font-semibold"
                            >
                              Adicionar
                            </button>
                          </div>
                        ) : (
                          modSubmodules.map((sub) => (
                            <div
                              key={sub.id}
                              className="flex items-center gap-3 pl-16 pr-5 py-3 hover:bg-slate-100/60 transition-colors group/sub border-t border-slate-100 first:border-t-0"
                            >
                              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center flex-shrink-0">
                                <Package className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-700 text-sm">{sub.name}</p>
                                {sub.description && (
                                  <p className="text-xs text-slate-400 truncate mt-0.5">{sub.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                <button
                                  onClick={() => openEditSubmodule(sub)}
                                  className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors cursor-pointer"
                                  title="Editar submódulo"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSubmodule(sub)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Excluir submódulo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">
                {modalMode === 'createModule' && 'Novo Módulo'}
                {modalMode === 'editModule' && 'Editar Módulo'}
                {modalMode === 'createSubmodule' && 'Novo Submódulo'}
                {modalMode === 'editSubmodule' && 'Editar Submódulo'}
              </h2>
              <button onClick={() => setModalMode(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Module Form */}
            {(modalMode === 'createModule' || modalMode === 'editModule') && (
              <form onSubmit={handleModuleSubmit} className="p-6 space-y-4">
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nome do Módulo *</label>
                  <input
                    required
                    type="text"
                    value={moduleForm.name}
                    onChange={(e) => setModuleForm({ ...moduleForm, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                    placeholder="Ex: Financeiro, Acadêmico, RH"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Descrição (Opcional)</label>
                  <textarea
                    rows={3}
                    value={moduleForm.description}
                    onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm resize-none"
                    placeholder="Descrição do módulo..."
                  />
                </div>
                <div className="pt-4 flex gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md transition-all active:scale-[0.98] disabled:opacity-50 text-sm cursor-pointer"
                  >
                    {isSubmitting ? 'Salvando...' : editingModule ? 'Salvar Alterações' : 'Criar Módulo'}
                  </button>
                </div>
              </form>
            )}

            {/* Submodule Form */}
            {(modalMode === 'createSubmodule' || modalMode === 'editSubmodule') && (
              <form onSubmit={handleSubmoduleSubmit} className="p-6 space-y-4">
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Módulo Pai *</label>
                  <select
                    required
                    value={submoduleForm.module_id}
                    onChange={(e) => setSubmoduleForm({ ...submoduleForm, module_id: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white"
                  >
                    <option value="">Selecione um módulo...</option>
                    {modules.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nome do Submódulo *</label>
                  <input
                    required
                    type="text"
                    value={submoduleForm.name}
                    onChange={(e) => setSubmoduleForm({ ...submoduleForm, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                    placeholder="Ex: Contas a Pagar, Boletins, Ponto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Descrição (Opcional)</label>
                  <textarea
                    rows={2}
                    value={submoduleForm.description}
                    onChange={(e) => setSubmoduleForm({ ...submoduleForm, description: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm resize-none"
                    placeholder="Descrição do submódulo..."
                  />
                </div>
                <div className="pt-4 flex gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md transition-all active:scale-[0.98] disabled:opacity-50 text-sm cursor-pointer"
                  >
                    {isSubmitting ? 'Salvando...' : editingSubmodule ? 'Salvar Alterações' : 'Criar Submódulo'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
