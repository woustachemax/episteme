"use client"

import { useState } from "react";
import { motion } from 'framer-motion';
import { Globe, Menu, X, User, LogIn, UserPlus, LogOut } from 'lucide-react';
import { SearchBox } from "./SearchBoc";
import { signOut } from "next-auth/react";
import Image from 'next/image';

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
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800"
    >
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-md bg-zinc-900 hover:bg-zinc-800 transition-colors text-gray-400 hover:text-white"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <motion.div 
              className="flex items-center space-x-3"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <span className="text-lg font-medium text-white">
                Episteme
              </span>
            </motion.div>
          </div>

          <div className="hidden md:flex items-center space-x-4 flex-1 max-w-xl mx-8">
            <SearchBox 
              onSearch={onSearch} 
              value={searchQuery} 
              onChange={setSearchQuery}
            />
          </div>

          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-2">
                <motion.div 
                  className="flex items-center space-x-2 px-3 py-2 bg-zinc-900 rounded-md border border-zinc-800"
                  whileHover={{ backgroundColor: "rgb(39 39 42)" }}
                  transition={{ duration: 0.2 }}
                >
                  {user.image ? (
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Image 
                        src={user.image} 
                        alt={user.name || "User"} 
                        width={20}
                        height={20}
                        className="w-5 h-5 rounded-full"
                      />
                    </motion.div>
                  ) : (
                    <User size={14} className="text-gray-400" />
                  )}
                  <span className="text-sm text-gray-300">{user.name || user.email || "User"}</span>
                </motion.div>
                <motion.button 
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 px-3 py-2 bg-zinc-900 hover:bg-red-500/10 rounded-md transition-colors text-gray-400 hover:text-red-400 border border-zinc-800 hover:border-red-500/20"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <LogOut size={14} />
                  <span className="hidden sm:inline text-sm">Sign Out</span>
                </motion.button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <motion.button 
                  onClick={onSignIn}
                  className="flex items-center space-x-2 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-md transition-colors text-gray-400 hover:text-white border border-zinc-800 hover:border-zinc-700"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <LogIn size={14} />
                  <span className="hidden sm:inline text-sm">Sign In</span>
                </motion.button>
                <motion.button 
                  onClick={onSignUp}
                  className="flex items-center space-x-2 px-3 py-2 bg-white text-black rounded-md hover:bg-gray-100 transition-colors border"
                  whileHover={{ scale: 1.02, backgroundColor: "rgb(243 244 246)" }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <UserPlus size={14} />
                  <span className="hidden sm:inline text-sm font-medium">Sign Up</span>
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
};