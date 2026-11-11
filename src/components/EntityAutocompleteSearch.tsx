import React, { useState, useEffect, useRef } from 'react';
import { entityService } from '../services/api';
import { Search, ChevronDown, Check, X } from 'lucide-react';

interface EntityAutocompleteSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  allowCreate?: boolean;
}

export default function EntityAutocompleteSearch({ 
  value, 
  onChange, 
  placeholder = "Buscar organização...", 
  className,
  allowCreate = true
}: EntityAutocompleteSearchProps) {
  
  const [query, setQuery] = useState(value || '');
  const [options, setOptions] = useState<{ id: string, name: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newEntityData, setNewEntityData] = useState({
    name: '', identifier: '', secretariat_type: '', admin_responsible: '', account_manager: '', cs_account_manager: ''
  });
  
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

  const openCreateModal = () => {
    setNewEntityData({
      name: query, identifier: '', secretariat_type: '', admin_responsible: '', account_manager: '', cs_account_manager: ''
    });
    setIsOpen(false);
    setIsModalOpen(true);
  };

  const handleCreateEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntityData.name) return;
    try {
      setIsCreating(true);
      const created = await entityService.create(newEntityData);
      setOptions(prev => [{id: created.id, name: created.name}, ...prev]);
      selectOption(created.name);
      setIsModalOpen(false);
    } catch (err: any) {
      alert('Erro ao criar organização: ' + (err.message || ''));
    } finally {
      setIsCreating(false);
    }
  };

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
            <div className="p-3 text-xs text-slate-500 text-center flex flex-col items-center gap-2">
              <p>Nenhuma organização encontrada.</p>
              {allowCreate && (
                <button 
                  type="button"
                  onClick={openCreateModal}
                  className="bg-primary-50 text-primary-600 hover:bg-primary-100 font-semibold px-3 py-1.5 rounded-lg transition-colors"
                >
                  Criar "{query}"
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl my-8">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">Nova Organização</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Nome da Organização *</label>
                    <input
                      required
                      value={newEntityData.name}
                      onChange={e => setNewEntityData({...newEntityData, name: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Identificador</label>
                    <input
                      value={newEntityData.identifier}
                      onChange={e => setNewEntityData({...newEntityData, identifier: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                      placeholder="Ex: 00.000.000/0001-00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo da Secretaria</label>
                    <select
                      value={newEntityData.secretariat_type}
                      onChange={e => setNewEntityData({...newEntityData, secretariat_type: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                       <option value="">Selecione...</option>
                       <option value="Estadual">Estadual</option>
                       <option value="Municipal">Municipal</option>
                       <option value="Federal">Federal</option>
                       <option value="Particular">Particular</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreateEntity}
                  disabled={isCreating}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-all"
                >
                  {isCreating ? 'Salvando...' : 'Salvar Organização'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
