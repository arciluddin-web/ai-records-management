
import React, { useState, useRef, useEffect } from 'react';
import { ChevronsUpDown, Check } from 'lucide-react';

interface ComboboxProps {
  label: string;
  items: string[];
  value: string;
  onChange: (value: string) => void;
}

export const Combobox: React.FC<ComboboxProps> = ({ label, items, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const comboboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onChange(inputValue); // Commit changes on blur
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inputValue, onChange]);

  const filteredItems = items.filter(item => item.toLowerCase().includes(inputValue.toLowerCase()));

  return (
    <div ref={comboboxRef}>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="w-full px-3 py-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute inset-y-0 right-0 flex items-center px-2 text-slate-400"
        >
          <ChevronsUpDown size={20} />
        </button>
        {isOpen && (
          <ul className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
            {filteredItems.map((item) => (
              <li
                key={item}
                onClick={() => {
                  onChange(item);
                  setInputValue(item);
                  setIsOpen(false);
                }}
                className="cursor-pointer select-none relative py-2 pl-10 pr-4 text-slate-900 dark:text-slate-200 hover:bg-blue-100 dark:hover:bg-blue-900/50"
              >
                {value === item && <Check className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" size={20} />}
                {item}
              </li>
            ))}
            {filteredItems.length === 0 && !items.includes(inputValue) && inputValue && (
              <li 
                onClick={() => {
                  onChange(inputValue);
                  setIsOpen(false);
                }}
                className="cursor-pointer select-none relative py-2 pl-10 pr-4 text-slate-900 dark:text-slate-200 hover:bg-blue-100 dark:hover:bg-blue-900/50"
              >
                Add "{inputValue}"
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
};
