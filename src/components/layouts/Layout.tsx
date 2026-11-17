import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../../contexts/UserContext';
import { 
  LayoutDashboard, Ticket, Rocket, Wrench, LogOut, User as UserIcon, 
  Database, FileText, Landmark, Calculator, Settings, ChevronDown, ChevronRight,
  Building2, Users 
} from 'lucide-react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const isSettingsActive = location.pathname.startsWith('/settings');
  const [isSettingsOpen, setIsSettingsOpen] = useState(isSettingsActive);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Entidades', path: '/entities', icon: Landmark },
    { name: 'Melhorias', path: '/improvements', icon: Rocket },
    { name: 'Débitos Técnicos', path: '/debts', icon: Wrench },
    { name: 'Dados', path: '/data-requests', icon: Database },
    { name: 'Critérios Avaliativos', path: '/evaluation-criteria', icon: Calculator },
    { name: 'Relatório', path: '/report', icon: FileText },
  ];

  if (user?.role === 'ADMIN') {
    menuItems.push({ name: 'Usuários', path: '/users', icon: UserIcon });
  }

  return (
    <div className="flex h-screen bg-slate-50 print:h-auto print:overflow-visible print:bg-white">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col print:hidden">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-primary-600 flex items-center gap-2">
            <Ticket className="w-6 h-6" />
            TicketFlow
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors ${
                  isActive 
                    ? 'bg-primary-50 text-primary-600 font-medium' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}

          {/* Menu Configurações com Submenu */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-colors cursor-pointer ${
                isSettingsActive
                  ? 'bg-primary-50 text-primary-600 font-medium'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5" />
                <span className="text-sm">Configurações</span>
              </div>
              {isSettingsOpen ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {isSettingsOpen && (
              <div className="pl-6 pt-1.5 space-y-1 animate-in fade-in duration-150">
                <Link
                  to="/settings/sectors"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    location.pathname === '/settings/sectors'
                      ? 'bg-primary-100/70 text-primary-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-slate-400" />
                  Setores
                </Link>
                <Link
                  to="/settings/employees"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    location.pathname === '/settings/employees'
                      ? 'bg-primary-100/70 text-primary-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-4 h-4 text-slate-400" />
                  Funcionários
                </Link>
              </div>
            )}
          </div>
        </nav>
        <div className="p-4 border-t border-slate-100 space-y-4">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
              {user?.name ? user.name.charAt(0) : '?'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.name || 'Usuário'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.role || 'Visitante'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto print:overflow-visible print:p-0">
        <header className="h-16 bg-white border-b border-slate-200 md:hidden flex items-center px-4 print:hidden">
           {/* Mobile header could go here */}
           <h1 className="text-lg font-bold text-primary-600">TicketFlow</h1>
        </header>
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto print:p-0 print:max-w-none print:w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
