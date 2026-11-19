import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  BarChart2, UploadCloud, ArrowLeft, Plus, Trash2, Eye, RefreshCw,
  Search, AlertCircle, Calendar, Layers, List, GitFork, Printer
} from 'lucide-react';
import Layout from '../components/layouts/Layout';
import { ticketStorage, TicketBase, TicketItem } from '../services/ticketStorage';
import {
  parseHtmlData, parseCsvData, ORIGEM_CATEGORIES,
  cleanModuleName, cleanSubmoduleName, standardizeTicketType,
  standardizeStatus, STANDARDIZED_TICKET_TYPES
} from '../utils/ticketParser';
import HierarchicalTicketView from '../components/tickets/HierarchicalTicketView';

// ─── Cores e Categorias ──────────────────────────────────────────────────────────

const CAT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  falha: { label: 'Falha / bug', color: '#c0392b', bg: 'bg-red-50 text-red-700 border-red-200' },
  config: { label: 'Configuração incorreta', color: '#e0962b', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  duvida: { label: 'Dúvida de uso', color: '#3b6fd4', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  tarefa: { label: 'Tarefa', color: '#3aa17e', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  inativo: { label: 'Usuário inativo', color: '#8a5cc7', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
  outros: { label: 'Outros', color: '#6b7b8f', bg: 'bg-slate-50 text-slate-700 border-slate-200' },
  nc: { label: 'Não classificado', color: '#b8bfc9', bg: 'bg-gray-50 text-gray-600 border-gray-200' },
};

interface FilterState {
  modulo: string;
  submodulo: string;
  tipo: string;
  form: string;
  status: string;
  cat: string;
  dataInicio: string;
  dataFim: string;
}

export default function TicketsDashboard() {
  const [bases, setBases] = useState<TicketBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBase, setActiveBase] = useState<TicketBase | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Upload Form States
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [customBaseName, setCustomBaseName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [appendToActiveBase, setAppendToActiveBase] = useState(false);

  // Dashboard Filters & View States
  const [filters, setFilters] = useState<FilterState>({
    modulo: '',
    submodulo: '',
    tipo: '',
    form: '',
    status: '',
    cat: '',
    dataInicio: '',
    dataFim: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [displayLimit, setDisplayLimit] = useState(50);
  const [showAllSubs, setShowAllSubs] = useState(false);
  const [expandedContexts, setExpandedContexts] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'hierarchy' | 'flat'>('hierarchy');

  // Carregar lista de bases do IndexedDB
  const loadBases = useCallback(async () => {
    try {
      setLoading(true);
      const list = await ticketStorage.getAll();
      setBases(list);
    } catch (err) {
      console.error('Erro ao carregar bases:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBases();
  }, [loadBases]);

  // Excluir base
  const handleDeleteBase = async (id: string, name: string) => {
    if (confirm(`Deseja realmente remover a base "${name}"?`)) {
      try {
        await ticketStorage.delete(id);
        if (activeBase?.id === id) {
          setActiveBase(null);
        }
        await loadBases();
      } catch (err) {
        alert('Erro ao excluir base: ' + err);
      }
    }
  };

  // Processar upload de um ou mais arquivos (.html ou .csv)
  const handleProcessFile = async () => {
    if (uploadFiles.length === 0) {
      setUploadError('Selecione pelo menos um arquivo .html ou .csv.');
      return;
    }

    try {
      setUploading(true);
      setUploadError('');

      const allMergedRows: TicketItem[] = [];
      let lastParsed: any = null;
      const fileNames: string[] = [];

      for (const file of uploadFiles) {
        const fileName = file.name;
        const isHtml = fileName.toLowerCase().endsWith('.html');
        const isCsv = fileName.toLowerCase().endsWith('.csv');

        if (!isHtml && !isCsv) {
          throw new Error(`O arquivo "${fileName}" não possui formato suportado (.html ou .csv).`);
        }

        fileNames.push(fileName);
        const text = await file.text();
        const parsed = isHtml ? parseHtmlData(text) : parseCsvData(text, fileName);
        lastParsed = parsed;

        if (parsed.datasets?.tickets?.rows) {
          allMergedRows.push(...parsed.datasets.tickets.rows);
        }
      }

      if (allMergedRows.length === 0) {
        throw new Error('Nenhum chamado válido foi encontrado nos arquivos fornecidos.');
      }

      // Se for para anexar à base ativa existente
      if (appendToActiveBase && activeBase) {
        const existingRows = activeBase.datasets.tickets.rows || [];
        // Deduplicar por ID + módulo + submódulo para não duplicar chamados idênticos
        const seen = new Set<string>();
        existingRows.forEach((r) => seen.add(`${r.id}_${r.modulo}_${r.submodulo}`));

        let addedCount = 0;
        const combinedRows = [...existingRows];

        allMergedRows.forEach((r) => {
          const key = `${r.id}_${r.modulo}_${r.submodulo}`;
          if (!seen.has(key)) {
            seen.add(key);
            combinedRows.push(r);
            addedCount++;
          }
        });

        const updatedBase: TicketBase = {
          ...activeBase,
          ticketCount: combinedRows.length,
          fileName: `${activeBase.fileName} + ${fileNames.join(', ')}`,
          datasets: {
            ...activeBase.datasets,
            tickets: {
              ...activeBase.datasets.tickets,
              rows: combinedRows,
            },
          },
        };

        await ticketStorage.save(updatedBase);
        await loadBases();
        setActiveBase(updatedBase);
        setShowUploadModal(false);
        setUploadFiles([]);
        setAppendToActiveBase(false);
        setCustomBaseName('');
        alert(`${addedCount} novos chamados adicionados com sucesso à base "${activeBase.name}". Total de chamados: ${combinedRows.length}.`);
        return;
      }

      // Deduplicar linhas entre os arquivos selecionados
      const seen = new Set<string>();
      const deduplicatedRows: TicketItem[] = [];
      allMergedRows.forEach((r) => {
        const key = `${r.id}_${r.modulo}_${r.submodulo}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduplicatedRows.push(r);
        }
      });

      const primaryFileType = uploadFiles.some((f) => f.name.toLowerCase().endsWith('.html')) ? 'html' : 'csv';
      const defaultName = uploadFiles.length === 1
        ? (customBaseName.trim() || lastParsed?.metaTitle || uploadFiles[0].name.replace(/\.[^/.]+$/, ''))
        : (customBaseName.trim() || `Base Consolidada (${uploadFiles.length} arquivos)`);

      const newBase: TicketBase = {
        id: crypto.randomUUID(),
        name: defaultName,
        fileName: fileNames.join(', '),
        fileType: primaryFileType,
        ticketCount: deduplicatedRows.length,
        uploadedAt: new Date().toISOString(),
        datasets: {
          tickets: {
            rows: deduplicatedRows,
            meta: lastParsed?.datasets?.tickets?.meta,
          },
          tipos: lastParsed?.datasets?.tipos,
          tempo_sub: lastParsed?.datasets?.tempo_sub,
          tempo_acao: lastParsed?.datasets?.tempo_acao,
        },
      };

      await ticketStorage.save(newBase);
      await loadBases();
      setActiveBase(newBase);
      setShowUploadModal(false);
      setUploadFiles([]);
      setAppendToActiveBase(false);
      setCustomBaseName('');
      resetFilters();
    } catch (err: any) {
      setUploadError(err.message || 'Erro ao processar arquivos.');
    } finally {
      setUploading(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      modulo: '',
      submodulo: '',
      tipo: '',
      form: '',
      status: '',
      cat: '',
      dataInicio: '',
      dataFim: '',
    });
    setSearchTerm('');
    setDisplayLimit(50);
  };

  // ─── Dados e Métricas do Dashboard Ativo ────────────────────────────────────────

  // Normalização e limpeza garantida dos tickets (Módulo limpo, Submódulo limpo, Tipo padronizado, Status unificado)
  const allTickets = useMemo<TicketItem[]>(() => {
    return (activeBase?.datasets.tickets.rows || []).map((t) => ({
      ...t,
      modulo: cleanModuleName(t.modulo),
      submodulo: cleanSubmoduleName(t.submodulo),
      tipo: standardizeTicketType(t.tipo),
      status: standardizeStatus(t.status),
    }));
  }, [activeBase]);

  // Filtros aplicados
  const filteredTickets = useMemo(() => {
    return allTickets.filter((t) => {
      if (filters.modulo && t.modulo !== filters.modulo) return false;
      if (filters.submodulo && t.submodulo !== filters.submodulo) return false;
      if (filters.tipo && t.tipo !== filters.tipo) return false;
      if (filters.form && t.form !== filters.form) return false;
      if (filters.status && t.status !== filters.status) return false;
      if (filters.cat && t.cat !== filters.cat) return false;
      if (filters.dataInicio && t.data && t.data < filters.dataInicio) return false;
      if (filters.dataFim && t.data && t.data > filters.dataFim) return false;
      return true;
    });
  }, [allTickets, filters]);

  // Contagem de tickets distintos por ID para KPIs
  const distinctTicketMap = useMemo(() => {
    const map = new Map<string, TicketItem>();
    filteredTickets.forEach((t) => {
      if (!map.has(t.id)) map.set(t.id, t);
    });
    return map;
  }, [filteredTickets]);

  const totalDistinctTickets = distinctTicketMap.size;

  // KPIs por Categoria de Origem
  const kpiStats = useMemo(() => {
    const counts: Record<string, number> = {
      falha: 0,
      config: 0,
      duvida: 0,
      tarefa: 0,
      inativo: 0,
      outros: 0,
      nc: 0,
    };

    distinctTicketMap.forEach((t) => {
      const c = t.cat || 'nc';
      counts[c] = (counts[c] || 0) + 1;
    });

    return counts;
  }, [distinctTicketMap]);

  // Resumo Analítico no topo
  const summaryInsight = useMemo(() => {
    if (totalDistinctTickets === 0) return null;

    const pDuvida = ((kpiStats.duvida / totalDistinctTickets) * 100).toFixed(1).replace('.', ',');
    const pConfig = ((kpiStats.config / totalDistinctTickets) * 100).toFixed(1).replace('.', ',');
    const pFalha = ((kpiStats.falha / totalDistinctTickets) * 100).toFixed(1).replace('.', ',');

    // Submódulo mais frequente
    const subCount: Record<string, number> = {};
    filteredTickets.forEach((t) => {
      if (t.submodulo && t.submodulo !== 'Não classificado') {
        subCount[t.submodulo] = (subCount[t.submodulo] || 0) + 1;
      }
    });

    const topSubEntry = Object.entries(subCount).sort((a, b) => b[1] - a[1])[0];
    const topSub = topSubEntry ? topSubEntry[0] : '—';
    const topSubTotal = topSubEntry ? topSubEntry[1] : 0;

    return {
      pDuvida,
      pConfig,
      pFalha,
      topSub,
      topSubTotal,
    };
  }, [totalDistinctTickets, kpiStats, filteredTickets]);

  // Gargalos: top 3 submódulos para Falha, Config e Dúvida
  const gargalos = useMemo(() => {
    const getTopSubs = (categoryKey: string) => {
      const counts: Record<string, number> = {};
      filteredTickets.forEach((t) => {
        if (t.cat === categoryKey && t.submodulo && t.submodulo !== 'Não classificado') {
          counts[t.submodulo] = (counts[t.submodulo] || 0) + 1;
        }
      });
      return Object.entries(counts)
        .map(([submodulo, total]) => ({ submodulo, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 3);
    };

    return {
      falha: getTopSubs('falha'),
      config: getTopSubs('config'),
      duvida: getTopSubs('duvida'),
    };
  }, [filteredTickets]);

  // Stacked chart de Chamados por Módulo
  const modulosStackedData = useMemo(() => {
    const modMap: Record<string, Record<string, number> & { total: number }> = {};

    filteredTickets.forEach((t) => {
      const m = t.modulo || 'Não classificado';
      if (!modMap[m]) {
        modMap[m] = { total: 0, falha: 0, config: 0, duvida: 0, tarefa: 0, inativo: 0, outros: 0, nc: 0 };
      }
      const c = t.cat || 'nc';
      modMap[m][c] = (modMap[m][c] || 0) + 1;
      modMap[m].total += 1;
    });

    return Object.entries(modMap)
      .map(([modulo, counts]) => ({
        modulo,
        ...counts,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredTickets]);

  // Stacked chart de Top Submódulos
  const submodulosStackedData = useMemo(() => {
    const subMap: Record<string, Record<string, number> & { total: number }> = {};

    filteredTickets.forEach((t) => {
      const s = t.submodulo || 'Não classificado';
      if (!subMap[s]) {
        subMap[s] = { total: 0, falha: 0, config: 0, duvida: 0, tarefa: 0, inativo: 0, outros: 0, nc: 0 };
      }
      const c = t.cat || 'nc';
      subMap[s][c] = (subMap[s][c] || 0) + 1;
      subMap[s].total += 1;
    });

    const list = Object.entries(subMap)
      .map(([submodulo, counts]) => ({
        submodulo,
        ...counts,
      }))
      .sort((a, b) => b.total - a.total);

    return showAllSubs ? list : list.slice(0, 15);
  }, [filteredTickets, showAllSubs]);

  // Contagem por Tipo
  const tiposData = useMemo(() => {
    const map: Record<string, number> = {};
    distinctTicketMap.forEach((t) => {
      const val = t.tipo || 'Sem tipo';
      map[val] = (map[val] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [distinctTicketMap]);

  // Contagem por Formulário
  const formsData = useMemo(() => {
    const map: Record<string, number> = {};
    distinctTicketMap.forEach((t) => {
      const val = t.form || 'Não classificado';
      map[val] = (map[val] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [distinctTicketMap]);

  // Contagem por Ação
  const acoesData = useMemo(() => {
    const map: Record<string, number> = {};
    distinctTicketMap.forEach((t) => {
      const val = t.acao || 'Não classificado';
      map[val] = (map[val] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [distinctTicketMap]);

  // Contagem por Alcance
  const alcanceData = useMemo(() => {
    const map: Record<string, number> = {};
    distinctTicketMap.forEach((t) => {
      const val = t.alcance || 'Não classificado';
      map[val] = (map[val] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [distinctTicketMap]);

  // Top Escolas
  const escolasData = useMemo(() => {
    const map: Record<string, number> = {};
    distinctTicketMap.forEach((t) => {
      if (t.unidade && t.unidade.trim()) {
        map[t.unidade] = (map[t.unidade] || 0) + 1;
      }
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [distinctTicketMap]);

  // Tempo médio de resolução por submódulo (se existir no dataset original)
  const tempoSubData = useMemo(() => {
    const raw = activeBase?.datasets.tempo_sub?.rows || [];
    return raw
      .map((r) => ({
        name: r.submodulo,
        horas: Number(r.horas),
        dias: (Number(r.horas) / 24).toFixed(1),
      }))
      .sort((a, b) => b.horas - a.horas)
      .slice(0, 15);
  }, [activeBase]);

  // Opções para os Selects de Filtros (com Módulo limpo, Submódulo dependente, Tipos padronizados e Status unificados)
  const options = useMemo(() => {
    const modulos = Array.from(new Set(allTickets.map((t) => t.modulo).filter(Boolean))).sort();
    const submodulos = Array.from(
      new Set(
        allTickets
          .filter((t) => !filters.modulo || t.modulo === filters.modulo)
          .map((t) => t.submodulo)
          .filter(Boolean)
      )
    ).sort();

    // Padronização estrita de tipos requerida: Sem tipo, Incidentes, Perguntas, Problema, Tarefas, Outro
    const tipos = [...STANDARDIZED_TICKET_TYPES];

    const forms = Array.from(new Set(allTickets.map((t) => t.form).filter(Boolean))).sort();

    // Status unificados: 'Closed' e 'Resolvido' representam o mesmo estado de negócio
    const statusSet = new Set(allTickets.map((t) => t.status).filter(Boolean));
    const statuses = Array.from(statusSet).sort((a, b) => {
      if (a === 'Resolvido') return -1;
      if (b === 'Resolvido') return 1;
      if (a === 'Aberto') return -1;
      if (b === 'Aberto') return 1;
      return a.localeCompare(b);
    });

    return { modulos, submodulos, tipos, forms, statuses };
  }, [allTickets, filters.modulo]);

  // Tabela de chamados filtrados e com busca textual
  const searchedTickets = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return filteredTickets;
    return filteredTickets.filter(
      (t) =>
        t.id.toLowerCase().includes(q) ||
        t.assunto.toLowerCase().includes(q) ||
        t.contexto.toLowerCase().includes(q) ||
        t.descricao.toLowerCase().includes(q) ||
        t.unidade.toLowerCase().includes(q) ||
        t.submodulo.toLowerCase().includes(q)
    );
  }, [filteredTickets, searchTerm]);

  const paginatedTickets = searchedTickets.slice(0, displayLimit);

  // Toggle ler tudo
  const toggleContext = (id: string) => {
    setExpandedContexts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Layout>
      {/* Estilos dedicados para emissão em PDF e Impressão Profissional */}
      <style>{`
        @media print {
          @page {
            margin: 10mm 10mm;
            size: A4 portrait;
          }
          body {
            background: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .shadow-sm, .shadow-md, .shadow-lg, .shadow-2xl, .shadow-xs {
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="space-y-6 max-w-7xl mx-auto">
        {/* ─── Visão 1: Listagem das Bases Salvas ─── */}
        {!activeBase && (
          <div className="space-y-6">
            {/* Header da Listagem */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <BarChart2 className="w-7 h-7 text-blue-600" />
                  Bases de Chamados Importadas
                </h1>
                <p className="text-slate-500 text-sm mt-1">
                  Gerencie e analise as bases de dados de chamados importadas via HTML ou CSV.
                </p>
              </div>
              <button
                onClick={() => {
                  setUploadError('');
                  setShowUploadModal(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                Adicionar Nova Base de Dados
              </button>
            </div>

            {/* Lista de Bases */}
            {loading ? (
              <div className="p-12 text-center text-slate-400">Carregando bases salvas...</div>
            ) : bases.length === 0 ? (
              <div className="text-center bg-white p-16 rounded-2xl border-2 border-dashed border-slate-200 shadow-sm space-y-4">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Nenhuma base de dados adicionada</h3>
                  <p className="text-slate-500 text-sm max-w-md mx-auto mt-1">
                    Faça upload do arquivo HTML ou CSV exportado para gerar o relatório completo com gráficos e gargalos.
                  </p>
                </div>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-md transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Nova Base de Dados
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bases.map((base) => (
                  <div
                    key={base.id}
                    className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between hover:border-blue-200 transition-all hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          base.fileType === 'html' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {base.fileType.toUpperCase()}
                        </span>
                        <button
                          onClick={() => handleDeleteBase(base.id, base.name)}
                          className="text-slate-300 hover:text-red-600 p-1 rounded-lg transition-colors"
                          title="Remover Base"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <h3 className="text-lg font-bold text-slate-800 mt-3 line-clamp-2" title={base.name}>
                        {base.name}
                      </h3>

                      <p className="text-xs text-slate-400 mt-1 truncate" title={base.fileName}>
                        {base.fileName}
                      </p>

                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                        <span className="text-slate-500">Total de Chamados:</span>
                        <span className="font-bold text-slate-800 text-base">
                          {base.ticketCount.toLocaleString('pt-BR')}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                        <span>Importado em:</span>
                        <span>{new Date(base.uploadedAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>

                    <div className="mt-6 pt-2">
                      <button
                        onClick={() => {
                          setActiveBase(base);
                          resetFilters();
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-xl text-sm font-semibold transition-all"
                      >
                        <Eye className="w-4 h-4" />
                        DETALHAR
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── Visão 2: Dashboard Completo da Base Ativa (Idêntico ao PDF) ─── */}
        {activeBase && (
          <div className="space-y-6">
            {/* ─── Cabeçalho Exclusivo para Impressão / Emissão em PDF ─── */}
            <div className="hidden print:block pb-5 mb-4 border-b-2 border-slate-900">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-widest text-blue-700 flex items-center gap-1.5 mb-1">
                    <BarChart2 className="w-4 h-4 text-blue-700 inline" />
                    TicketFlow — Gestão de Demandas & Chamados
                  </div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    Relatório Executivo de Chamados — {activeBase.name}
                  </h1>
                  <p className="text-xs text-slate-600 mt-1">
                    Base de dados: <strong>{activeBase.fileName}</strong> ({activeBase.ticketCount.toLocaleString('pt-BR')} registros na base)
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div>Data de Emissão: <strong>{new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong></div>
                  <div className="mt-1 font-bold text-slate-900 text-sm">
                    {totalDistinctTickets.toLocaleString('pt-BR')} chamados no escopo
                  </div>
                </div>
              </div>

              {/* Box de Resumo dos Parâmetros e Filtros Aplicados */}
              <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-300 text-xs grid grid-cols-4 gap-3">
                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase">Período Analisado</span>
                  <strong className="text-slate-800">
                    {filters.dataInicio || filters.dataFim
                      ? `${filters.dataInicio ? new Date(filters.dataInicio + 'T12:00:00').toLocaleDateString('pt-BR') : 'Início'} até ${filters.dataFim ? new Date(filters.dataFim + 'T12:00:00').toLocaleDateString('pt-BR') : 'Hoje'}`
                      : 'Histórico Completo'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase">Módulo / Submódulo</span>
                  <strong className="text-slate-800">
                    {filters.modulo || 'Todos os Módulos'} {filters.submodulo ? `> ${filters.submodulo}` : ''}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase">Classificação</span>
                  <strong className="text-slate-800">{filters.tipo || 'Todos os Tipos'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold text-[10px] uppercase">Status / Causa</span>
                  <strong className="text-slate-800">
                    {filters.status || 'Todos os Status'} {filters.cat ? `(${CAT_CONFIG[filters.cat]?.label})` : ''}
                  </strong>
                </div>
              </div>
            </div>

            {/* Barra Superior de Navegação (oculta na impressão) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100 print:hidden">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveBase(null)}
                  className="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-medium text-sm transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-50 border border-slate-200"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar para listagem
                </button>
                <div className="h-6 w-px bg-slate-200 hidden sm:block" />
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{activeBase.name}</h2>
                  <p className="text-xs text-slate-500">
                    Arquivo: {activeBase.fileName} ({activeBase.ticketCount.toLocaleString('pt-BR')} chamados na base)
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                  title="Emitir este relatório em PDF ou imprimir"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Emitir Relatório em PDF
                </button>
                <button
                  onClick={() => {
                    setUploadError('');
                    setAppendToActiveBase(true);
                    setUploadFiles([]);
                    setShowUploadModal(true);
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-semibold transition-colors"
                  title="Anexar mais arquivos CSV a esta base de chamados"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar mais CSV a esta base
                </button>
                <button
                  onClick={() => {
                    setUploadError('');
                    setAppendToActiveBase(false);
                    setUploadFiles([]);
                    setShowUploadModal(true);
                  }}
                  className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Criar Nova Base
                </button>
              </div>
            </div>

            {/* Cabeçalho de Resumo / Insights (Idêntico ao topo do PDF) */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-2">
              <h1 className="text-2xl font-bold text-slate-900">{activeBase.name}</h1>
              {summaryInsight ? (
                <p className="text-base text-slate-700 leading-relaxed">
                  Dos <strong>{totalDistinctTickets.toLocaleString('pt-BR')}</strong> chamados do período,{' '}
                  <strong className="text-blue-600">{summaryInsight.pDuvida}%</strong> são dúvidas de uso e{' '}
                  <strong className="text-amber-600">{summaryInsight.pConfig}%</strong> vêm de configuração incorreta.{' '}
                  Falhas do sistema respondem por <strong className="text-red-600">{summaryInsight.pFalha}%</strong>.{' '}
                  O submódulo que mais gera chamados é{' '}
                  <strong className="text-slate-800">{summaryInsight.topSub}</strong>, com{' '}
                  <strong>{summaryInsight.topSubTotal}</strong> chamados.
                </p>
              ) : (
                <p className="text-sm text-slate-500">Nenhum chamado no filtro selecionado.</p>
              )}
              <p className="text-xs text-slate-400">
                {activeBase.name} · Relatório de chamados resolvidos · Clique em qualquer barra ou cartão de origem para filtrar a página.
              </p>
            </div>

            {/* ─── Seção de Filtros Completa com Filtro de Período (oculta na impressão) ─── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4 print:hidden">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* 1. Período Analisado (Novo) */}
                <div className="space-y-1.5 md:col-span-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    Período Analisado
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input
                        type="date"
                        value={filters.dataInicio}
                        onChange={(e) => setFilters({ ...filters, dataInicio: e.target.value })}
                        className="w-full text-xs rounded-lg border border-slate-200 bg-white px-2 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        title="Data Início"
                      />
                    </div>
                    <div>
                      <input
                        type="date"
                        value={filters.dataFim}
                        onChange={(e) => setFilters({ ...filters, dataFim: e.target.value })}
                        className="w-full text-xs rounded-lg border border-slate-200 bg-white px-2 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        title="Data Fim"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Onde Aconteceu */}
                <div className="space-y-1.5 md:col-span-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Onde Aconteceu
                  </label>
                  <div className="space-y-1.5">
                    <select
                      value={filters.modulo}
                      onChange={(e) => setFilters({ ...filters, modulo: e.target.value, submodulo: '' })}
                      className="w-full text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="">Todos os módulos</option>
                      {options.modulos.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <select
                      value={filters.submodulo}
                      onChange={(e) => setFilters({ ...filters, submodulo: e.target.value })}
                      className="w-full text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="">Todos os submódulos</option>
                      {options.submodulos.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. Classificação do Ticket */}
                <div className="space-y-1.5 md:col-span-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Classificação do Ticket
                  </label>
                  <div className="space-y-1.5">
                    <select
                      value={filters.tipo}
                      onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
                      className="w-full text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="">Todos os tipos</option>
                      {options.tipos.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <select
                      value={filters.form}
                      onChange={(e) => setFilters({ ...filters, form: e.target.value })}
                      className="w-full text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="">Todos os formulários</option>
                      {options.forms.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 4. Causa e Andamento */}
                <div className="space-y-1.5 md:col-span-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Causa e Andamento
                  </label>
                  <div className="space-y-1.5">
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="w-full text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="">Todos os status</option>
                      {options.statuses.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <select
                      value={filters.cat}
                      onChange={(e) => setFilters({ ...filters, cat: e.target.value })}
                      className="w-full text-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="">Todas as origens (causas)</option>
                      {ORIGEM_CATEGORIES.map((c) => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Barra de Status dos Filtros */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="text-slate-600 font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <strong>{totalDistinctTickets.toLocaleString('pt-BR')}</strong> chamados no filtro
                  {(filters.modulo || filters.submodulo || filters.tipo || filters.form || filters.status || filters.cat || filters.dataInicio || filters.dataFim) && (
                    <span className="text-blue-600 font-semibold">(Filtros ativos)</span>
                  )}
                </div>

                {(filters.modulo || filters.submodulo || filters.tipo || filters.form || filters.status || filters.cat || filters.dataInicio || filters.dataFim) && (
                  <button
                    onClick={resetFilters}
                    className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-800 font-medium transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Limpar todos os filtros
                  </button>
                )}
              </div>
            </div>

            {/* ─── Cartões de Origem / KPIs (Com porcentagens e clicáveis para filtrar) ─── */}
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                {/* Total */}
                <div
                  onClick={() => setFilters({ ...filters, cat: '' })}
                  className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-sm hover:shadow-md ${
                    !filters.cat ? 'ring-2 ring-blue-500 border-blue-500' : 'border-slate-100'
                  }`}
                >
                  <div className="text-xs font-semibold text-slate-500 truncate">Total</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {totalDistinctTickets.toLocaleString('pt-BR')}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">100% dos chamados</div>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full mt-3 overflow-hidden">
                    <div className="h-full bg-slate-800 w-full" />
                  </div>
                </div>

                {/* Origens com porcentagem e cores do PDF */}
                {ORIGEM_CATEGORIES.map((c) => {
                  const count = kpiStats[c.key] || 0;
                  const pct = totalDistinctTickets > 0 ? ((count / totalDistinctTickets) * 100).toFixed(1) : '0';
                  const isSelected = filters.cat === c.key;

                  return (
                    <div
                      key={c.key}
                      onClick={() => setFilters({ ...filters, cat: isSelected ? '' : c.key })}
                      className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-sm hover:shadow-md ${
                        isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'border-slate-100'
                      }`}
                    >
                      <div className="text-xs font-semibold text-slate-600 truncate" title={c.label}>
                        {c.label}
                      </div>
                      <div className="text-2xl font-bold text-slate-900 mt-1">
                        {count.toLocaleString('pt-BR')}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {pct.replace('.', ',')}% do total
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full mt-3 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, Number(pct))}%`,
                            backgroundColor: c.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-slate-400 mt-2 px-1">
                * Os cartões somam chamados distintos por ID do Zendesk. Clique em um cartão para filtrar especificamente por aquela causa.
              </p>
            </div>

            {/* ─── Seção: Principais Gargalos (3 Colunas como no PDF) ─── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Principais gargalos</h3>
                <p className="text-xs text-slate-500">
                  Os três submódulos com mais chamados em cada origem, dentro do filtro atual.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. Onde o sistema mais falha */}
                <div className="p-4 rounded-xl border border-red-100 bg-red-50/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                    <h4 className="text-sm font-bold text-red-950">Onde o sistema mais falha</h4>
                  </div>
                  <ul className="space-y-2 text-xs">
                    {gargalos.falha.length === 0 ? (
                      <li className="text-slate-400">Nenhum chamado registrado.</li>
                    ) : (
                      gargalos.falha.map((item, idx) => (
                        <li key={idx} className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => setFilters({ ...filters, submodulo: item.submodulo, cat: 'falha' })}
                            className="text-left text-slate-700 hover:text-red-700 hover:underline truncate font-medium"
                            title={item.submodulo}
                          >
                            {item.submodulo}
                          </button>
                          <span className="font-bold text-red-700 shrink-0">{item.total}</span>
                        </li>
                      ))
                    )}
                  </ul>
                  <p className="text-[11px] text-slate-500 pt-2 border-t border-red-100">
                    Prioridade para correção no produto e acompanhamento das versões.
                  </p>
                </div>

                {/* 2. Onde a configuração mais falha */}
                <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <h4 className="text-sm font-bold text-amber-950">Onde a configuração mais falha</h4>
                  </div>
                  <ul className="space-y-2 text-xs">
                    {gargalos.config.length === 0 ? (
                      <li className="text-slate-400">Nenhum chamado registrado.</li>
                    ) : (
                      gargalos.config.map((item, idx) => (
                        <li key={idx} className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => setFilters({ ...filters, submodulo: item.submodulo, cat: 'config' })}
                            className="text-left text-slate-700 hover:text-amber-700 hover:underline truncate font-medium"
                            title={item.submodulo}
                          >
                            {item.submodulo}
                          </button>
                          <span className="font-bold text-amber-700 shrink-0">{item.total}</span>
                        </li>
                      ))
                    )}
                  </ul>
                  <p className="text-[11px] text-slate-500 pt-2 border-t border-amber-100">
                    Revisar a parametrização da rede (cursos, matrizes, critérios, perfis).
                  </p>
                </div>

                {/* 3. Onde há mais dúvidas de uso */}
                <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <h4 className="text-sm font-bold text-blue-950">Onde há mais dúvidas de uso</h4>
                  </div>
                  <ul className="space-y-2 text-xs">
                    {gargalos.duvida.length === 0 ? (
                      <li className="text-slate-400">Nenhum chamado registrado.</li>
                    ) : (
                      gargalos.duvida.map((item, idx) => (
                        <li key={idx} className="flex items-center justify-between gap-2">
                          <button
                            onClick={() => setFilters({ ...filters, submodulo: item.submodulo, cat: 'duvida' })}
                            className="text-left text-slate-700 hover:text-blue-700 hover:underline truncate font-medium"
                            title={item.submodulo}
                          >
                            {item.submodulo}
                          </button>
                          <span className="font-bold text-blue-700 shrink-0">{item.total}</span>
                        </li>
                      ))
                    )}
                  </ul>
                  <p className="text-[11px] text-slate-500 pt-2 border-t border-blue-100">
                    Candidatos a capacitação, tutoriais e comunicados às unidades.
                  </p>
                </div>
              </div>
            </div>

            {/* ─── Gráficos de Módulos e Submódulos (Stacked como no PDF) ─── */}
            <div className="space-y-6">
              {/* 1. Chamados por Módulo */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Chamados por módulo</h3>
                    <p className="text-xs text-slate-500">
                      Cada barra é dividida pela origem do chamado. Um chamado em dois módulos conta nos dois.
                    </p>
                  </div>
                  {/* Legenda */}
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    {ORIGEM_CATEGORIES.map((c) => (
                      <div key={c.key} className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: c.color }} />
                        <span className="text-slate-600 text-[11px]">{c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="w-full">
                  <ResponsiveContainer width="100%" height={Math.max(260, modulosStackedData.length * 36)}>
                    <BarChart
                      data={modulosStackedData}
                      layout="vertical"
                      margin={{ left: 10, right: 30, top: 10, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="modulo"
                        width={130}
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                      />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="falha" stackId="a" fill="#c0392b" name="Falha / bug" />
                      <Bar dataKey="config" stackId="a" fill="#e0962b" name="Configuração incorreta" />
                      <Bar dataKey="duvida" stackId="a" fill="#3b6fd4" name="Dúvida de uso" />
                      <Bar dataKey="tarefa" stackId="a" fill="#3aa17e" name="Tarefa" />
                      <Bar dataKey="inativo" stackId="a" fill="#8a5cc7" name="Usuário inativo" />
                      <Bar dataKey="outros" stackId="a" fill="#6b7b8f" name="Outros" />
                      <Bar dataKey="nc" stackId="a" fill="#b8bfc9" name="Não classificado" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 2. Submódulos com mais chamados */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">Submódulos com mais chamados</h3>
                    <p className="text-xs text-slate-500">
                      Os {showAllSubs ? 'todos' : '15'} submódulos com mais chamados no filtro atual, divididos pela mesma origem.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAllSubs(!showAllSubs)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                  >
                    {showAllSubs ? 'Mostrar apenas Top 15' : 'Mostrar todos os submódulos'}
                  </button>
                </div>

                <div className="w-full">
                  <ResponsiveContainer width="100%" height={Math.max(260, submodulosStackedData.length * 34)}>
                    <BarChart
                      data={submodulosStackedData}
                      layout="vertical"
                      margin={{ left: 10, right: 30, top: 10, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="submodulo"
                        width={180}
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                      />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="falha" stackId="a" fill="#c0392b" name="Falha / bug" />
                      <Bar dataKey="config" stackId="a" fill="#e0962b" name="Configuração incorreta" />
                      <Bar dataKey="duvida" stackId="a" fill="#3b6fd4" name="Dúvida de uso" />
                      <Bar dataKey="tarefa" stackId="a" fill="#3aa17e" name="Tarefa" />
                      <Bar dataKey="inativo" stackId="a" fill="#8a5cc7" name="Usuário inativo" />
                      <Bar dataKey="outros" stackId="a" fill="#6b7b8f" name="Outros" />
                      <Bar dataKey="nc" stackId="a" fill="#b8bfc9" name="Não classificado" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ─── Gráficos de Apoio: Tipo, Formulário, Ação, Resolução, Alcance, Escolas ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tipo do Ticket */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-3">
                <h3 className="text-sm font-bold text-slate-800">Tipo do ticket</h3>
                <p className="text-xs text-slate-400">Como o ticket foi aberto no Zendesk (dúvida, incidente, tarefa, problema).</p>
                <ResponsiveContainer width="100%" height={Math.max(180, tiposData.length * 36)}>
                  <BarChart data={tiposData} layout="vertical" margin={{ left: 10, right: 30, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Chamados" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Formulário do Ticket */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-3">
                <h3 className="text-sm font-bold text-slate-800">Formulário do ticket</h3>
                <p className="text-xs text-slate-400">Fila ou formulário em que o ticket foi atendido (N1, N2, N3, sustentação).</p>
                <ResponsiveContainer width="100%" height={Math.max(180, formsData.length * 36)}>
                  <BarChart data={formsData} layout="vertical" margin={{ left: 10, right: 30, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="value" fill="#e0962b" radius={[0, 4, 4, 0]} name="Chamados" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* O que o usuário tentava fazer (Ação) */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-3">
                <h3 className="text-sm font-bold text-slate-800">O que o usuário tentava fazer (Ação)</h3>
                <p className="text-xs text-slate-400">Ação ou recurso do sistema envolvido no chamado.</p>
                <ResponsiveContainer width="100%" height={Math.max(180, acoesData.length * 34)}>
                  <BarChart data={acoesData} layout="vertical" margin={{ left: 10, right: 30, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="value" fill="#3aa17e" radius={[0, 4, 4, 0]} name="Chamados" />
                  </BarChart>
                </ResponsiveContainer>
              </div>


              {/* Alcance do Incidente */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-3">
                <h3 className="text-sm font-bold text-slate-800">Alcance do incidente</h3>
                <p className="text-xs text-slate-400">Quantos usuários o problema atingiu. "Base geral" afeta toda a rede.</p>
                <ResponsiveContainer width="100%" height={Math.max(160, alcanceData.length * 34)}>
                  <BarChart data={alcanceData} layout="vertical" margin={{ left: 10, right: 30, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="value" fill="#c0392b" radius={[0, 4, 4, 0]} name="Chamados" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Escolas com mais chamados */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-3">
                <h3 className="text-sm font-bold text-slate-800">Escolas com mais chamados</h3>
                <p className="text-xs text-slate-400">Top 10 unidades com maiores solicitações.</p>
                <ResponsiveContainer width="100%" height={Math.max(160, escolasData.length * 34)}>
                  <BarChart data={escolasData} layout="vertical" margin={{ left: 10, right: 30, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="value" fill="#4fa3c7" radius={[0, 4, 4, 0]} name="Chamados" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tempo médio de resolução por submódulo (se existir) */}
            {tempoSubData.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-3">
                <h3 className="text-base font-bold text-slate-800">Tempo médio de resolução</h3>
                <p className="text-xs text-slate-400">
                  Média de horas entre abertura e resolução, nos principais submódulos destacados no relatório.
                </p>
                <ResponsiveContainer width="100%" height={Math.max(220, tempoSubData.length * 32)}>
                  <BarChart data={tempoSubData} layout="vertical" margin={{ left: 10, right: 30, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11 }} tickLine={false} />
                    <Tooltip
                      formatter={(val: any) => [`${Number(val).toLocaleString('pt-BR')} h (${(Number(val) / 24).toFixed(1)} dias)`, 'Tempo Médio']}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar dataKey="horas" fill="#d64545" radius={[0, 4, 4, 0]} name="Horas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* ─── Listagem e Agrupamento Hierárquico de Chamados ─── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-600" />
                    Análise e Listagem de Chamados
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {viewMode === 'hierarchy'
                      ? 'Navegação por Drill-down em 4 níveis: Módulo > Submódulo > Causa / Motivo > Tickets.'
                      : 'Exibição em tabela plana com busca rápida e paginação.'}
                  </p>
                </div>

                {/* Alternador de Modo de Visualização */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setViewMode('hierarchy')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === 'hierarchy'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <GitFork className="w-3.5 h-3.5" />
                    Hierárquico (Drill-down)
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-sm font-bold">
                      Recomendado
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('flat')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      viewMode === 'flat'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    Lista Corrida ({filteredTickets.length})
                  </button>
                </div>
              </div>

              {/* ─── Modo 1: Agrupamento Hierárquico ─── */}
              {viewMode === 'hierarchy' ? (
                <HierarchicalTicketView
                  tickets={filteredTickets}
                  totalBaseTickets={totalDistinctTickets}
                />
              ) : (
                /* ─── Modo 2: Tabela Plana com Busca e Paginação ─── */
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <span className="text-xs text-slate-500">
                      Exibindo chamados individuais com filtros aplicados.
                    </span>

                    {/* Campo de Busca Rápida */}
                    <div className="relative w-full sm:w-80">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setDisplayLimit(50);
                        }}
                        placeholder="Buscar por assunto, contexto, escola..."
                        className="w-full text-xs rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                  </div>

                  {/* Tabela de Dados Plana */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                          <th className="py-2.5 px-3 whitespace-nowrap">Ticket</th>
                          <th className="py-2.5 px-3 min-w-[200px]">Assunto</th>
                          <th className="py-2.5 px-3 min-w-[280px]">Contexto da Demanda</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">Módulo</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">Submódulo</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">Origem / Causa</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">Status</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">Tipo</th>
                          <th className="py-2.5 px-3 min-w-[150px]">Unidade</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedTickets.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="py-12 text-center text-slate-400">
                              Nenhum chamado combina todos os filtros ativos ou a busca atual.
                            </td>
                          </tr>
                        ) : (
                          paginatedTickets.map((t, idx) => {
                            const isExpanded = expandedContexts[t.id];
                            const catConf = CAT_CONFIG[t.cat || 'nc'] || CAT_CONFIG.nc;

                            return (
                              <tr key={`${t.id}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                                  {t.id}
                                </td>
                                <td className="py-2.5 px-3 text-slate-800 font-medium max-w-xs">
                                  {t.assunto}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 max-w-sm">
                                  {/* Coluna Contexto da Demanda Clara e Legível */}
                                  <div className="space-y-1.5 py-0.5">
                                    {t.descricao && (
                                      <div className="text-xs leading-relaxed">
                                        <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider mr-1.5 border border-indigo-200">
                                          Descrição
                                        </span>
                                        <span className="text-slate-800 font-medium">
                                          {isExpanded ? t.descricao : (t.descricao.slice(0, 110) + (t.descricao.length > 110 ? '...' : ''))}
                                        </span>
                                      </div>
                                    )}
                                    {t.contexto && (
                                      <div className="text-xs leading-relaxed">
                                        <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider mr-1.5 border border-emerald-200">
                                          Resolução
                                        </span>
                                        <span className="text-slate-700">
                                          {isExpanded ? t.contexto : (t.contexto.slice(0, 110) + (t.contexto.length > 110 ? '...' : ''))}
                                        </span>
                                      </div>
                                    )}
                                    {!t.descricao && !t.contexto && (
                                      <span className="text-slate-300 italic text-xs">
                                        Sem contexto registrado
                                      </span>
                                    )}
                                    {((t.descricao && t.descricao.length > 110) || (t.contexto && t.contexto.length > 110)) && (
                                      <button
                                        type="button"
                                        onClick={() => toggleContext(t.id)}
                                        className="text-[11px] text-blue-600 hover:underline font-semibold block"
                                      >
                                        {isExpanded ? 'Recolher detalhes' : 'Ler tudo'}
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-slate-700 font-medium whitespace-nowrap">
                                  {t.modulo}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                                  {t.submodulo}
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${catConf.bg}`}>
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: catConf.color }} />
                                    {catConf.label}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap font-medium">
                                  {t.status}
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                    {t.tipo}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 max-w-[180px] truncate" title={t.unidade}>
                                  {t.unidade || '—'}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginação / Mostrar Mais */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Mostrando <strong>{Math.min(displayLimit, searchedTickets.length)}</strong> de{' '}
                      <strong>{searchedTickets.length.toLocaleString('pt-BR')}</strong> chamados
                    </span>

                    {searchedTickets.length > displayLimit && (
                      <button
                        onClick={() => setDisplayLimit((prev) => prev + 50)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg transition-colors"
                      >
                        Mostrar mais 50 chamados
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ─── Rodapé Institucional Exclusivo para o Relatório em PDF ─── */}
            <div className="hidden print:flex items-center justify-between pt-4 mt-8 border-t border-slate-300 text-[10px] text-slate-500">
              <span>TicketFlow — Relatório Executivo Oficial de Análise e Gestão de Chamados</span>
              <span>Emitido em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        )}

        {/* ─── Modal de Upload / Adicionar Nova Base de Dados ─── */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full p-6 space-y-6 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <UploadCloud className="w-6 h-6 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">
                      {appendToActiveBase ? 'Adicionar Arquivos CSV à Base Atual' : 'Adicionar Nova Base de Dados'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {appendToActiveBase
                        ? `Os novos chamados serão mesclados à base "${activeBase?.name}" sem duplicações.`
                        : 'Importe um ou múltiplos arquivos CSV / HTML para compor a base.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                >
                  ×
                </button>
              </div>

              {uploadError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2 border border-red-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="space-y-4">
                {/* Nome Personalizado (Apenas se for nova base) */}
                {!appendToActiveBase && (
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Nome da Base / Organização (ex: GOVERNO DO ESTADO DO AMAPÁ)
                    </label>
                    <input
                      type="text"
                      value={customBaseName}
                      onChange={(e) => setCustomBaseName(e.target.value)}
                      placeholder="Ex: GOVERNO DO ESTADO DO AMAPÁ"
                      className="w-full text-sm rounded-xl border border-slate-200 px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Se deixar em branco, o sistema utilizará o título ou nome dos arquivos.
                    </p>
                  </div>
                )}

                {/* Seleção de Múltiplos Arquivos */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Arquivos (.csv ou .html) — Pode selecionar múltiplos
                    </label>
                    {uploadFiles.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setUploadFiles([])}
                        className="text-[11px] text-red-600 hover:underline font-medium"
                      >
                        Limpar seleção
                      </button>
                    )}
                  </div>

                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const dropped = Array.from(e.dataTransfer.files).filter((f) => {
                        const n = f.name.toLowerCase();
                        return n.endsWith('.html') || n.endsWith('.csv');
                      });
                      if (dropped.length > 0) {
                        setUploadFiles((prev) => [...prev, ...dropped]);
                        setUploadError('');
                      } else {
                        setUploadError('Por favor, solte arquivos com extensão .csv ou .html.');
                      }
                    }}
                    onClick={() => document.getElementById('modal-file-input')?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2"
                  >
                    <UploadCloud className="w-8 h-8 text-blue-500 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700">
                      Arraste ou clique para selecionar um ou mais arquivos CSV / HTML
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Você pode selecionar múltiplos arquivos CSV ao mesmo tempo (Ctrl / Shift).
                    </p>
                    <input
                      id="modal-file-input"
                      type="file"
                      accept=".html,.csv"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length > 0) {
                          const newArray = Array.from(files);
                          setUploadFiles((prev) => [...prev, ...newArray]);
                          setUploadError('');
                          if (!customBaseName && newArray.length === 1 && !appendToActiveBase) {
                            setCustomBaseName(newArray[0].name.replace(/\.[^/.]+$/, ''));
                          }
                        }
                        e.target.value = '';
                      }}
                    />
                  </div>
                </div>

                {/* Lista de Arquivos Selecionados */}
                {uploadFiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 px-1">
                      <span>{uploadFiles.length} {uploadFiles.length === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}:</span>
                      <button
                        type="button"
                        onClick={() => document.getElementById('modal-file-input')?.click()}
                        className="text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar mais arquivos
                      </button>
                    </div>

                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {uploadFiles.map((f, idx) => {
                        const isCsv = f.name.toLowerCase().endsWith('.csv');
                        const sizeKb = (f.size / 1024).toFixed(0);
                        const sizeMb = (f.size / (1024 * 1024)).toFixed(1);
                        const displaySize = f.size > 1024 * 1024 ? `${sizeMb} MB` : `${sizeKb} KB`;

                        return (
                          <div
                            key={`${f.name}-${idx}`}
                            className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50 text-xs"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                                isCsv ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                              }`}>
                                {isCsv ? 'CSV' : 'HTML'}
                              </span>
                              <span className="font-medium text-slate-700 truncate" title={f.name}>
                                {f.name}
                              </span>
                              <span className="text-slate-400 text-[11px] shrink-0">({displaySize})</span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setUploadFiles((prev) => prev.filter((_, i) => i !== idx));
                              }}
                              className="text-slate-400 hover:text-red-600 p-1 rounded-lg transition-colors ml-2 shrink-0"
                              title="Remover este arquivo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Botões do Modal */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={uploadFiles.length === 0 || uploading}
                  onClick={handleProcessFile}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Processando {uploadFiles.length} {uploadFiles.length === 1 ? 'arquivo' : 'arquivos'}...
                    </>
                  ) : (
                    appendToActiveBase
                      ? `Anexar ${uploadFiles.length} ${uploadFiles.length === 1 ? 'arquivo' : 'arquivos'} à Base`
                      : `Salvar e Analisar (${uploadFiles.length})`
                  )}
                </button>
              </div>
            </div>

            {/* ─── Rodapé Institucional Exclusivo para o Relatório em PDF ─── */}
            <div className="hidden print:flex items-center justify-between pt-4 mt-8 border-t border-slate-300 text-[10px] text-slate-500">
              <span>TicketFlow — Relatório Executivo Oficial de Análise e Gestão de Chamados</span>
              <span>Emitido em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
