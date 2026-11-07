import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layouts/Layout';
import { 
  entityService, 
  entityEvaluationsService, 
  entityDocumentsService, 
  entityUnitsService, 
  entityModulesService 
} from '../services/api';
import { 
  ArrowLeft, FileText, ClipboardList, Building2, PackagePlus, 
  Plus, Trash2, Pencil, CheckCircle2, ChevronRight, Save, X,
  Download, Upload, FileSpreadsheet
} from 'lucide-react';
import { downloadUnitsCsvTemplate } from '../utils/csvUnitsParser';
import BatchUnitImportModal from '../components/entities/BatchUnitImportModal';

type TabState = 'evaluations' | 'modules' | 'units' | 'documents';

export default function EntityDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<TabState>('units');
  const [entity, setEntity] = useState<any>(null);
  
  // Data States
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  // Modals & UI states
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Forms
  const [formVisible, setFormVisible] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (id) {
      loadEntityData();
    }
  }, [id, activeTab]);

  const loadEntityData = async () => {
    try {
      setLoading(true);
      // Ensure entity root details are mapped for the Header
      if (!entity) {
        const ents = await entityService.getAll();
        const found = ents.find((e: any) => e.id === id);
        if (found) setEntity(found);
      }

      // Load specific tab data
      if (activeTab === 'evaluations') setEvaluations(await entityEvaluationsService.getByEntity(id!));
      if (activeTab === 'modules') setModules(await entityModulesService.getByEntity(id!));
      if (activeTab === 'units') setUnits(await entityUnitsService.getByEntity(id!));
      if (activeTab === 'documents') setDocuments(await entityDocumentsService.getByEntity(id!));

    } catch (err) {
      console.error(err);
      alert('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const openForm = (item?: any) => {
    setEditId(item ? item.id : null);
    if (item) {
      setFormData(item);
    } else {
      setFormData({ entity_id: id }); // reset with binding link
    }
    setFormVisible(true);
  };

  const closeForm = () => {
    setFormVisible(false);
    setFormData({});
    setEditId(null);
  };

  // Generic Save Handler spanning via tabs
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      let service: any;
      if (activeTab === 'evaluations') service = entityEvaluationsService;
      if (activeTab === 'modules') service = entityModulesService;
      if (activeTab === 'units') service = entityUnitsService;
      if (activeTab === 'documents') service = entityDocumentsService;

      if (editId) {
        await service.update(editId, formData);
      } else {
        await service.create({ ...formData, entity_id: id });
      }
      closeForm();
      loadEntityData();
    } catch (err) {
      alert('Erro ao salvar os dados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Deseja realmente excluir este item?')) return;
    try {
      if (activeTab === 'evaluations') await entityEvaluationsService.delete(itemId);
      if (activeTab === 'modules') await entityModulesService.delete(itemId);
      if (activeTab === 'units') await entityUnitsService.delete(itemId);
      if (activeTab === 'documents') await entityDocumentsService.delete(itemId);
      loadEntityData();
    } catch (err) {
      alert('Erro ao remover o item');
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Header Breadcrumb */}
        <div className="flex items-center gap-4 text-slate-500 mb-2">
          <button onClick={() => navigate('/entities')} className="hover:text-primary-600 transition-colors flex items-center gap-1 text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Entidades
          </button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-slate-900 font-bold text-lg">{entity?.name || 'Carregando...'}</span>
        </div>

        {/* Global Nav Tabs */}
        <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex overflow-x-auto select-none">
          <button 
            onClick={() => { setActiveTab('units'); closeForm(); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'units' ? 'bg-primary-50 text-primary-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <Building2 className="w-4 h-4" /> Unidades Oferecidas
          </button>
          <button 
            onClick={() => { setActiveTab('modules'); closeForm(); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'modules' ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <PackagePlus className="w-4 h-4" /> Módulos Contratados
          </button>
          <button 
            onClick={() => { setActiveTab('evaluations'); closeForm(); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'evaluations' ? 'bg-amber-50 text-amber-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <ClipboardList className="w-4 h-4" /> Regras e Critérios
          </button>
          <button 
            onClick={() => { setActiveTab('documents'); closeForm(); }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'documents' ? 'bg-emerald-50 text-emerald-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <FileText className="w-4 h-4" /> Repositório Documental
          </button>
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 min-h-[500px]">
          
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {activeTab === 'units' && 'Gestão de Unidades Integradas'}
                {activeTab === 'modules' && 'Plugins e Módulos Extras do Cliente'}
                {activeTab === 'evaluations' && 'Sistemáticas de Avaliação Próprias'}
                {activeTab === 'documents' && 'Documentos Institucionais Formais'}
              </h2>
            </div>
            {!formVisible && (
              <div className="flex items-center gap-2.5">
                {activeTab === 'units' && (
                  <>
                    <button 
                      type="button"
                      onClick={downloadUnitsCsvTemplate}
                      className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl font-semibold shadow-xs transition-all active:scale-[0.98] text-sm"
                      title="Baixar arquivo modelo de importação CSV pré-formatado"
                    >
                      <Download className="w-4 h-4 text-slate-500" /> Baixar Modelo CSV
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsImportModalOpen(true)}
                      className="flex items-center gap-2 bg-primary-50 hover:bg-primary-100 text-primary-700 border border-primary-200 px-3.5 py-2 rounded-xl font-semibold shadow-xs transition-all active:scale-[0.98] text-sm"
                      title="Importar lista de unidades via arquivo CSV"
                    >
                      <Upload className="w-4 h-4 text-primary-600" /> Importar CSV
                    </button>
                  </>
                )}
                <button 
                  onClick={() => openForm()}
                  className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-semibold shadow-md transition-all active:scale-[0.98] text-sm"
                >
                  <Plus className="w-4 h-4" /> Adicionar
                </button>
              </div>
            )}
          </div>

          <div className="p-6 bg-slate-50/30">
            {formVisible ? (
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm animate-in fade-in">
                <form onSubmit={handleSave} className="space-y-4">
                  
                  {/* DYNAMIC FORMS BASED ON TAB */}
                  {activeTab === 'units' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Nome da Unidade / Polo</label>
                        <input required value={formData.unit_name || ''} onChange={e => setFormData({...formData, unit_name: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500" placeholder="Ex: Escola Estadual ABC" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Diretor(a)</label>
                        <input value={formData.director_name || ''} onChange={e => setFormData({...formData, director_name: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Secretário(a)</label>
                        <input value={formData.secretary_name || ''} onChange={e => setFormData({...formData, secretary_name: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Cursos Oferecidos (Resumo)</label>
                        <textarea rows={2} value={formData.course_offers || ''} onChange={e => setFormData({...formData, course_offers: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 resize-none" placeholder="Ensino Médio, Técnico..." />
                      </div>
                    </div>
                  )}

                  {activeTab === 'modules' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Nome do Módulo (ex: AEE, PEI)</label>
                        <input required value={formData.module_name || ''} onChange={e => setFormData({...formData, module_name: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Descrição Breve</label>
                        <input value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Data da Contratação</label>
                        <input type="date" value={formData.contract_date || ''} onChange={e => setFormData({...formData, contract_date: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Status Operacional</label>
                        <select value={formData.status || ''} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500">
                          <option value="ACTIVE">Ativo / Rodando</option>
                          <option value="IMPLANTATION">Em Implantação</option>
                          <option value="CANCELED">Cancelado</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {activeTab === 'evaluations' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Sistemática e Algoritmo</label>
                        <textarea required rows={4} value={formData.evaluation_system || ''} onChange={e => setFormData({...formData, evaluation_system: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 resize-none" placeholder="Descreva os cálculos de média da rede..." />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Critérios Normativos e BNCC</label>
                        <textarea rows={4} value={formData.evaluation_criteria || ''} onChange={e => setFormData({...formData, evaluation_criteria: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 resize-none" placeholder="Recuperação pararela, bimestral..." />
                      </div>
                    </div>
                  )}

                  {activeTab === 'documents' && (
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Nome do Documento Oficial / Matriz</label>
                        <input required value={formData.document_name || ''} onChange={e => setFormData({...formData, document_name: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo Identificador</label>
                        <select value={formData.document_type || ''} onChange={e => setFormData({...formData, document_type: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500">
                          <option value="MATRIZ">Matriz Curricular</option>
                          <option value="REGIMENTO">Regimento Interno</option>
                          <option value="LEGISLACAO">Legislação Específica</option>
                          <option value="OUTRO">Outro / Avulso</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Link de Hospedagem (URL)</label>
                        <input type="url" placeholder="https://drive.google.com/..." value={formData.file_url || ''} onChange={e => setFormData({...formData, file_url: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500" />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                     <button type="button" onClick={closeForm} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancelar</button>
                     <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg transition-all active:scale-[0.98] disabled:opacity-50">
                       <Save className="w-4 h-4" /> {isSubmitting ? 'Salvando...' : 'Salvar Informação'}
                     </button>
                  </div>
                </form>
              </div>
            ) : (
              <div>
                {/* LISTS RENDERING */}
                {loading ? ( <div className="text-center p-8 text-slate-500">Buscando registros do banco...</div> ) : (
                  <>
                    {/* Units Table */}
                    {activeTab === 'units' && (
                       units.length === 0 ? (
                         <div className="text-center p-10 bg-white rounded-2xl border border-dashed border-slate-200">
                           <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                             <Building2 className="w-6 h-6" />
                           </div>
                           <h4 className="font-bold text-slate-800 text-base">Nenhuma unidade escolar encontrada</h4>
                           <p className="text-sm text-slate-500 mt-1 mb-5 max-w-md mx-auto">
                             Cadastre as unidades escolares desta rede manualmente ou faça a importação em lote via arquivo CSV.
                           </p>
                           <div className="flex flex-wrap items-center justify-center gap-3">
                             <button
                               type="button"
                               onClick={downloadUnitsCsvTemplate}
                               className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-xl text-sm font-semibold shadow-xs transition-colors"
                             >
                               <Download className="w-4 h-4 text-slate-500" /> Baixar Modelo CSV
                             </button>
                             <button
                               type="button"
                               onClick={() => setIsImportModalOpen(true)}
                               className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors"
                             >
                               <Upload className="w-4 h-4" /> Importar via CSV
                             </button>
                             <button
                               type="button"
                               onClick={() => openForm()}
                               className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors"
                             >
                               <Plus className="w-4 h-4" /> Adicionar Manual
                             </button>
                           </div>
                         </div>
                       ) : (
                        <div className="space-y-3">
                          {units.map(item => (
                            <div key={item.id} className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between hover:border-primary-300 transition-colors">
                               <div className="space-y-1">
                                 <div className="flex items-center gap-2.5">
                                   <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                                     <Building2 className="w-4 h-4 text-primary-500"/> {item.unit_name}
                                   </h4>
                                   {item.status && (
                                     <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                       item.status === 'ACTIVE' 
                                         ? 'bg-emerald-100 text-emerald-700' 
                                         : 'bg-slate-100 text-slate-600'
                                     }`}>
                                       {item.status === 'ACTIVE' ? 'Ativa' : item.status}
                                     </span>
                                   )}
                                 </div>
                                 <p className="text-sm text-slate-600">
                                   Diretor(a): <b>{item.director_name || 'N/A'}</b> • Seç.: <b>{item.secretary_name || 'N/A'}</b>
                                 </p>
                                 {item.course_offers && (
                                   <p className="text-xs text-slate-500">
                                     Cursos: <span className="text-slate-700 font-medium">{item.course_offers}</span>
                                   </p>
                                 )}
                               </div>
                               <div className="flex gap-2">
                                 <button onClick={() => openForm(item)} className="p-2 text-slate-400 hover:text-primary-600 bg-slate-50 hover:bg-primary-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                                 <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                               </div>
                            </div>
                          ))}
                        </div>
                       )
                    )}

                    {/* Modules Table */}
                    {activeTab === 'modules' && (
                       modules.length === 0 ? <p className="text-center text-slate-500 p-8">Esta entidade não possui módulos extras ativados no momento.</p> :
                       <div className="space-y-3">
                         {modules.map(item => (
                           <div key={item.id} className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between hover:border-indigo-300 transition-colors">
                              <div>
                                <h4 className="font-bold text-slate-900 flex items-center gap-2"><PackagePlus className="w-4 h-4 text-indigo-500"/> {item.module_name}</h4>
                                <p className="text-sm text-slate-600 mt-1">{item.description || 'Sem descrição'}</p>
                              </div>
                              <div className="flex gap-4 items-center">
                                <span className={`text-xs font-bold px-2 py-1 rounded-md ${item.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : item.status === 'IMPLANTATION' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{item.status || 'INDEFINIDO'}</span>
                                <div className="flex gap-2">
                                  <button onClick={() => openForm(item)} className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-lg"><Pencil className="w-4 h-4" /></button>
                                  <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </div>
                           </div>
                         ))}
                       </div>
                    )}

                    {/* Evaluations Specs */}
                    {activeTab === 'evaluations' && (
                       evaluations.length === 0 ? <p className="text-center text-slate-500 p-8">Nenhuma sistemática preenchida. Adicione para criar a documentação core do hub.</p> :
                       <div className="space-y-4">
                         {evaluations.map(item => (
                           <div key={item.id} className="bg-white border border-slate-200 p-6 rounded-xl flex items-start gap-4 hover:border-amber-300 transition-colors relative group">
                              <div className="p-3 bg-amber-50 text-amber-600 rounded-lg shrink-0">
                                <ClipboardList className="w-6 h-6" />
                              </div>
                              <div className="flex-1">
                                <div className="grid md:grid-cols-2 gap-6">
                                  <div>
                                    <h5 className="font-bold text-slate-900 mb-2 uppercase text-xs tracking-wider">Sistemática e Peso</h5>
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{item.evaluation_system}</p>
                                  </div>
                                  <div>
                                    <h5 className="font-bold text-slate-900 mb-2 uppercase text-xs tracking-wider">Critérios Especiais</h5>
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{item.evaluation_criteria}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2 absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openForm(item)} className="p-2 text-slate-400 hover:text-amber-600 bg-slate-50 hover:bg-amber-50 rounded-lg shadow-sm border border-slate-100"><Pencil className="w-4 h-4" /></button>
                                <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-lg shadow-sm border border-slate-100"><Trash2 className="w-4 h-4" /></button>
                              </div>
                           </div>
                         ))}
                       </div>
                    )}

                    {/* Documents */}
                    {activeTab === 'documents' && (
                       documents.length === 0 ? <p className="text-center text-slate-500 p-8">Nenhum documento registrado. Cole os links de matrizes aprovadas clicando em Adicionar.</p> :
                       <div className="space-y-3">
                         {documents.map(item => (
                           <div key={item.id} className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between hover:border-emerald-300 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-slate-900 hover:text-emerald-700 hover:underline cursor-pointer">
                                    {item.file_url ? (
                                      <a href={item.file_url} target="_blank" rel="noreferrer" title="Abrir link">{item.document_name}</a>
                                    ) : item.document_name}
                                  </h4>
                                  <p className="text-xs font-bold text-slate-500 mt-1 uppercase bg-slate-100 px-2 rounded-sm w-fit">{item.document_type || 'N/A'}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                              </div>
                           </div>
                         ))}
                       </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Importação em Lote via CSV */}
      <BatchUnitImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        entityId={id!}
        entityName={entity?.name}
        onSuccess={() => loadEntityData()}
      />
    </Layout>
  );
}
