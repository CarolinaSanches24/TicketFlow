import React, { useState, useRef } from 'react';
import { 
  X, Upload, Download, FileSpreadsheet, AlertCircle, 
  CheckCircle2, Loader2, FileText, Check, AlertTriangle 
} from 'lucide-react';
import { downloadUnitsCsvTemplate, parseUnitsCsv, ParseResult } from '../../utils/csvUnitsParser';
import { entityUnitsService } from '../../services/api';

interface BatchUnitImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityId: string;
  entityName?: string;
  onSuccess: () => void;
}

export default function BatchUnitImportModal({
  isOpen,
  onClose,
  entityId,
  entityName,
  onSuccess
}: BatchUnitImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (selectedFile: File) => {
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setErrorMessage('Por favor, selecione um arquivo no formato CSV (.csv).');
      return;
    }

    setFile(selectedFile);
    setErrorMessage(null);
    setIsReading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const result = parseUnitsCsv(text);
        setParseResult(result);
        if (result.errors.length > 0) {
          setErrorMessage(result.errors.join(' '));
        }
      } catch (err: any) {
        setErrorMessage('Falha ao processar o arquivo CSV: ' + (err.message || 'Erro desconhecido'));
      } finally {
        setIsReading(false);
      }
    };

    reader.onerror = () => {
      setErrorMessage('Não foi possível ler o arquivo selecionado.');
      setIsReading(false);
    };

    reader.readAsText(selectedFile, 'UTF-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleClearFile = () => {
    setFile(null);
    setParseResult(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.validRows.length === 0) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const payloads = parseResult.validRows.map(row => ({
        entity_id: entityId,
        unit_name: row.unit_name,
        director_name: row.director_name || null,
        secretary_name: row.secretary_name || null,
        course_offers: row.course_offers || null,
        status: row.status || 'ACTIVE'
      }));

      await entityUnitsService.createMany(payloads);

      alert(`${payloads.length} unidade(s) importada(s) com sucesso!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('[BatchUnitImport] Erro ao importar unidades:', err);
      setErrorMessage('Erro ao salvar unidades no banco de dados: ' + (err.message || 'Erro inesperado'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary-100 text-primary-700 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Importar Unidades em Lote (CSV)</h2>
              <p className="text-xs text-slate-500">
                {entityName ? `Entidade: ${entityName}` : 'Adicione múltiplas unidades escolares simultaneamente'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Template Info Card */}
          <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-xl shadow-xs text-primary-600 shrink-0 mt-0.5">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Modelo Oficial de Importação</h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Baixe o modelo pré-formatado com os cabeçalhos reconhecidos: <b>Nome da Unidade</b> (obrigatório), <b>Diretor(a)</b>, <b>Secretário(a)</b>, <b>Cursos Oferecidos</b> e <b>Status</b>.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={downloadUnitsCsvTemplate}
              className="flex items-center gap-2 bg-white hover:bg-primary-600 hover:text-white text-primary-700 border border-primary-200 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4" /> Baixar Modelo CSV
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* Upload Area */}
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                isDragging 
                  ? 'border-primary-500 bg-primary-50/50 scale-[0.99]' 
                  : 'border-slate-200 hover:border-primary-400 hover:bg-slate-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              />
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 mx-auto mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Clique para selecionar ou arraste o arquivo CSV aqui
              </h3>
              <p className="text-xs text-slate-500">
                Formatos aceitos: .csv delimitado por ponto e vírgula (;) ou vírgula (,)
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{file.name}</p>
                  <p className="text-xs text-slate-500">
                    {(file.size / 1024).toFixed(1)} KB • {isReading ? 'Processando conteúdo...' : 'Arquivo carregado'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearFile}
                disabled={isSubmitting}
                className="text-xs font-semibold text-slate-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
              >
                Trocar arquivo
              </button>
            </div>
          )}

          {/* Preview Section */}
          {parseResult && (
            <div className="space-y-3">
              {/* Stats badges */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                  Total no arquivo: {parseResult.totalParsed}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Prontas para importar: {parseResult.validCount}
                </span>
                {parseResult.invalidCount > 0 && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Ignoradas / Inválidas: {parseResult.invalidCount}
                  </span>
                )}
              </div>

              {/* Table Preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 z-10">
                      <tr>
                        <th className="py-2.5 px-3 font-bold text-slate-600">Linha</th>
                        <th className="py-2.5 px-3 font-bold text-slate-600">Nome da Unidade</th>
                        <th className="py-2.5 px-3 font-bold text-slate-600">Diretor(a)</th>
                        <th className="py-2.5 px-3 font-bold text-slate-600">Secretário(a)</th>
                        <th className="py-2.5 px-3 font-bold text-slate-600">Cursos</th>
                        <th className="py-2.5 px-3 font-bold text-slate-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {parseResult.rows.map((row, idx) => (
                        <tr 
                          key={idx} 
                          className={row.isValid ? 'hover:bg-slate-50/70' : 'bg-red-50/50 hover:bg-red-50'}
                        >
                          <td className="py-2 px-3 text-slate-400 font-mono">#{row.lineNumber}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {row.isValid ? (
                              row.unit_name
                            ) : (
                              <span className="text-red-600 flex items-center gap-1 font-normal italic">
                                <AlertCircle className="w-3.5 h-3.5" /> {row.error || 'Inválido'}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-slate-600">{row.director_name || '-'}</td>
                          <td className="py-2 px-3 text-slate-600">{row.secretary_name || '-'}</td>
                          <td className="py-2 px-3 text-slate-600 max-w-xs truncate" title={row.course_offers}>
                            {row.course_offers || '-'}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.status === 'ACTIVE' 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isSubmitting || !parseResult || parseResult.validCount === 0}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Importando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" /> Importar {parseResult?.validCount || 0} Unidade(s)
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
