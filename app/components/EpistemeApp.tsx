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
    console.log("Search initiated with query:", query);
    setIsSearching(true);
    setHasSearched(true);
    setSearchQuery(query);

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      console.log("Response details:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Search failed: ${response.status} - ${errorText}`);
      }

      const data: SearchResponse = await response.json();
      console.log("Search results received:", data);
      setSearchResults(data);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({
        query,
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
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