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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: isWelcome ? 0.6 : 0 }}
      className={`relative ${isWelcome ? 'max-w-2xl mx-auto' : 'flex-1 max-w-2xl'}`}
    >
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
          placeholder="Search for knowledge..."
          className={`w-full pl-12 pr-16 py-4 bg-slate-800/50 border border-slate-600/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent text-white placeholder-slate-400 backdrop-blur-xl ${isWelcome ? 'text-lg' : ''}`}
        />
        <button
          onClick={handleSearch}
          disabled={!query.trim() || isLoading}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
