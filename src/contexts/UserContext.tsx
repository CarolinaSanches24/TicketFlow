import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

import { UserRole } from '../types';

interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
}

interface UserContextType {
  user: User | null;
  token: string | null;
  login: (userData: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const extractUserFromSession = (session: any): User | null => {
    if (!session?.user) return null;
    const { user } = session;
    return {
      id: user.id,
      email: user.email || '',
      name: user.user_metadata?.name || 'Usuário',
      role: (user.user_metadata?.role || 'ANALYST') as UserRole,
    };
  };

  const refreshUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, role')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: profile.name,
            role: (profile.role || 'ANALYST') as UserRole,
          });
        }
      }
    } catch (err) {
      console.error('[UserContext] Erro ao atualizar perfil:', err);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (session) {
          setToken(session.access_token);
          setUser(extractUserFromSession(session));
        }
      } catch (err) {
        console.error('[UserContext] Erro na inicialização:', err);
      } finally {
        if (mounted) {
          setLoading(false);
          console.log('[UserContext] Inicialização concluída, loading: false');
        }
      }
    }

    initializeAuth();

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[UserContext] Evento Auth: ${event}`);
      
      if (!mounted) return;

      if (session) {
        setToken(session.access_token);
        setUser(extractUserFromSession(session));
      } else {
        setToken(null);
        setUser(null);
      }
      
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = (userData: User, token: string) => {
    setUser(userData);
    setToken(token);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setToken(null);
  };

  return (
    <UserContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, loading, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
