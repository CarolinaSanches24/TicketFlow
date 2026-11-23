import { useState, useEffect } from 'react';
import Layout from '../components/layouts/Layout';
import { useUser } from '../contexts/UserContext';
import { authService } from '../services/api';
import { UserRole } from '../types';
import { UserPlus, History, Search, Mail, Shield, Calendar, Plus, X, Edit, Trash2, AlertTriangle, RefreshCw, UserMinus, KeyRound } from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  deleted_at?: string | null;
}

interface AuditLog {
  id: string;
  target_user_email: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  details: string;
  created_at: string;
  creator: { name: string };
}

export default function Users() {
  const { user: currentUser, refreshUser } = useUser();
  const [users, setUsers] = useState<UserData[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewDeleted, setViewDeleted] = useState(false);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ANALYST' as UserRole
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [passwordUser, setPasswordUser] = useState<UserData | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = viewDeleted 
        ? await authService.getDeletedUsers() 
        : await authService.getUsers();
      setUsers(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const data = await authService.getAuditLogs();
      setLogs(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [viewDeleted]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.password || !newUser.name) return;

    if (newUser.password.length < 6) {
      alert('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    try {
      setIsSubmitting(true);
      await authService.createUser(newUser, currentUser?.id || '');
      setIsCreateModalOpen(false);
      setNewUser({ name: '', email: '', password: '', role: 'ANALYST' });
      fetchData();
      alert('Usuário criado com sucesso! (Verifique se o Supabase exige confirmação de email)');
    } catch (error: any) {
      alert('Erro ao criar usuário: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      setIsSubmitting(true);
      await authService.updateUser(editingUser.id, {
        name: editingUser.name,
        role: editingUser.role
      }, currentUser?.id || '');
      
      if (currentUser?.id === editingUser.id) {
        await refreshUser();
      }
      
      setIsEditModalOpen(false);
      setEditingUser(null);
      fetchData();
    } catch (error: any) {
      alert('Erro ao atualizar usuário: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setIsSubmitting(true);
      await authService.deleteUser(userToDelete.id, userToDelete.email, currentUser?.id || '');
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      fetchData();
    } catch (error: any) {
      alert('Erro ao excluir usuário: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestoreUser = async (u: UserData) => {
    try {
      await authService.restoreUser(u.id, u.email, currentUser?.id || '');
      fetchData();
      alert('Usuário restaurado com sucesso!');
    } catch (error: any) {
      alert('Erro ao restaurar usuário: ' + error.message);
    }
  };

  const handleAdminUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordUser) return;

    if (newPassword.length < 6) {
      alert('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('A confirmação de senha não confere com a nova senha digitada.');
      return;
    }

    try {
      setIsSubmitting(true);
      await authService.adminUpdatePassword(passwordUser.id, newPassword, currentUser?.id || '');
      setIsPasswordModalOpen(false);
      setPasswordUser(null);
      setNewPassword('');
      setConfirmPassword('');
      fetchLogs();
      alert(`Senha do usuário ${passwordUser.name} atualizada com sucesso!`);
    } catch (error: any) {
      alert('Erro ao atualizar senha: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Gerenciamento de Usuários</h1>
            <p className="text-slate-500">Adicione novos membros e visualize logs de criação</p>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => { setViewDeleted(!viewDeleted); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold shadow-sm transition-all ${
                viewDeleted 
                  ? 'bg-amber-50 border border-amber-200 text-amber-700' 
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {viewDeleted ? <UserPlus className="w-5 h-5" /> : <UserMinus className="w-5 h-5" />}
              {viewDeleted ? 'Ver Ativos' : 'Ver Excluídos'}
            </button>
            <button 
              onClick={() => { fetchLogs(); setIsLogsModalOpen(true); }}
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-semibold shadow-sm hover:bg-slate-50 transition-all"
            >
              <History className="w-5 h-5" />
              Ver Logs
            </button>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg shadow-primary-100 transition-all active:scale-[0.98]"
            >
              <UserPlus className="w-5 h-5" />
              Novo Usuário
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Carregando usuários...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Usuário</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Permissão</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-50 last:border-0">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block">{u.name}</span>
                            <span className="text-xs text-slate-500">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 w-fit ${
                          u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                          u.role === 'LEADERSHIP' ? 'bg-indigo-100 text-indigo-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          <Shield className="w-3 h-3" />
                          {u.role === 'ADMIN' ? 'Administrador' : u.role === 'LEADERSHIP' ? 'Liderança' : 'Analista'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-400">{u.id}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!viewDeleted ? (
                            <>
                              <button 
                                onClick={() => {
                                  setPasswordUser(u);
                                  setNewPassword('');
                                  setConfirmPassword('');
                                  setIsPasswordModalOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                title="Redefinir Senha de Acesso"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => { setEditingUser(u); setIsEditModalOpen(true); }}
                                className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {currentUser?.id !== u.id && (
                                <button 
                                  onClick={() => { setUserToDelete(u); setIsDeleteModalOpen(true); }}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          ) : (
                            <button 
                              onClick={() => handleRestoreUser(u)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                              title="Restaurar"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* User Creation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">Novo Usuário</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nome Completo</label>
                <input 
                  required
                  type="text" 
                  value={newUser.name}
                  onChange={e => setNewUser({...newUser, name: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  placeholder="Nome do usuário"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    required
                    type="email" 
                    value={newUser.email}
                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                    placeholder="exemplo@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Senha Inicial</label>
                <input 
                  required
                  type="password" 
                  value={newUser.password}
                  onChange={e => setNewUser({...newUser, password: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Perfil de Acesso</label>
                <select 
                  value={newUser.role}
                  onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                >
                  <option value="ANALYST">Analista</option>
                  <option value="LEADERSHIP">Liderança</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 text-sm">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg disabled:opacity-50 text-sm"
                >
                  {isSubmitting ? 'Criando...' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {isLogsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5" />
                Logs de Criação
              </h2>
              <button onClick={() => setIsLogsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
            
            <div className="p-0 max-h-[60vh] overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Ação</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Usuário Alvo</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Detalhes</th>
                    <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Criado por / Data</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-500">Nenhum log encontrado.</td>
                    </tr>
                  ) : (
                    logs.map(log => (
                      <tr key={log.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 w-fit ${
                            log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700' :
                            log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {log.action === 'CREATE' && <Plus className="w-2.5 h-2.5" />}
                            {log.action === 'UPDATE' && <Edit className="w-2.5 h-2.5" />}
                            {log.action === 'DELETE' && <Trash2 className="w-2.5 h-2.5" />}
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-slate-900">{log.target_user_email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-slate-500 max-w-[200px] truncate" title={log.details}>
                            {log.details}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-600">{log.creator?.name || 'Sistema'}</div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <Calendar className="w-3 h-3" />
                            {new Date(log.created_at).toLocaleString('pt-BR')}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
              <button onClick={() => setIsLogsModalOpen(false)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* User Editing Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">Editar Usuário</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nome Completo</label>
                <input 
                  required
                  type="text" 
                  value={editingUser.name}
                  onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">E-mail (Não editável)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <input 
                    disabled
                    type="email" 
                    value={editingUser.email}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-100 bg-slate-50 text-slate-400 outline-none text-sm cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Perfil de Acesso</label>
                <select 
                  value={editingUser.role}
                  onChange={e => setEditingUser({...editingUser, role: e.target.value as any})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                >
                  <option value="ANALYST">Analista</option>
                  <option value="LEADERSHIP">Liderança</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 text-sm">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg disabled:opacity-50 text-sm"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Excluir Usuário?</h2>
              <p className="text-slate-500 text-sm mb-6">
                Tem certeza que deseja excluir <strong>{userToDelete.name}</strong>? Esta ação removerá o perfil do sistema.
              </p>
              
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsDeleteModalOpen(false)} 
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 text-sm"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDeleteUser}
                  disabled={isSubmitting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 text-sm"
                >
                  {isSubmitting ? 'Excluindo...' : 'Sim, Excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Password Reset Modal */}
      {isPasswordModalOpen && passwordUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                Redefinir Senha de Acesso
              </h2>
              <button 
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setPasswordUser(null);
                }} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAdminUpdatePassword} className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <div><strong>Usuário:</strong> {passwordUser.name}</div>
                <div><strong>E-mail:</strong> {passwordUser.email}</div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nova Senha</label>
                <input 
                  required
                  type="password" 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                  placeholder="Mínimo 6 caracteres"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Confirmar Nova Senha</label>
                <input 
                  required
                  type="password" 
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                  placeholder="Repita a nova senha"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setPasswordUser(null);
                  }} 
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 text-sm"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-lg disabled:opacity-50 text-sm"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Nova Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
