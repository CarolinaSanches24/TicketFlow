import React, { useState, useEffect, useRef } from 'react';
import { employeeService } from '../services/api';
import { Search, Check, X, User, Briefcase, Building2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmployeeOption {
  id: string;
  name: string;
  role: string;
  status: string;
  sector?: { id: string; name: string } | null;
}

interface EmployeeAutocompleteSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  sectorFilter?: string; // e.g. "Desenvolvimento" or "Produto"
  className?: string;
}

export default function EmployeeAutocompleteSearch({
  value,
  onChange,
  placeholder = "Buscar funcionário...",
  sectorFilter,
  className
}: EmployeeAutocompleteSearchProps) {
  const [query, setQuery] = useState(value || '');
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAllSectors, setShowAllSectors] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const data = await employeeService.getAll();
        setEmployees(data);
      } catch (err) {
        console.error('Erro ao carregar funcionários:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    onChange(v);
    setIsOpen(true);
  };

  const selectEmployee = (empName: string) => {
    setQuery(empName);
    onChange(empName);
    setIsOpen(false);
  };

  // Filter logic
  const filteredList = employees.filter(emp => {
    const matchesQuery = emp.name.toLowerCase().includes(query.toLowerCase()) ||
      emp.role?.toLowerCase().includes(query.toLowerCase()) ||
      emp.sector?.name?.toLowerCase().includes(query.toLowerCase());

    if (!sectorFilter || showAllSectors) {
      return matchesQuery;
    }

    const matchesSector = emp.sector?.name?.toLowerCase().includes(sectorFilter.toLowerCase());
    return matchesQuery && matchesSector;
  });

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={className || "w-full pl-4 pr-10 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm bg-white"}
        />
        <div className="absolute right-2.5 flex items-center gap-1 text-slate-400">
          {query ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setQuery('');
                onChange('');
                setIsOpen(false);
              }}
              className="p-1 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              title="Limpar seleção"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Search className="w-4 h-4 pointer-events-none" />
          )}
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[70] w-full mt-1 bg-white border border-slate-200 shadow-xl rounded-xl max-h-64 overflow-y-auto overflow-x-hidden animate-in fade-in zoom-in-95 duration-150">
          {sectorFilter && (
            <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>
                Filtrando por: <b>{sectorFilter}</b>
              </span>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setShowAllSectors(!showAllSectors);
                }}
                className="text-primary-600 hover:underline font-semibold cursor-pointer"
              >
                {showAllSectors ? `Ver apenas ${sectorFilter}` : 'Ver todos os setores'}
              </button>
            </div>
          )}

          {loading ? (
            <div className="p-3 text-xs text-slate-500 text-center">Carregando funcionários...</div>
          ) : filteredList.length > 0 ? (
            <ul className="py-1 divide-y divide-slate-50">
              {filteredList.map((emp) => (
                <li
                  key={emp.id}
                  onMouseDown={() => selectEmployee(emp.name)}
                  className="px-3.5 py-2 hover:bg-slate-50 cursor-pointer flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-primary-50 group-hover:text-primary-600">
                      {emp.name.charAt(0)}
                    </div>
                    <div className="truncate">
                      <p className="text-sm font-semibold text-slate-800 truncate">{emp.name}</p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        {emp.role && (
                          <span className="flex items-center gap-1 font-medium text-slate-600">
                            <Briefcase className="w-3 h-3 text-slate-400" />
                            {emp.role}
                          </span>
                        )}
                        {emp.sector?.name && (
                          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1">
                            <Building2 className="w-2.5 h-2.5" />
                            {emp.sector.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {value === emp.name && <Check className="w-4 h-4 text-primary-500 shrink-0 ml-2" />}
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-xs text-slate-500 text-center space-y-2">
              <p>Nenhum funcionário encontrado.</p>
              <Link
                to="/settings/employees"
                target="_blank"
                className="inline-flex items-center gap-1 text-primary-600 hover:underline font-semibold"
              >
                Cadastrar em Configurações <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
