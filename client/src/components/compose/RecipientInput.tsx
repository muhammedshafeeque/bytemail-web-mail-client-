import { useState, useRef, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { contactApi } from '@/api/contactApi';
import { useDebounce } from '@/hooks/useDebounce';
interface RecipientInputProps {
  label: string;
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function RecipientInput({ label, value, onChange, placeholder }: RecipientInputProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedInput = useDebounce(inputValue, 200);

  const { data: suggestions } = useQuery({
    queryKey: ['contact-search', debouncedInput],
    queryFn: async () => {
      if (debouncedInput.length < 1) return [];
      const { data } = await contactApi.search(debouncedInput);
      return data.data;
    },
    enabled: debouncedInput.length >= 1,
  });

  const addRecipient = (email: string) => {
    const trimmed = email.trim();
    if (!trimmed || !isValidEmail(trimmed) || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInputValue('');
  };

  const removeRecipient = (email: string) => {
    onChange(value.filter((v) => v !== email));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      e.preventDefault();
      addRecipient(inputValue);
    }
    if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="flex items-start gap-2 px-3 py-2 min-h-[38px]">
      <span className="text-xs font-medium text-gray-500 mt-1.5 flex-shrink-0 w-7">{label}</span>
      <div
        className="flex flex-wrap gap-1.5 flex-1 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((email) => (
          <span
            key={email}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 text-xs font-medium"
          >
            {email}
            <button onClick={() => removeRecipient(email)} className="hover:text-brand-900 dark:hover:text-brand-100">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <div className="relative flex-1 min-w-[120px]">
          <input
            ref={inputRef}
            type="email"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => { if (inputValue) addRecipient(inputValue); }}
            placeholder={value.length === 0 ? placeholder : ''}
            className="w-full text-sm bg-transparent outline-none text-gray-800 dark:text-gray-200 placeholder-gray-400"
          />
          {suggestions && suggestions.length > 0 && inputValue && (
            <div className="absolute top-full left-0 z-50 mt-1 w-64 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 py-1 max-h-48 overflow-y-auto">
              {suggestions.map((contact) => (
                <button
                  key={contact.email}
                  onMouseDown={(e) => { e.preventDefault(); addRecipient(contact.email); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="h-6 w-6 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-xs font-medium text-brand-700 dark:text-brand-300">
                    {(contact.name || contact.email)[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200">{contact.name}</p>
                    <p className="text-xs text-gray-500">{contact.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
