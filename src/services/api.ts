import { supabase } from '../lib/supabaseClient';

export const authService = {
  login: async (credentials: any) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });
    
    if (error) throw error;
    
    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || 'Usuário',
        role: data.user.user_metadata?.role || 'ANALYST',
      },
      token: data.session?.access_token,
    };
  },
  
  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
  
  getAnalysts: async () => {
    const { data, error } = await supabase
      .from('user_data')
      .select('id, name')
      .order('name');
    if (error) throw error;
    return data;
  },

  getUsers: async () => {
    const { data, error } = await supabase
      .from('user_data')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
  },

  createUser: async (userData: any, creatorId: string) => {
    // Standard signUp
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          name: userData.name,
          role: userData.role
        }
      }
    });

    if (error) throw error;

    // Log the creation
    if (data.user) {
      await supabase.from('user_audit_logs').insert([{
        target_user_id: data.user.id,
        target_user_email: userData.email,
        action: 'CREATE',
        details: `Criado com perfil ${userData.role}`,
        creator_id: creatorId
      }]);
    }

    return data.user;
  },

  updateUser: async (id: string, updates: any, creatorId: string) => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    const { data: oldData, error: fetchError } = await supabase
      .from('profiles')
      .select('name, role')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;

    const { data, error } = await supabase
      .from('profiles')
      .update({
        name: updates.name,
        role: updates.role
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;

    // If updating current user, sync metadata
    if (currentUser && currentUser.id === id) {
      const { error: authError } = await supabase.auth.updateUser({
        data: { name: updates.name, role: updates.role }
      });
      if (authError) console.error('Error syncing auth metadata:', authError);
    }

    // Log the update with specific field changes
    const changes = [];
    if (oldData.name !== updates.name) changes.push(`Nome: "${oldData.name}" -> "${updates.name}"`);
    if (oldData.role !== updates.role) changes.push(`Role: "${oldData.role}" -> "${updates.role}"`);

    await supabase.from('user_audit_logs').insert([{
      target_user_id: id,
      target_user_email: data.email,
      action: 'UPDATE',
      details: changes.length > 0 ? changes.join(' | ') : 'Nenhuma alteração detectada',
      creator_id: creatorId
    }]);

    return data;
  },

  deleteUser: async (id: string, email: string, creatorId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;

    // Log the deletion
    await supabase.from('user_audit_logs').insert([{
      target_user_id: id,
      target_user_email: email,
      action: 'DELETE',
      details: 'Perfil desativado (soft delete)',
      creator_id: creatorId
    }]);
  },

  getDeletedUsers: async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('name');
    if (error) throw error;
    return data;
  },

  restoreUser: async (id: string, email: string, creatorId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ deleted_at: null })
      .eq('id', id);
    
    if (error) throw error;

    // Log the restoration
    await supabase.from('user_audit_logs').insert([{
      target_user_id: id,
      target_user_email: email,
      action: 'UPDATE',
      details: 'Perfil restaurado',
      creator_id: creatorId
    }]);
  },

  getAuditLogs: async () => {
    const { data, error } = await supabase
      .from('user_audit_logs')
      .select(`
        *,
        creator:profiles!creator_id(name)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }
};

export const ticketService = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('tickets_list')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  create: async (ticketData: any) => {
    const { data, error } = await supabase
      .from('tickets')
      .insert([ticketData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  updateStatus: async (id: string, status: string) => {
    if (status === 'CONVERTED_TO_IMPROVEMENT') {
      const { data: ticket } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', id)
        .single();

      if (ticket) {
        await supabase.from('improvements').insert([{
          external_id: ticket.external_id,
          external_url: ticket.external_url,
          title: `Ticket: ${ticket.title}`,
          description: ticket.description,
          analyst_id: ticket.analyst_id,
          origin_type: 'TICKET',
          origin_id: id,
          status: 'OPEN'
        }]);
      }
    } else if (status === 'CONVERTED_TO_DEBT') {
      const { data: ticket } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', id)
        .single();

      if (ticket) {
        await supabase.from('debts').insert([{
          external_id: ticket.external_id,
          external_url: ticket.external_url,
          origin_type: 'TICKET',
          origin_id: id,
          description: `Ticket: ${ticket.title}`,
          analyst_id: ticket.analyst_id,
          status: 'OPEN'
        }]);
      }
    }

    const { data, error } = await supabase
      .from('tickets')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id: string, updates: any) => {
    const { data, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id: string) => {
    const { error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

export const improvementService = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('improvements_list')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  create: async (improvementData: any) => {
    const { data, error } = await supabase
      .from('improvements')
      .insert([improvementData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  updateStatus: async (id: string, status: string) => {
    if (status === 'CONVERTED_TO_DEBT') {
      const { data: improvement } = await supabase
        .from('improvements')
        .select('*')
        .eq('id', id)
        .single();

      if (improvement) {
        await supabase.from('debts').insert([{
          external_id: improvement.external_id,
          external_url: improvement.external_url,
          origin_type: 'IMPROVEMENT',
          origin_id: id,
          description: `Convertido de Melhoria: ${improvement.title}`,
          analyst_id: improvement.analyst_id,
          status: 'OPEN'
        }]);
      }
    }

    const { data, error } = await supabase
      .from('improvements')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id: string, updates: any) => {
    const { data, error } = await supabase
      .from('improvements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id: string) => {
    const { error } = await supabase
      .from('improvements')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

export const debtService = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('debts_list')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  updateStatus: async (id: string, status: string) => {
    const { data, error } = await supabase
      .from('debts')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  create: async (debtData: any) => {
    const { data, error } = await supabase
      .from('debts')
      .insert([debtData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id: string, updates: any) => {
    const { data, error } = await supabase
      .from('debts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id: string) => {
    const { error } = await supabase
      .from('debts')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

export const dataRequestService = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('data_requests_list')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  create: async (requestData: any) => {
    const { data, error } = await supabase
      .from('data_requests')
      .insert([requestData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  updateStatus: async (id: string, status: string) => {
    const { data, error } = await supabase
      .from('data_requests')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id: string, updates: any) => {
    const { data, error } = await supabase
      .from('data_requests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id: string) => {
    const { error } = await supabase
      .from('data_requests')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

export const dashboardService = {
  getStats: async (startDate?: string, endDate?: string) => {
    let ticketQuery = supabase.from('tickets_list').select('*');
    let improvementQuery = supabase.from('improvements_list').select('*');
    let debtQuery = supabase.from('debts_list').select('*');
    let dataRequestQuery = supabase.from('data_requests_list').select('*');

    if (startDate) {
      const start = `${startDate}T00:00:00.000Z`;
      ticketQuery = ticketQuery.gte('created_at', start);
      improvementQuery = improvementQuery.gte('created_at', start);
      debtQuery = debtQuery.gte('created_at', start);
    }
    if (endDate) {
      const end = `${endDate}T23:59:59.999Z`;
      ticketQuery = ticketQuery.lte('created_at', end);
      improvementQuery = improvementQuery.lte('created_at', end);
      debtQuery = debtQuery.lte('created_at', end);
      dataRequestQuery = dataRequestQuery.lte('created_at', end);
    }

    const [tickets, improvements, debts, dataRequests, analysts] = await Promise.all([
      ticketQuery,
      improvementQuery,
      debtQuery,
      dataRequestQuery,
      supabase.from('user_data').select('id, name')
    ]);

    const totals = {
      tickets: tickets.data?.length || 0,
      improvements: improvements.data?.length || 0,
      debts: debts.data?.length || 0,
      dataRequests: dataRequests.data?.length || 0,
      grandTotal: (tickets.data?.length || 0) + (improvements.data?.length || 0) + (debts.data?.length || 0) + (dataRequests.data?.length || 0)
    };

    const byStatus = {
      tickets: aggregateByStatus(tickets.data),
      improvements: aggregateByStatus(improvements.data),
      debts: aggregateByStatus(debts.data),
      dataRequests: aggregateByStatus(dataRequests.data),
    };

    // Client-side aggregation by Analyst
    const byAnalyst = analysts.data?.map(analyst => ({
      name: analyst.name,
      _count: {
        tickets: tickets.data?.filter(t => t.analyst_id === analyst.id).length || 0,
        improvements: improvements.data?.filter(i => i.analyst_id === analyst.id).length || 0,
        debts: debts.data?.filter(d => d.analyst_id === analyst.id).length || 0,
        dataRequests: dataRequests.data?.filter(dr => dr.analyst_id === analyst.id).length || 0,
      }
    })) || [];

    return {
      totals,
      byStatus,
      byAnalyst,
      lists: {
        tickets: tickets.data || [],
        improvements: improvements.data || [],
        debts: debts.data || [],
        dataRequests: dataRequests.data || []
      }
    };
  }
};

function aggregateByStatus(items: any[] | null) {
  if (!items) return [];
  const counts: any = {};
  items.forEach(item => {
    counts[item.status] = (counts[item.status] || 0) + 1;
  });
  return Object.keys(counts).map(status => ({ status, _count: counts[status] }));
}
