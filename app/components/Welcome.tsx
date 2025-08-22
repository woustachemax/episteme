import React from 'react';
import { motion } from 'framer-motion';
import { SearchBox } from './SearchBoc';
type WelcomeProps = {
  onSearch: (query: string) => Promise<void>;
};

export const Welcome: React.FC<WelcomeProps> = ({ onSearch }) => {
  console.log("Welcome component rendering"); 
  
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 py-24 bg-black">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center space-y-12 max-w-3xl w-full"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="space-y-6"
        >
          <h1 className="text-5xl md:text-7xl font-medium text-white tracking-tight">
            Episteme
          </h1>
          
          <p className="text-lg md:text-xl text-gray-400 font-light max-w-xl mx-auto leading-relaxed">
            AI-powered search, fact-checking, and content analysis
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="max-w-xl mx-auto"
        >
          <SearchBox onSearch={onSearch} isWelcome={true} />
        </motion.div>
      </motion.div>
    </div>
  );
};