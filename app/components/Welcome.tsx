import React from 'react';
import { motion } from 'framer-motion';
import { SearchBox } from './SearchBoc'; 

type WelcomeProps = {
  onSearch: (query: string) => Promise<void>;
};

export const Welcome: React.FC<WelcomeProps> = ({ onSearch }) => {
  console.log("Welcome component rendering"); 
  
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-5 py-24 bg-gradient-to-br from-slate-900 via-purple-900/20 to-blue-900/20">
      {/* <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded text-sm z-50">
        Welcome Component Loaded
      </div> */}
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-8 max-w-4xl w-full"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative w-fit mx-auto"
        >
          <h1 className="relative py-4 bg-gradient-to-r from-gray-200 via-gray-100 to-white bg-clip-text text-4xl md:text-6xl font-extrabold text-transparent text-center">
            Welcome to Episteme
          </h1>
          <h1 className="absolute inset-0 py-4 text-4xl md:text-6xl font-extrabold text-white text-center opacity-20">
            Welcome to Episteme
          </h1>
        </motion.div>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto"
        >
          Discover knowledge with AI-powered search, fact-checking, and content analysis
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="max-w-2xl mx-auto"
        >
          <SearchBox onSearch={onSearch} isWelcome={true} />
        </motion.div>
      </motion.div>
    </div>
  );
};