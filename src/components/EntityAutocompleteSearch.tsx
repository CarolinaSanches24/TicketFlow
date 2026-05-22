import React, { useState, useEffect, useRef } from 'react';
import { entityService } from '../services/api';
import { Search, ChevronDown, Check } from 'lucide-react';

interface EntityAutocompleteSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function EntityAutocompleteSearch({ 
  value, 
  onChange, 
  placeholder = "Buscar organização...", 
  className 
}: EntityAutocompleteSearchProps) {
  
  const [query, setQuery] = useState(value || '');
  const [options, setOptions] = useState<{ id: string, name: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    const fetchEntities = async () => {
      try {
        setLoading(true);
        const data = await entityService.getAll();
        setOptions(data.map((d: any) => ({ id: d.id, name: d.name })));
      } catch (err) {
        console.error('Failed to load entities for autocomplete', err);
      } finally {
        setLoading(false);
      }
    };
    
    // Only fetch when dropdown opens the first time or we just want them cached natively
    fetchEntities();
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
    onChange(v); // We allow user to type whatever, but it shows suggestions if matching
    setIsOpen(true);
  };

  const selectOption = (optionName: string) => {
    setQuery(optionName);
    onChange(optionName);
    setIsOpen(false);
  };

  const filteredOptions = options.filter(opt => 
    opt.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={className || "w-full pl-4 pr-10 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm"}
        />
        <div className="absolute right-3 text-slate-400 pointer-events-none">
          <Search className="w-4 h-4" />
        </div>
      </div>

      {isOpen && (query.length > 0 || filteredOptions.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 shadow-xl rounded-xl max-h-60 overflow-y-auto overflow-x-hidden">
          {loading ? (
             <div className="p-3 text-xs text-slate-500 text-center">Carregando...</div>
          ) : filteredOptions.length > 0 ? (
            <ul className="py-1">
              {filteredOptions.map((opt) => (
                <li 
                  key={opt.id}
                  onMouseDown={() => selectOption(opt.name)}
                  className="px-4 py-2.5 text-sm hover:bg-slate-50 cursor-pointer flex items-center justify-between group"
                >
                  <span className="text-slate-800 font-medium">{opt.name}</span>
                  {value === opt.name && <Check className="w-4 h-4 text-primary-500" />}
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-3 text-xs text-slate-500 text-center">
              Nenhuma organização encontrada. Será salva como nova.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
