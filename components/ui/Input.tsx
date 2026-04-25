
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label: string;
  name: string;
  as?: 'input' | 'textarea';
}

export const Input: React.FC<InputProps> = ({ label, name, as = 'input', className, ...props }) => {
  const baseClasses = 'w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow';
  
  const InputComponent = as === 'textarea' ? 'textarea' : 'input';
  
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label}
      </label>
      <InputComponent
        id={name}
        name={name}
        className={`${baseClasses} ${className}`}
        {...(props as any)}
      />
    </div>
  );
};
