import React, { useState, useEffect } from 'react';
import Layout from '../components/layouts/Layout';
import { employeeService, sectorService } from '../services/api';
import { Employee, Sector } from '../types';
import { Users, Plus, Pencil, Trash2, X, Search, Building2, Briefcase, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sector_id: '',
    role: '',
    status: 'ACTIVE'
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [empList, secList] = await Promise.all([
        employeeService.getAll(),
        sectorService.getAll()
      ]);
      setEmployees(empList);
      setSectors(secList);
    } catch (err) {
      console.error('Erro ao carregar colaboradores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingEmployee(null);
    setFormData({
      name: '',
      sector_id: sectors.length > 0 ? sectors[0].id : '',
      role: '',
      status: 'ACTIVE'
    });
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      sector_id: employee.sector_id || (employee.sector?.id || ''),
      role: employee.role,
      status: employee.status || 'ACTIVE'
    });
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.role.trim()) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const payload = {
        name: formData.name.trim(),
        sector_id: formData.sector_id || null,
        role: formData.role.trim(),
        status: formData.status || 'ACTIVE'
      };

      if (editingEmployee) {
        await employeeService.update(editingEmployee.id, payload);
      } else {
        await employeeService.create(payload);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Erro ao salvar funcionário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (employee: Employee) => {
    if (!confirm(`Deseja realmente remover o funcionário "${employee.name}"?`)) return;

    try {
      await employeeService.delete(employee.id);
      fetchData();
    } catch (err: any) {
      alert('Erro ao excluir funcionário: ' + (err.message || ''));
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.sector?.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSector = !sectorFilter || emp.sector_id === sectorFilter || emp.sector?.id === sectorFilter;
    
    const isEmpActive = emp.status === 'ACTIVE' || !emp.status;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && isEmpActive) ||
      (statusFilter === 'INACTIVE' && !isEmpActive);

    return matchesSearch && matchesSector && matchesStatus;
  });

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-8 h-8 text-primary-600" /> Funcionários
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Cadastro de colaboradores por setor e cargo (para atribuição de responsáveis e PMs).
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md transition-all active:scale-[0.98] text-sm self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Novo Funcionário
          </button>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, cargo ou setor..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={sectorFilter}
              onChange={e => setSectorFilter(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none bg-white font-medium"
            >
              <option value="">Todos os Setores</option>
              {sectors.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none bg-white font-medium"
            >
              <option value="ALL">Todos os Status</option>
              <option value="ACTIVE">Ativos</option>
              <option value="INACTIVE">Inativos</option>
            </select>
          </div>
        </div>

        {/* Employees Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Carregando funcionários...</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-slate-700">Nenhum funcionário encontrado</p>
              <p className="text-xs text-slate-500 mt-1">Clique em "Novo Funcionário" para cadastrar o primeiro membro da equipe.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Funcionário</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Setor</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Cargo</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Status</th>
                    <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map((emp) => {
                    const isEmpActive = emp.status === 'ACTIVE' || !emp.status;
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm shrink-0">
                              {emp.name.charAt(0)}
                            </div>
                            <span className="font-semibold text-slate-900">{emp.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {emp.sector?.name ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                              <Building2 className="w-3 h-3 text-blue-500" />
                              {emp.sector.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Não informado</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-700">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                            {emp.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            isEmpActive 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {isEmpActive ? (
                              <><CheckCircle2 className="w-3 h-3" /> Ativo</>
                            ) : (
                              <><XCircle className="w-3 h-3" /> Inativo</>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(emp)}
                              className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(emp)}
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
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-lg font-bold text-slate-900">
                  {editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}
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
                    Nome Completo do Funcionário *
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                    placeholder="Ex: Carlos Silva, Mariana Lima"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Setor *
                    </label>
                    <select
                      required
                      value={formData.sector_id}
                      onChange={e => setFormData({ ...formData, sector_id: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white"
                    >
                      <option value="">Selecione o setor...</option>
                      {sectors.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white"
                    >
                      <option value="ACTIVE">Ativo</option>
                      <option value="INACTIVE">Inativo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Cargo / Função *
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                    placeholder="Ex: Desenvolvedor Backend, Product Manager, Tech Lead"
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
                    {isSubmitting ? 'Salvando...' : editingEmployee ? 'Salvar Alterações' : 'Cadastrar Funcionário'}
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
