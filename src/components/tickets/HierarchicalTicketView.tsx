import React, { useState, useMemo } from 'react';
import {
  ChevronRight, ChevronDown, Folder, Layers, AlertCircle, FileText,
  Search, Eye, CheckCircle2, ChevronUp
} from 'lucide-react';
import { TicketItem } from '../../services/ticketStorage';
import { ORIGEM_CATEGORIES } from '../../utils/ticketParser';

interface CauseNode {
  causeName: string;
  cat: string;
  tickets: TicketItem[];
}

interface SubmoduleNode {
  submoduleName: string;
  totalTickets: number;
  causes: CauseNode[];
}

interface ModuleNode {
  moduleName: string;
  totalTickets: number;
  submodules: SubmoduleNode[];
}

interface Props {
  tickets: TicketItem[];
  totalBaseTickets: number;
}

const CAT_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  falha: { color: '#c0392b', bg: 'bg-red-50 text-red-700', border: 'border-red-200' },
  config: { color: '#e0962b', bg: 'bg-amber-50 text-amber-700', border: 'border-amber-200' },
  duvida: { color: '#3b6fd4', bg: 'bg-blue-50 text-blue-700', border: 'border-blue-200' },
  tarefa: { color: '#3aa17e', bg: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-200' },
  inativo: { color: '#8a5cc7', bg: 'bg-purple-50 text-purple-700', border: 'border-purple-200' },
  outros: { color: '#6b7b8f', bg: 'bg-slate-50 text-slate-700', border: 'border-slate-200' },
  nc: { color: '#b8bfc9', bg: 'bg-gray-50 text-gray-600', border: 'border-gray-200' },
};

export default function HierarchicalTicketView({ tickets, totalBaseTickets }: Props) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedSubmodules, setExpandedSubmodules] = useState<Set<string>>(new Set());
  const [expandedCauses, setExpandedCauses] = useState<Set<string>>(new Set());
  const [innerSearch, setInnerSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);

  // Filtragem interna rápida (se o gestor digitar algo no campo de busca da hierarquia)
  const filteredTickets = useMemo(() => {
    const q = innerSearch.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter(
      (t) =>
        t.id.toLowerCase().includes(q) ||
        t.assunto.toLowerCase().includes(q) ||
        t.modulo.toLowerCase().includes(q) ||
        t.submodulo.toLowerCase().includes(q) ||
        t.origem.toLowerCase().includes(q) ||
        t.contexto.toLowerCase().includes(q) ||
        t.descricao.toLowerCase().includes(q) ||
        t.unidade.toLowerCase().includes(q)
    );
  }, [tickets, innerSearch]);

  // Construção da árvore hierárquica Nível 1 > Nível 2 > Nível 3 > Nível 4
  const tree = useMemo<ModuleNode[]>(() => {
    const modMap = new Map<string, Map<string, Map<string, TicketItem[]>>>();

    for (const t of filteredTickets) {
      const mod = t.modulo || 'Não classificado';
      const sub = t.submodulo || 'Não classificado';
      const cause = t.categoria || t.origem || 'Não classificado';

      if (!modMap.has(mod)) modMap.set(mod, new Map());
      const subMap = modMap.get(mod)!;

      if (!subMap.has(sub)) subMap.set(sub, new Map());
      const causeMap = subMap.get(sub)!;

      if (!causeMap.has(cause)) causeMap.set(cause, []);
      causeMap.get(cause)!.push(t);
    }

    const result: ModuleNode[] = [];

    modMap.forEach((subMap, moduleName) => {
      const submodules: SubmoduleNode[] = [];
      let moduleTotal = 0;

      subMap.forEach((causeMap, submoduleName) => {
        const causes: CauseNode[] = [];
        let subTotal = 0;

        causeMap.forEach((ticketList, causeName) => {
          const cat = ticketList[0]?.cat || 'nc';
          causes.push({
            causeName,
            cat,
            tickets: ticketList,
          });
          subTotal += ticketList.length;
        });

        causes.sort((a, b) => b.tickets.length - a.tickets.length);

        submodules.push({
          submoduleName,
          totalTickets: subTotal,
          causes,
        });

        moduleTotal += subTotal;
      });

      submodules.sort((a, b) => b.totalTickets - a.totalTickets);

      result.push({
        moduleName,
        totalTickets: moduleTotal,
        submodules,
      });
    });

    result.sort((a, b) => b.totalTickets - a.totalTickets);
    return result;
  }, [filteredTickets]);

  // Handlers para alternar expansão
  const toggleModule = (moduleName: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleName)) next.delete(moduleName);
      else next.add(moduleName);
      return next;
    });
  };

  const toggleSubmodule = (key: string) => {
    setExpandedSubmodules((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleCause = (key: string) => {
    setExpandedCauses((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => {
    const allMods = new Set<string>();
    const allSubs = new Set<string>();
    const allCauses = new Set<string>();

    tree.forEach((m) => {
      allMods.add(m.moduleName);
      m.submodules.forEach((s) => {
        const subKey = `${m.moduleName}__${s.submoduleName}`;
        allSubs.add(subKey);
        s.causes.forEach((c) => {
          allCauses.add(`${subKey}__${c.causeName}`);
        });
      });
    });

    setExpandedModules(allMods);
    setExpandedSubmodules(allSubs);
    setExpandedCauses(allCauses);
  };

  const collapseAll = () => {
    setExpandedModules(new Set());
    setExpandedSubmodules(new Set());
    setExpandedCauses(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Controles do Topo da Árvore (ocultos na impressão) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80 print:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 transition-colors shadow-xs"
          >
            Expandir tudo
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 transition-colors shadow-xs"
          >
            Recolher tudo
          </button>
          <span className="text-xs text-slate-500 ml-2">
            <strong>{tree.length}</strong> módulos encontrados
          </span>
        </div>

        {/* Busca rápida */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={innerSearch}
            onChange={(e) => setInnerSearch(e.target.value)}
            placeholder="Filtrar nesta hierarquia..."
            className="w-full text-xs rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      {tree.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-100">
          Nenhum registro encontrado para a busca na hierarquia.
        </div>
      ) : (
        <div className="space-y-3">
          {tree.map((mod) => {
            const isModExpanded = expandedModules.has(mod.moduleName);
            const modPercentage = totalBaseTickets > 0 ? ((mod.totalTickets / totalBaseTickets) * 100).toFixed(1) : '0';

            return (
              <div
                key={mod.moduleName}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all print-break-inside-avoid"
              >
                {/* ─── Nível 1: Módulo ("Onde aconteceu") ─── */}
                <div
                  onClick={() => toggleModule(mod.moduleName)}
                  className={`flex items-center justify-between p-4 cursor-pointer select-none transition-colors ${
                    isModExpanded ? 'bg-blue-50/40 border-b border-blue-100' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-transform"
                    >
                      {isModExpanded ? (
                        <ChevronDown className="w-5 h-5 text-blue-600" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                    </button>
                    <div className="w-8 h-8 rounded-lg bg-blue-100/80 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">
                          {mod.moduleName}
                        </span>
                        <span className="text-xs text-slate-400 font-normal">
                          ({mod.submodules.length} {mod.submodules.length === 1 ? 'submódulo' : 'submódulos'})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Representa {modPercentage.replace('.', ',')}% do total analisado
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="hidden sm:block w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.min(100, Number(modPercentage))}%` }}
                      />
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                      {mod.totalTickets.toLocaleString('pt-BR')} tickets
                    </span>
                  </div>
                </div>

                {/* ─── Nível 2: Submódulos vinculados ao Módulo ─── */}
                {isModExpanded && (
                  <div className="p-4 bg-slate-50/40 space-y-3 pl-6 sm:pl-10 border-l-4 border-blue-500 ml-4 my-2">
                    {mod.submodules.map((sub) => {
                      const subKey = `${mod.moduleName}__${sub.submoduleName}`;
                      const isSubExpanded = expandedSubmodules.has(subKey);

                      return (
                        <div
                          key={subKey}
                          className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs"
                        >
                          <div
                            onClick={() => toggleSubmodule(subKey)}
                            className={`flex items-center justify-between p-3.5 cursor-pointer select-none transition-colors ${
                              isSubExpanded ? 'bg-slate-100/70 border-b border-slate-200' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <button type="button" className="text-slate-400 p-0.5">
                                {isSubExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-slate-700" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-slate-400" />
                                )}
                              </button>
                              <Folder className="w-4 h-4 text-amber-500" />
                              <div>
                                <span className="text-xs font-bold text-slate-800">
                                  {sub.submoduleName}
                                </span>
                                <span className="text-[11px] text-slate-400 ml-2">
                                  ({sub.causes.length} {sub.causes.length === 1 ? 'motivo/causa' : 'motivos/causas'})
                                </span>
                              </div>
                            </div>

                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {sub.totalTickets.toLocaleString('pt-BR')} tickets
                            </span>
                          </div>

                          {/* ─── Nível 3: Causas / Origens do Submódulo ─── */}
                          {isSubExpanded && (
                            <div className="p-3 bg-white space-y-2.5 pl-6 sm:pl-8 border-l-2 border-amber-300 ml-4 my-2">
                              {sub.causes.map((cause) => {
                                const causeKey = `${subKey}__${cause.causeName}`;
                                const isCauseExpanded = expandedCauses.has(causeKey);
                                const conf = CAT_COLORS[cause.cat] || CAT_COLORS.nc;

                                return (
                                  <div
                                    key={causeKey}
                                    className="rounded-xl border border-slate-200 overflow-hidden bg-white"
                                  >
                                    <div
                                      onClick={() => toggleCause(causeKey)}
                                      className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-slate-50/80 transition-colors"
                                    >
                                      <div className="flex items-center gap-2">
                                        <button type="button" className="text-slate-400 p-0.5">
                                          {isCauseExpanded ? (
                                            <ChevronDown className="w-3.5 h-3.5 text-slate-700" />
                                          ) : (
                                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                          )}
                                        </button>
                                        <span
                                          className="w-2.5 h-2.5 rounded-full shrink-0"
                                          style={{ backgroundColor: conf.color }}
                                        />
                                        <span className="text-xs font-semibold text-slate-700">
                                          {cause.causeName}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${conf.bg} ${conf.border}`}>
                                          {cause.tickets.length} {cause.tickets.length === 1 ? 'chamado' : 'chamados'}
                                        </span>
                                        <span className="text-xs font-medium text-blue-600 flex items-center gap-1 hover:underline">
                                          <Eye className="w-3 h-3" />
                                          {isCauseExpanded ? 'Ocultar' : 'Ver chamados'}
                                        </span>
                                      </div>
                                    </div>

                                    {/* ─── Nível 4: Lista de Tickets daquela Causa Específica ─── */}
                                    {isCauseExpanded && (
                                      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                                        <div className="overflow-x-auto">
                                          <table className="w-full text-left text-xs border-collapse">
                                            <thead>
                                              <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                                                <th className="py-2 px-2.5 whitespace-nowrap">Nº Ticket</th>
                                                <th className="py-2 px-2.5 min-w-[220px]">Título / Assunto</th>
                                                <th className="py-2 px-2.5 whitespace-nowrap">Natureza da Resolução</th>
                                                <th className="py-2 px-2.5 whitespace-nowrap">Tipo</th>
                                                <th className="py-2 px-2.5 whitespace-nowrap">Status</th>
                                                <th className="py-2 px-2.5 min-w-[140px]">Unidade / Escola</th>
                                                <th className="py-2 px-2.5 text-right whitespace-nowrap">Ação</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200/60 bg-white">
                                              {cause.tickets.map((t) => {
                                                const resLower = (t.resolucao || '').toLowerCase();
                                                const isTechFix = resLower.includes('banco') || resLower.includes('código') || resLower.includes('codigo') || (t.origem || '').toLowerCase().includes('falha');

                                                return (
                                                  <tr
                                                    key={t.id}
                                                    onClick={() => setSelectedTicket(t)}
                                                    className="hover:bg-blue-50/60 transition-colors cursor-pointer group"
                                                  >
                                                    <td className="py-2.5 px-2.5 font-mono font-bold text-blue-700 whitespace-nowrap group-hover:underline">
                                                      #{t.id}
                                                    </td>
                                                    <td className="py-2.5 px-2.5 font-medium text-slate-800 max-w-sm">
                                                      <div className="line-clamp-1" title={t.assunto}>
                                                        {t.assunto}
                                                      </div>
                                                    </td>
                                                    <td className="py-2.5 px-2.5 whitespace-nowrap">
                                                      {isTechFix ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                                          🔧 Correção Técnica
                                                        </span>
                                                      ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                          {t.resolucao || 'Operacional'}
                                                        </span>
                                                      )}
                                                    </td>
                                                    <td className="py-2.5 px-2.5 whitespace-nowrap">
                                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                                        {t.tipo}
                                                      </span>
                                                    </td>
                                                    <td className="py-2.5 px-2.5 whitespace-nowrap">
                                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                                                        {t.status}
                                                      </span>
                                                    </td>
                                                    <td className="py-2.5 px-2.5 text-slate-600 truncate max-w-[140px]" title={t.unidade}>
                                                      {t.unidade || '—'}
                                                    </td>
                                                    <td className="py-2.5 px-2.5 text-right whitespace-nowrap">
                                                      <button
                                                        type="button"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          setSelectedTicket(t);
                                                        }}
                                                        className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-lg transition-colors inline-flex items-center gap-1 shadow-2xs"
                                                      >
                                                        <Eye className="w-3 h-3" />
                                                        Detalhar
                                                      </button>
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Modal de Detalhamento Completo do Chamado (Drill-down sob Demanda) ─── */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <span className="font-mono text-base font-bold text-blue-700 bg-blue-100/70 px-2.5 py-1 rounded-lg">
                  Ticket #{selectedTicket.id}
                </span>
                {(() => {
                  const resLower = (selectedTicket.resolucao || '').toLowerCase();
                  const isTech = resLower.includes('banco') || resLower.includes('código') || resLower.includes('codigo') || (selectedTicket.origem || '').toLowerCase().includes('falha');
                  if (isTech) {
                    return (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                        🔧 Correção Técnica / Bug
                      </span>
                    );
                  }
                  if ((selectedTicket.origem || '').toLowerCase().includes('dúvida') || (selectedTicket.tipo || '').toLowerCase().includes('pergunta')) {
                    return (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                        💡 Dúvida / Operacional
                      </span>
                    );
                  }
                  if ((selectedTicket.origem || '').toLowerCase().includes('tarefa') || (selectedTicket.tipo || '').toLowerCase().includes('tarefa')) {
                    return (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                        📋 Tarefa / Operacional
                      </span>
                    );
                  }
                  return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                      ⚙️ Configuração / Outro
                    </span>
                  );
                })()}
              </div>

              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl font-bold leading-none p-1 rounded-lg hover:bg-slate-200/50 transition-colors"
                title="Fechar"
              >
                ×
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              {/* Título / Assunto */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Assunto da Demanda
                </span>
                <h3 className="text-base font-bold text-slate-800 leading-snug">
                  {selectedTicket.assunto}
                </h3>
              </div>

              {/* Informações de Contexto em Grade */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Módulo</span>
                  <span className="font-semibold text-slate-700">{selectedTicket.modulo}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Submódulo</span>
                  <span className="font-semibold text-slate-700">{selectedTicket.submodulo}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Status</span>
                  <span className="font-semibold text-slate-700">{selectedTicket.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Tipo</span>
                  <span className="font-semibold text-slate-700">{selectedTicket.tipo}</span>
                </div>
                {selectedTicket.unidade && (
                  <div className="col-span-2 sm:col-span-4 pt-2 border-t border-slate-200/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Unidade / Escola</span>
                    <span className="font-semibold text-slate-700">{selectedTicket.unidade}</span>
                  </div>
                )}
              </div>

              {/* Descrição da Tarefa / Problema */}
              {selectedTicket.descricao && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Descrição da Tarefa / Problema
                  </span>
                  <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 text-slate-700 whitespace-pre-wrap leading-relaxed text-xs">
                    {selectedTicket.descricao}
                  </div>
                </div>
              )}

              {/* Seção Principal: Como o Chamado foi Resolvido */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Como o Chamado Foi Resolvido (Detalhamento Completo)
                </span>
                <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-100 text-slate-800 whitespace-pre-wrap leading-relaxed text-xs font-mono select-text">
                  {selectedTicket.contexto || 'Sem contexto ou resolução detalhada registrada para este chamado.'}
                </div>
              </div>

              {/* Metadados Técnicos Adicionais */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                <div>
                  <span className="text-slate-400">Tipo de Resolução:</span>{' '}
                  <strong className="text-slate-700">{selectedTicket.resolucao || '—'}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Ação Envolvida:</span>{' '}
                  <strong className="text-slate-700">{selectedTicket.acao || '—'}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Alcance:</span>{' '}
                  <strong className="text-slate-700">{selectedTicket.alcance || '—'}</strong>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
              >
                Fechar Detalhamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
