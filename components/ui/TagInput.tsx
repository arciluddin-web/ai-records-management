
import React, { useState } from 'react';
import { Tag } from '../../types';
import { X } from 'lucide-react';

interface TagInputProps {
  label: string;
  availableTags: Tag[];
  selectedTags: Tag[];
  onChange: (tags: Tag[]) => void;
}

export const TagInput: React.FC<TagInputProps> = ({ label, availableTags, selectedTags, onChange }) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      const existingTag = availableTags.find(t => t.label.toLowerCase() === inputValue.trim().toLowerCase());
      const newTag = existingTag || { label: inputValue.trim(), color: 'bg-gray-500' };
      if (!selectedTags.some(t => t.label === newTag.label)) {
        onChange([...selectedTags, newTag]);
      }
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: Tag) => {
    onChange(selectedTags.filter(tag => tag.label !== tagToRemove.label));
  };
  
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label}
      </label>
      <div className="flex flex-wrap gap-2 items-center w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800">
        {selectedTags.map(tag => (
          <span key={tag.label} className={`flex items-center gap-1.5 px-2.5 py-1 text-sm font-semibold text-white ${tag.color} rounded-full`}>
            {tag.label}
            <button type="button" onClick={() => removeTag(tag)} className="text-white/70 hover:text-white">
              <X size={14} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a tag..."
          className="flex-grow bg-transparent focus:outline-none p-1"
          list="available-tags"
        />
        <datalist id="available-tags">
            {availableTags.filter(t => !selectedTags.some(st => st.label === t.label)).map(t => <option key={t.label} value={t.label} />)}
        </datalist>
      </div>
    </div>
  );
};
