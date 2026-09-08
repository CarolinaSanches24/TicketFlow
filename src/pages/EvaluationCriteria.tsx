import React, { useState, useEffect } from 'react';
import Layout from '../components/layouts/Layout';
import { evaluationCriteriaConfigService } from '../services/api';
import { EvaluationCriteriaConfig, ApprovalType, FrequencyType, EvaluationPeriod, EvaluationType } from '../types';
import { Calculator, Plus, Trash2, Pencil, Save, Settings, X, FileText } from 'lucide-react';
import { EVALUATION_FORMULAS, ROUNDING_TYPES } from '../utils/evaluationConstants';

export default function EvaluationCriteria() {
  const [configs, setConfigs] = useState<EvaluationCriteriaConfig[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [formVisible, setFormVisible] = useState(false);
  const [notaSettingsVisible, setNotaSettingsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<EvaluationCriteriaConfig>>({});
  
  // Simulation states
  const [simulationVisible, setSimulationVisible] = useState(false);
  const [simulationConfig, setSimulationConfig] = useState<EvaluationCriteriaConfig | null>(null);
  const [simulationGrades, setSimulationGrades] = useState<{ [key: string]: number }>({});
  const [simulationResult, setSimulationResult] = useState<string | null>(null);
  const [simulationLog, setSimulationLog] = useState<string[]>([]);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const data = await evaluationCriteriaConfigService.getAll();
      setConfigs(data);
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar configurações de critério.');
    } finally {
      setLoading(false);
    }
  };

  const openForm = (item?: EvaluationCriteriaConfig) => {
    if (item) {
      setEditId(item.id);
      setFormData(item);
    } else {
      setEditId(null);
      setFormData({
        approval_type: 'MATRICULA',
        frequency_type: 'HORA_AULA',
        evaluation_period: 'BIMESTRE',
        period_quantity: 4,
        evaluation_type: 'NOTA',
        annual_calc_type: EVALUATION_FORMULAS[0],
        final_calc_type: EVALUATION_FORMULAS[0],
        decimal_places: 1,
        final_decimal_places: 1,
        final_rounding_type: ROUNDING_TYPES[0],
        period_rounding_type: ROUNDING_TYPES[0]
      });
    }
    setFormVisible(true);
  };

  const closeForm = () => {
    setFormVisible(false);
    setNotaSettingsVisible(false);
    setEditId(null);
    setFormData({});
  };

  const openSimulate = (config: EvaluationCriteriaConfig) => {
    setSimulationConfig(config);
    setSimulationGrades({});
    setSimulationResult(null);
    setSimulationLog([]);
    setSimulationVisible(true);
  };

  const closeSimulate = () => {
    setSimulationVisible(false);
    setSimulationConfig(null);
  };

  const calculateSimulation = () => {
    if (!simulationConfig) return;
    const logs: string[] = [];
    
    // Simple mock calculation logic for the demonstration
    const sum = Object.values(simulationGrades).reduce((acc, val) => acc + (Number(val) || 0), 0);
    const hasRec = simulationGrades['recuperacao'] !== undefined;
    
    let baseAvg = sum / (simulationConfig.period_quantity || 1);
    logs.push(`Nota do Período = (Soma das Notas) / ${simulationConfig.period_quantity || 1} = ${baseAvg.toFixed(2)}`);
    
    if (hasRec && simulationGrades['recuperacao'] > baseAvg) {
       logs.push(`Recuperação Final (${simulationGrades['recuperacao']}) foi maior que a Nota do Período (${baseAvg.toFixed(2)}).`);
       baseAvg = (baseAvg + Number(simulationGrades['recuperacao'])) / 2; // naive substitution example
       logs.push(`Nova Nota = (Nota do Período + Recuperação) / 2 = ${baseAvg.toFixed(2)} (Fórmula base de Recuperação)`);
    } else if (hasRec) {
       logs.push(`A Recuperação Final não alterou a nota final (Recuperação era menor ou igual).`);
    }
    
    let result = baseAvg.toFixed(simulationConfig.final_decimal_places ?? 1);
    
    if (simulationConfig.evaluation_type === 'CONCEITO') {
      logs.push(`A avaliação é do tipo CONCEITO. Convertendo nota ${result}...`);
      const isFinalConcept = simulationConfig.concept_is_final;
      if (isFinalConcept && simulationConfig.concepts && simulationConfig.concepts.length > 0) {
        const found = simulationConfig.concepts.find(c => baseAvg >= c.min_value && baseAvg <= c.max_value);
        if (found) {
          logs.push(`A nota ${baseAvg.toFixed(2)} se encaixa no conceito "${found.acronym}" (${found.min_value} a ${found.max_value}).`);
          result = found.acronym;
        } else {
          logs.push(`Nenhum conceito abrange o valor ${baseAvg.toFixed(2)}.`);
          result = 'Sem Conceito';
        }
      }
    }
    setSimulationResult(result);
    setSimulationLog(logs);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      // Clean up fields if not NOTA
      const payload = { ...formData };
      if (payload.evaluation_type !== 'NOTA' && payload.evaluation_type !== 'CONCEITO') {
        payload.annual_calc_type = undefined;
        payload.final_calc_type = undefined;
        payload.decimal_places = undefined;
        payload.final_decimal_places = undefined;
        payload.final_rounding_type = undefined;
        payload.period_rounding_type = undefined;
        payload.concept_is_final = undefined;
        payload.concept_has_final_recovery = undefined;
        payload.concepts = [];
      }

      if (editId) {
        await evaluationCriteriaConfigService.update(editId, payload);
      } else {
        await evaluationCriteriaConfigService.create(payload);
      }
      closeForm();
      loadConfigs();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar configuração.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta configuração?')) return;
    try {
      await evaluationCriteriaConfigService.delete(id);
      loadConfigs();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir configuração.');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
              <Calculator className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Critérios Avaliativos</h1>
              <p className="text-slate-500 text-sm">Configuração de estruturas de avaliação institucionais avançadas.</p>
            </div>
          </div>
          <button 
            onClick={() => openForm()}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-[0.98]"
          >
            <Plus className="w-5 h-5" /> Novo Critério
          </button>
        </div>

        {formVisible && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm animate-in fade-in relative">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-600" />
                {editId ? 'Editar Critério' : 'Novo Critério Avaliativo'}
              </h2>
              <button onClick={closeForm} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nome do Padrão / Critério</label>
                <input required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500" placeholder="Ex: Padrão Ensino Médio - SP" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo de Aprovação</label>
                    <select required value={formData.approval_type || ''} onChange={e => setFormData({...formData, approval_type: e.target.value as ApprovalType})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 bg-slate-50">
                        <option value="MATRICULA">Matrícula</option>
                        <option value="DISCIPLINA">Disciplina</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo de Frequência</label>
                    <select required value={formData.frequency_type || ''} onChange={e => setFormData({...formData, frequency_type: e.target.value as FrequencyType})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 bg-slate-50">
                        <option value="HORA_AULA">Hora Aula</option>
                        <option value="DIA_LETIVO">Dia Letivo</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Período de Avaliação</label>
                    <select required value={formData.evaluation_period || ''} onChange={e => setFormData({...formData, evaluation_period: e.target.value as EvaluationPeriod})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 bg-slate-50">
                        <option value="BIMESTRE">Bimestre</option>
                        <option value="TRIMESTRE">Trimestre</option>
                        <option value="SEMESTRE">Semestre</option>
                        <option value="MODULO_UNICO">Módulo Único</option>
                        <option value="UNIDADE">Unidade</option>
                    </select>
                 </div>
                 
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Quantidade de períodos</label>
                    <input type="number" required min="1" max="10" value={formData.period_quantity || 1} onChange={e => setFormData({...formData, period_quantity: Number(e.target.value)})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500" />
                 </div>
                 <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Tipos de avaliações</label>
                    <select required value={formData.evaluation_type || ''} onChange={e => {
                        const val = e.target.value as EvaluationType;
                        setFormData({...formData, evaluation_type: val});
                        if (val === 'NOTA') setNotaSettingsVisible(true);
                      }} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 bg-slate-50">
                        <option value="NOTA">Nota</option>
                        <option value="CONCEITO">Conceito</option>
                        <option value="HABILIDADES_E_COMPETENCIAS">Habilidades e Competências</option>
                        <option value="PERSONALIZADO">Personalizado</option>
                        <option value="AVALIACAO_CONTINUA">Avaliação Contínua</option>
                        <option value="AVALIACAO_DIAGNOSTICA">Avaliação Diagnóstica</option>
                    </select>
                 </div>
                 
                 {(formData.evaluation_type === 'NOTA' || formData.evaluation_type === 'CONCEITO') && (
                   <div className="flex items-end">
                     <button 
                       type="button" 
                       onClick={() => setNotaSettingsVisible(true)}
                       className="w-full py-2.5 px-4 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold rounded-xl transition-colors border border-amber-300"
                     >
                       Parametrizar {formData.evaluation_type === 'CONCEITO' ? 'Conceito' : 'Notas'}
                     </button>
                   </div>
                 )}
              </div>

              {/* SETTINGS MODAL FOR "NOTA" OR "CONCEITO" */}
              {notaSettingsVisible && (formData.evaluation_type === 'NOTA' || formData.evaluation_type === 'CONCEITO') && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                     <div className="p-5 bg-gradient-to-r from-amber-500 to-amber-600 flex justify-between items-center text-white shrink-0">
                        <h2 className="font-bold text-lg flex items-center gap-2"><Calculator className="w-5 h-5"/> Parâmetros de Notas e configurações</h2>
                        <button type="button" onClick={() => setNotaSettingsVisible(false)} className="p-1 hover:bg-white/20 rounded-lg text-white">
                          <X className="w-6 h-6" />
                        </button>
                     </div>
                     <div className="p-6 overflow-y-auto space-y-6 bg-slate-50">
                        
                        <div className="bg-white p-5 rounded-xl border border-slate-200">
                          <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 text-sm uppercase tracking-wide">Fórmulas de Cálculo</h3>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1">Cálculo do total de notas anual:</label>
                              <select 
                                value={formData.annual_calc_type || EVALUATION_FORMULAS[0]} 
                                onChange={e => setFormData({...formData, annual_calc_type: e.target.value})} 
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 text-sm"
                              >
                                {EVALUATION_FORMULAS.map(f => <option key={`ann_${f}`} value={f}>{f}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1">Cálculo da nota final (total de notas anual + recuperação):</label>
                              <select 
                                value={formData.final_calc_type || EVALUATION_FORMULAS[0]} 
                                onChange={e => setFormData({...formData, final_calc_type: e.target.value})} 
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 text-sm"
                              >
                                {EVALUATION_FORMULAS.map(f => <option key={`fin_${f}`} value={f}>{f}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-slate-200">
                          <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 text-sm uppercase tracking-wide">Casas Decimais & Exibição</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                               <label className="block text-sm font-semibold text-slate-700 mb-1">Quantidade de Casas decimais (Período)</label>
                               <input type="number" min="0" max="4" value={formData.decimal_places ?? 1} onChange={e => setFormData({...formData, decimal_places: Number(e.target.value)})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500" />
                            </div>
                            <div>
                               <label className="block text-sm font-semibold text-slate-700 mb-1">Quantidade de Casas decimais (Nota Final)</label>
                               <input type="number" min="0" max="4" value={formData.final_decimal_places ?? 1} onChange={e => setFormData({...formData, final_decimal_places: Number(e.target.value)})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500" />
                            </div>
                          </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-slate-200">
                          <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 text-sm uppercase tracking-wide">Arredondamentos</h3>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo de Arredondamento no período:</label>
                              <select 
                                value={formData.period_rounding_type || ROUNDING_TYPES[0]} 
                                onChange={e => setFormData({...formData, period_rounding_type: e.target.value})} 
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 text-sm"
                              >
                                {ROUNDING_TYPES.map(r => <option key={`per_${r}`} value={r}>{r}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo de Arredondamento na nota Final:</label>
                              <select 
                                value={formData.final_rounding_type || ROUNDING_TYPES[0]} 
                                onChange={e => setFormData({...formData, final_rounding_type: e.target.value})} 
                                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 text-sm"
                              >
                                {ROUNDING_TYPES.map(r => <option key={`finr_${r}`} value={r}>{r}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>

                        {formData.evaluation_type === 'CONCEITO' && (
                          <div className="bg-white p-5 rounded-xl border border-slate-200 mt-4">
                            <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4 text-sm uppercase tracking-wide">Opções de Conceito</h3>
                            <div className="flex gap-4">
                              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <input type="checkbox" checked={formData.concept_is_final || false} onChange={e => setFormData({...formData, concept_is_final: e.target.checked})} className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500" />
                                Nota final em conceito?
                              </label>
                              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                <input type="checkbox" checked={formData.concept_has_final_recovery || false} onChange={e => setFormData({...formData, concept_has_final_recovery: e.target.checked})} className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500" />
                                Possui recuperação final?
                              </label>
                            </div>
                            
                            <div className="mt-6">
                              <h4 className="font-bold text-slate-800 text-sm mb-2">Parâmetros dos conceitos</h4>
                              <div className="space-y-3">
                                {(formData.concepts || []).map((c, i) => (
                                  <div key={i} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    <input placeholder="Sigla" value={c.acronym} onChange={e => {
                                      const newC = [...(formData.concepts||[])]; newC[i].acronym = e.target.value; setFormData({...formData, concepts: newC}); 
                                    }} className="w-16 px-2 py-1.5 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-amber-500"/>
                                    <input placeholder="Descrição" value={c.description} onChange={e => {
                                      const newC = [...(formData.concepts||[])]; newC[i].description = e.target.value; setFormData({...formData, concepts: newC}); 
                                    }} className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-amber-500"/>
                                    <input placeholder="Período" value={c.period} onChange={e => {
                                      const newC = [...(formData.concepts||[])]; newC[i].period = e.target.value; setFormData({...formData, concepts: newC}); 
                                    }} className="w-24 px-2 py-1.5 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-amber-500"/>
                                    <input type="number" placeholder="Mín" value={c.min_value} onChange={e => {
                                      const newC = [...(formData.concepts||[])]; newC[i].min_value = Number(e.target.value); setFormData({...formData, concepts: newC}); 
                                    }} className="w-20 px-2 py-1.5 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-amber-500"/>
                                    <input type="number" placeholder="Máx" value={c.max_value} onChange={e => {
                                      const newC = [...(formData.concepts||[])]; newC[i].max_value = Number(e.target.value); setFormData({...formData, concepts: newC}); 
                                    }} className="w-20 px-2 py-1.5 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-amber-500"/>
                                    <button type="button" onClick={() => {
                                      const newC = formData.concepts?.filter((_, idx) => idx !== i);
                                      setFormData({...formData, concepts: newC});
                                    }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"><X className="w-4 h-4"/></button>
                                  </div>
                                ))}
                                <button type="button" onClick={() => {
                                  const newC = [...(formData.concepts||[]), {acronym: '', description: '', period: '', min_value: 0, max_value: 10}];
                                  setFormData({...formData, concepts: newC});
                                }} className="text-sm font-bold text-amber-600 hover:text-amber-700 px-2 py-1">+ Adicionar Conceito</button>
                              </div>
                            </div>
                          </div>
                        )}
                     </div>
                     <div className="p-5 border-t border-slate-200 bg-white flex justify-end shrink-0">
                       <button type="button" onClick={() => setNotaSettingsVisible(false)} className="px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800">
                         Confirmar Parâmetros
                       </button>
                     </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                 <button type="button" onClick={closeForm} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancelar</button>
                 <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all active:scale-[0.98] disabled:opacity-50">
                   <Save className="w-4 h-4" /> {isSubmitting ? 'Salvando...' : 'Salvar Critério'}
                 </button>
              </div>
            </form>
          </div>
        )}

        {/* Existing Configs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
             <div className="col-span-full text-center p-8 text-slate-500">Carregando critérios...</div>
          ) : configs.length === 0 ? (
             <div className="col-span-full text-center p-12 bg-white rounded-2xl border border-slate-200">
               <Calculator className="w-12 h-12 text-slate-300 mx-auto mb-3" />
               <h3 className="text-lg font-bold text-slate-900 mb-1">Nenhum critério cadastrado</h3>
               <p className="text-slate-500">Crie regras de avaliação base para atrelar a entidades ou turmas.</p>
             </div>
          ) : (
            configs.map(config => (
              <div key={config.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-amber-300 transition-colors flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-slate-900 text-lg leading-tight">{config.name}</h3>
                  <div className="flex gap-1 ml-2 shrink-0">
                    <button onClick={() => openSimulate(config)} title="Simular" className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-lg"><Calculator className="w-4 h-4" /></button>
                    <button onClick={() => openForm(config)} title="Editar" className="p-1.5 text-slate-400 hover:text-amber-600 bg-slate-50 hover:bg-amber-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(config.id)} title="Excluir" className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                
                <div className="flex-1 space-y-2 mb-4">
                   <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Aprovação / Frequência:</span>
                      <span className="font-semibold text-slate-700">{config.approval_type} / {config.frequency_type.replace('_', ' ')}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Avaliação:</span>
                      <span className="font-semibold text-slate-700">{config.evaluation_type.replace(/_/g, ' ')}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Formato / Períodos:</span>
                      <span className="font-semibold text-slate-700">{config.evaluation_period} ({config.period_quantity}x)</span>
                   </div>
                   {config.evaluation_type === 'NOTA' && config.final_calc_type && (
                     <div className="mt-4 pt-3 border-t border-slate-100 flex items-start gap-2">
                       <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                       <span className="text-xs text-slate-500 line-clamp-2" title={config.final_calc_type}>{config.final_calc_type}</span>
                     </div>
                   )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {simulationVisible && simulationConfig && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                 <div>
                   <h2 className="font-bold text-xl text-slate-900">Simular Critério</h2>
                   <p className="text-sm text-slate-500">{simulationConfig.name}</p>
                 </div>
                 <button onClick={closeSimulate} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
                   <X className="w-5 h-5" />
                 </button>
              </div>
              <div className="space-y-4 mb-6">
                 {Array.from({ length: simulationConfig.period_quantity || 1 }).map((_, i) => (
                   <div key={i}>
                     <label className="block text-sm font-semibold text-slate-700 mb-1">Nota Período {i+1}</label>
                     <input type="number" 
                       value={simulationGrades[`per_${i}`] || ''} 
                       onChange={e => setSimulationGrades({...simulationGrades, [`per_${i}`]: Number(e.target.value)})}
                       className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm" />
                   </div>
                 ))}
                 {(simulationConfig.evaluation_type === 'NOTA' || (simulationConfig.evaluation_type === 'CONCEITO' && simulationConfig.concept_has_final_recovery)) && (
                   <div>
                     <label className="block text-sm font-semibold text-slate-700 mb-1">Nota Recuperação Final</label>
                     <input type="number" 
                       value={simulationGrades['recuperacao'] || ''} 
                       onChange={e => setSimulationGrades({...simulationGrades, 'recuperacao': Number(e.target.value)})}
                       className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm" />
                   </div>
                 )}
              </div>
              <button 
                onClick={calculateSimulation} 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-[0.98]"
              >
                Calcular Resultado
              </button>
              {simulationResult && (
                <div className="mt-6 p-5 bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm text-center">
                  <p className="text-sm font-semibold text-indigo-800 uppercase tracking-widest mb-1">Resultado Final</p>
                  <p className="text-3xl font-black text-indigo-900">{simulationResult}</p>
                  
                  {simulationLog.length > 0 && (
                    <div className="mt-4 text-left text-xs bg-white/60 p-3 rounded-lg text-slate-700">
                      <p className="font-bold mb-1">Cálculo Realizado:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        {simulationLog.map((log, idx) => (
                           <li key={idx}>{log}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
           </div>
        </div>
      )}
    </Layout>
  );
}
