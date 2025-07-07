"use client"

import { useState } from "react";
import { motion } from 'framer-motion';
import { Globe, Menu, X, User, LogIn, UserPlus, LogOut } from 'lucide-react';
import { SearchBox } from "./SearchBoc";
import { signOut } from "next-auth/react";

type UserType = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type HeaderProps = {
  onSearch: (query: string) => Promise<void>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  user?: UserType | null;
  onSignIn: () => void;
  onSignUp: () => void;
};

export const Header = ({
  onSearch,
  searchQuery,
  setSearchQuery,
  user,
  onSignIn,
  onSignUp
}: HeaderProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Globe size={18} className="text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Episteme
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-4 flex-1 max-w-2xl mx-8">
            <SearchBox 
              onSearch={onSearch} 
              value={searchQuery} 
              onChange={setSearchQuery}
            />
          </div>

          <div className="flex items-center space-x-2">
            {user ? (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2 px-3 py-2 bg-slate-800/50 rounded-lg">
                  {user.image ? (
                    <img 
                      src={user.image} 
                      alt={user.name || "User"} 
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <User size={16} />
                  )}
                  <span className="text-sm">{user.name || user.email || "User"}</span>
                </div>
                <button 
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-colors"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button 
                  onClick={onSignIn}
                  className="flex items-center space-x-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-colors"
                >
                  <LogIn size={16} />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
                <button 
                  onClick={onSignUp}
                  className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  <UserPlus size={16} />
                  <span className="hidden sm:inline">Sign Up</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
};