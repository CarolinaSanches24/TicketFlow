import { supabase, createIsolatedAuthClient } from '../lib/supabaseClient';

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

  sendPasswordResetEmail: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    if (error) throw error;
  },

  updatePassword: async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password: password
    });
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
    const emailNormalized = userData.email?.trim().toLowerCase();

    // 1. Verificar se o e-mail já existe na base de dados (ativo ou soft-deleted)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, name, deleted_at')
      .ilike('email', emailNormalized)
      .maybeSingle();

    if (existingProfile) {
      if (existingProfile.deleted_at) {
        throw new Error('Este e-mail pertence a um usuário que está na lixeira (desativado). Você pode restaurá-lo na aba "Usuários Desativados".');
      } else {
        throw new Error('Já existe um usuário ativo cadastrado com este e-mail.');
      }
    }

    // 2. Realizar cadastro com cliente isolado (não sobrescreve a sessão do admin logado)
    const isolatedClient = createIsolatedAuthClient();
    const { data, error } = await isolatedClient.auth.signUp({
      email: emailNormalized,
      password: userData.password,
      options: {
        data: {
          name: userData.name?.trim(),
          role: userData.role
        }
      }
    });

    if (error) {
      if (error.message.includes('Database error saving new user')) {
        throw new Error('Erro no banco de dados ao salvar o usuário. É necessário rodar o script de atualização da trigger no SQL Editor do Supabase (supabase/fix_user_creation_trigger.sql).');
      }
      throw error;
    }

    // Se o Supabase tiver confirmação de e-mail e o usuário já existir no Auth, identities virá vazio
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error('Este e-mail já possui cadastro no sistema de autenticação.');
    }

    // 3. Garantir o perfil na tabela profiles (upsert de segurança caso o trigger demore)
    if (data.user) {
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          name: userData.name?.trim() || 'Usuário',
          role: userData.role || 'ANALYST',
          email: emailNormalized,
          deleted_at: null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      } catch (upsertErr) {
        console.warn('[createUser] Aviso ao sincronizar perfil diretamente:', upsertErr);
      }

      // 4. Registrar log de auditoria
      try {
        await supabase.from('user_audit_logs').insert([{
          target_user_id: data.user.id,
          target_user_email: emailNormalized,
          action: 'CREATE',
          details: `Criado com perfil ${userData.role}`,
          creator_id: creatorId || null
        }]);
      } catch (logErr) {
        console.warn('[createUser] Erro ao registrar log de auditoria:', logErr);
      }
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
        await supabase.from('improvements').delete().eq('id', id);
        return { ...improvement, status };
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

export const entityService = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('entities')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  create: async (entityData: any) => {
    const { data, error } = await supabase
      .from('entities')
      .insert([entityData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id: string, updates: any) => {
    const { data, error } = await supabase
      .from('entities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  delete: async (id: string) => {
    const { error } = await supabase
      .from('entities')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

export const entityEvaluationsService = {
  getByEntity: async (entityId: string) => {
    const { data, error } = await supabase.from('entity_evaluations').select('*').eq('entity_id', entityId);
    if (error) throw error;
    return data;
  },
  create: async (payload: any) => {
    const { data, error } = await supabase.from('entity_evaluations').insert([payload]).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id: string, payload: any) => {
    const { data, error } = await supabase.from('entity_evaluations').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  delete: async (id: string) => {
    const { error } = await supabase.from('entity_evaluations').delete().eq('id', id);
    if (error) throw error;
  }
};

export const entityDocumentsService = {
  getByEntity: async (entityId: string) => {
    const { data, error } = await supabase.from('entity_documents').select('*').eq('entity_id', entityId).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  create: async (payload: any) => {
    const { data, error } = await supabase.from('entity_documents').insert([payload]).select().single();
    if (error) throw error;
    return data;
  },
  delete: async (id: string) => {
    const { error } = await supabase.from('entity_documents').delete().eq('id', id);
    if (error) throw error;
  }
};

export const entityUnitsService = {
  getByEntity: async (entityId: string) => {
    const { data, error } = await supabase.from('entity_units').select('*').eq('entity_id', entityId).order('unit_name', { ascending: true });
    if (error) throw error;
    return data;
  },
  create: async (payload: any) => {
    const { data, error } = await supabase.from('entity_units').insert([payload]).select().single();
    if (error) throw error;
    return data;
  },
  createMany: async (payloads: any[]) => {
    const chunkSize = 100;
    const results: any[] = [];
    for (let i = 0; i < payloads.length; i += chunkSize) {
      const chunk = payloads.slice(i, i + chunkSize);
      const { data, error } = await supabase.from('entity_units').insert(chunk).select();
      if (error) throw error;
      if (data) results.push(...data);
    }
    return results;
  },
  update: async (id: string, payload: any) => {
    const { data, error } = await supabase.from('entity_units').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  delete: async (id: string) => {
    const { error } = await supabase.from('entity_units').delete().eq('id', id);
    if (error) throw error;
  }
};

export const entityModulesService = {
  getByEntity: async (entityId: string) => {
    const { data, error } = await supabase.from('entity_modules').select('*').eq('entity_id', entityId).order('module_name', { ascending: true });
    if (error) throw error;
    return data;
  },
  create: async (payload: any) => {
    const { data, error } = await supabase.from('entity_modules').insert([payload]).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id: string, payload: any) => {
    const { data, error } = await supabase.from('entity_modules').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  delete: async (id: string) => {
    const { error } = await supabase.from('entity_modules').delete().eq('id', id);
    if (error) throw error;
  }
};

export const dashboardService = {
  getStats: async (startDate?: string, endDate?: string) => {
    let improvementQuery = supabase.from('improvements_list').select('*');
    let debtQuery = supabase.from('debts_list').select('*');
    let dataRequestQuery = supabase.from('data_requests_list').select('*');

    if (startDate) {
      const start = `${startDate}T00:00:00.000Z`;
      improvementQuery = improvementQuery.gte('created_at', start);
      debtQuery = debtQuery.gte('created_at', start);
    }
    if (endDate) {
      const end = `${endDate}T23:59:59.999Z`;
      improvementQuery = improvementQuery.lte('created_at', end);
      debtQuery = debtQuery.lte('created_at', end);
      dataRequestQuery = dataRequestQuery.lte('created_at', end);
    }

    const [improvements, debts, dataRequests, analysts] = await Promise.all([
      improvementQuery,
      debtQuery,
      dataRequestQuery,
      supabase.from('user_data').select('id, name')
    ]);

    const totals = {
      improvements: improvements.data?.length || 0,
      debts: debts.data?.length || 0,
      dataRequests: dataRequests.data?.length || 0,
      grandTotal: (improvements.data?.length || 0) + (debts.data?.length || 0) + (dataRequests.data?.length || 0)
    };

    const byStatus = {
      improvements: aggregateByStatus(improvements.data),
      debts: aggregateByStatus(debts.data),
      dataRequests: aggregateByStatus(dataRequests.data),
    };

    // Client-side aggregation by Analyst
    const byAnalyst = analysts.data?.map(analyst => ({
      name: analyst.name,
      _count: {
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

export const evaluationCriteriaConfigService = {
  getAll: async () => {
    const { data, error } = await supabase.from('evaluation_criteria_config').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  create: async (payload: any) => {
    const { data, error } = await supabase.from('evaluation_criteria_config').insert([payload]).select().single();
    if (error) throw error;
    return data;
  },
  update: async (id: string, payload: any) => {
    const { data, error } = await supabase.from('evaluation_criteria_config').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  delete: async (id: string) => {
    const { error } = await supabase.from('evaluation_criteria_config').delete().eq('id', id);
    if (error) throw error;
  }
};
