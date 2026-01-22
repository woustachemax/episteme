"use client"

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Welcome } from "./Welcome";
import { motion } from 'framer-motion';
import { Header } from "./Header";
import { SearchResults } from "./SearchResults";
import AuthModal from "./AuthModal";

type SearchResponse = {
  query: string;
  content: string;
  analysis?: Record<string, unknown>;  
  factCheck?: Record<string, unknown>; 
};

type AuthModalState = {
  isOpen: boolean;
  mode: "signin" | "signup";
};

type AuthFormData = {
  name?: string;
  email: string;
  password: string;
};

export default function EpistemeApp() {
  const { data: session, status } = useSession();
  
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [authModal, setAuthModal] = useState<AuthModalState>({ isOpen: false, mode: 'signin' });

  console.log("Session status:", status, "User:", session?.user);

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    setHasSearched(true);
    setSearchQuery(query);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 50000);

      const response = await fetch('/api/search-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Search failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Search error:', error);
      const isTimeout = error instanceof Error && (
        error.message.includes('timeout') || 
        error.message.includes('abort') ||
        error.name === 'AbortError'
      );
      
      setSearchResults({
        query,
        content: isTimeout 
          ? `The search is taking longer than expected. Please try again in a moment.`
          : `Error: ${errorMsg}`,
        analysis: { error: "Search failed" },
        factCheck: { error: "Search failed" }
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAuth = async (formData: AuthFormData, mode: "signin" | "signup") => {
    try {
      const endpoint = mode === 'signin' ? '/api/auth/signin' : '/api/auth/signup';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          provider: 'credentials'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAuthModal({ isOpen: false, mode: 'signin' });
      } else {
        console.error('Auth error:', data.msg);
      }
    } catch (error) {
      console.error('Auth error:', error);
    }
  };

  const handleLogoClick = () => {
    setHasSearched(false);
    setSearchResults(null);
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-black text-white relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            x: [0, 100, 0],
            y: [0, 50, 0],
            scale: [1, 1.2, 1],
            opacity: [0.02, 0.05, 0.02] 
          }}
          transition={{ 
            duration: 20, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="absolute top-1/3 left-1/3 w-96 h-96 bg-white rounded-full blur-3xl"
        />
        <motion.div 
          animate={{ 
            x: [0, -80, 0],
            y: [0, -30, 0],
            scale: [1.2, 1, 1.2],
            opacity: [0.02, 0.04, 0.02] 
          }}
          transition={{ 
            duration: 25, 
            repeat: Infinity, 
            ease: "easeInOut", 
            delay: 5 
          }}
          className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-gray-400 rounded-full blur-3xl"
        />
      </div>

      <motion.div
        layout
        className="relative z-10"
      >
        {!hasSearched ? (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Welcome onSearch={handleSearch} />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="min-h-screen"
          >
            <Header 
              onSearch={handleSearch}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              user={session?.user || null}
              onSignIn={() => setAuthModal({ isOpen: true, mode: 'signin' })}
              onSignUp={() => setAuthModal({ isOpen: true, mode: 'signup' })}
              onLogoClick={handleLogoClick}
            />
            <SearchResults results={searchResults} isLoading={isSearching} />
          </motion.div>
        )}
      </motion.div>

      <AuthModal
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ isOpen: false, mode: 'signin' })}
        mode={authModal.mode}
        onSubmit={handleAuth}
      />
    </div>
  );
}