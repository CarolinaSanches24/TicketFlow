import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, ExternalLink } from 'lucide-react';
import { moduleService } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface ModuleAutocompleteSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** If set, filters submodules to those belonging to this module name */
  mode?: 'module' | 'submodule';
  /** Current selected module name, used to filter submodules */
  moduleFilter?: string;
}

const ModuleAutocompleteSearch: React.FC<ModuleAutocompleteSearchProps> = ({
  value,
  onChange,
  placeholder,
  className = '',
  disabled = false,
  mode = 'module',
  moduleFilter = '',
}) => {
  const [inputValue, setInputValue] = useState(value || '');
  const [options, setOptions] = useState<string[]>([]);
  const [allOptions, setAllOptions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Load options once on mount or when moduleFilter changes
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (mode === 'module') {
          const mods = await moduleService.getAllModules();
          setAllOptions(mods.map((m: any) => m.name));
        } else {
          const subs = await moduleService.getAllSubmodules();
          const filtered = moduleFilter
            ? subs.filter((s: any) => s.module?.name?.toLowerCase() === moduleFilter.toLowerCase())
            : subs;
          setAllOptions(filtered.map((s: any) => s.name));
        }
      } catch (e) {
        console.error('Erro ao carregar módulos:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [mode, moduleFilter]);

  // Sync external value
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Filter by input
  useEffect(() => {
    if (!inputValue.trim()) {
      setOptions(allOptions.slice(0, 20));
    } else {
      setOptions(
        allOptions.filter((o) => o.toLowerCase().includes(inputValue.toLowerCase())).slice(0, 20)
      );
    }
  }, [inputValue, allOptions]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (option: string) => {
    setInputValue(option);
    onChange(option);
    setShowDropdown(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);
    setShowDropdown(true);
  };

  const handleBlur = () => {
    // small delay so click on dropdown works
    setTimeout(() => setShowDropdown(false), 150);
  };

  const noMatch = inputValue.trim() !== '' && options.length === 0 && !loading;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setShowDropdown(true)}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder || (mode === 'module' ? 'Buscar módulo...' : 'Buscar submódulo...')}
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          autoComplete="off"
        />
      </div>

      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-56 flex flex-col">
          {loading ? (
            <div className="p-3 text-xs text-slate-400 text-center">Carregando...</div>
          ) : options.length > 0 ? (
            <ul className="overflow-y-auto flex-1">
              {options.map((opt) => (
                <li
                  key={opt}
                  onMouseDown={() => handleSelect(opt)}
                  className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-primary-50 hover:text-primary-700 transition-colors ${
                    opt === inputValue ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-slate-700'
                  }`}
                >
                  {opt}
                </li>
              ))}
            </ul>
          ) : noMatch ? (
            <div className="p-3">
              <p className="text-xs text-slate-500 mb-2">
                Nenhum {mode === 'module' ? 'módulo' : 'submódulo'} encontrado para{' '}
                <strong>"{inputValue}"</strong>.
              </p>
              <button
                type="button"
                onMouseDown={() => navigate('/settings/modules')}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Cadastrar em Configurações → Módulos
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="p-3 text-xs text-slate-400 text-center">
              Digite para buscar {mode === 'module' ? 'módulos' : 'submódulos'}...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ModuleAutocompleteSearch;
