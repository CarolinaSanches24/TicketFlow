import React, { useState, useEffect } from 'react';
import Layout from '../components/layouts/Layout';
import { sectorService, employeeService } from '../services/api';
import { Sector } from '../types';
import { Building2, Plus, Pencil, Trash2, X, Check, Search, Users, AlertCircle } from 'lucide-react';

export default function Sectors() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [employeeCounts, setEmployeeCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [secList, empList] = await Promise.all([
        sectorService.getAll(),
        employeeService.getAll()
      ]);
      setSectors(secList);

      // Count employees per sector
      const counts: Record<string, number> = {};
      empList.forEach((emp: any) => {
        if (emp.sector_id) {
          counts[emp.sector_id] = (counts[emp.sector_id] || 0) + 1;
        }
      });
      setEmployeeCounts(counts);
    } catch (err) {
      console.error('Erro ao carregar setores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingSector(null);
    setFormData({ name: '', description: '' });
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (sector: Sector) => {
    setEditingSector(sector);
    setFormData({ name: sector.name, description: sector.description || '' });
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      if (editingSector) {
        await sectorService.update(editingSector.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined
        });
      } else {
        await sectorService.create({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined
        });
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Erro ao salvar setor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (sector: Sector) => {
    const count = employeeCounts[sector.id] || 0;
    const msg = count > 0 
      ? `Atenção: existem ${count} funcionário(s) vinculados a este setor. Ao excluir, o vínculo será desfeito. Deseja continuar?`
      : `Deseja realmente excluir o setor "${sector.name}"?`;

    if (!confirm(msg)) return;

    try {
      await sectorService.delete(sector.id);
      fetchData();
    } catch (err: any) {
      alert('Erro ao excluir setor: ' + (err.message || ''));
    }
  };

  const filteredSectors = sectors.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-8 h-8 text-primary-600" /> Setores
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Gerencie os setores e departamentos da empresa (ex: Desenvolvimento, Produto, Suporte).
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md transition-all active:scale-[0.98] text-sm self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Novo Setor
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar setor por nome ou descrição..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
        </div>

        {/* Sectors Grid / List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Carregando setores...</div>
          ) : filteredSectors.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-slate-700">Nenhum setor encontrado</p>
              <p className="text-xs text-slate-500 mt-1">Clique em "Novo Setor" para adicionar o primeiro departamento.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Setor</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Descrição</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Funcionários</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSectors.map((sector) => {
                    const empCount = employeeCounts[sector.id] || 0;
                    return (
                      <tr key={sector.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-xs shrink-0">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <span>{sector.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600 max-w-md">
                          {sector.description || <span className="text-slate-400 italic">Sem descrição</span>}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                            <Users className="w-3 h-3 text-slate-500" />
                            {empCount} {empCount === 1 ? 'colaborador' : 'colaboradores'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(sector)}
                              className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(sector)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Create / Edit */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-900">
                  {editingSector ? 'Editar Setor' : 'Novo Setor'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Nome do Setor *
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                    placeholder="Ex: Desenvolvimento, Produto, Suporte"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Descrição (Opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm resize-none"
                    placeholder="Descrição das responsabilidades do setor..."
                  />
                </div>

                <div className="pt-4 flex gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md transition-all active:scale-[0.98] disabled:opacity-50 text-sm cursor-pointer"
                  >
                    {isSubmitting ? 'Salvando...' : editingSector ? 'Salvar Alterações' : 'Criar Setor'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
