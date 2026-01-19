"use client"

import { useState, ChangeEvent, KeyboardEvent, FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2 } from 'lucide-react';

type SearchBoxProps = {
  onSearch: (query: string) => Promise<void>;
  onChange?: (value: string) => void;
  isWelcome?: boolean;
  value?: string;
};

export const SearchBox = ({
  onSearch,
  onChange,
  isWelcome = false,
  value = '',
}: SearchBoxProps) => {
  const [query, setQuery] = useState(value);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e: FormEvent | KeyboardEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      await onSearch(query);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    onChange?.(newValue);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: isWelcome ? 0.3 : 0, duration: 0.5, ease: "easeOut" }}
      className={`relative ${isWelcome ? 'max-w-xl mx-auto' : 'flex-1 max-w-xl'}`}
    >
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
          placeholder="Search for knowledge..."
          className={`w-full pl-4 pr-14 py-3 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-gray-400 text-white placeholder-gray-500 transition-colors ${isWelcome ? 'text-base' : 'text-sm'}`}
        />
        <button
          onClick={handleSearch}
          disabled={!query.trim() || isLoading}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Search size={16} />
          )}
        </button>
      </div>
    </motion.div>
  );
};