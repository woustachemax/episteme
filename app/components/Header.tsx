"use client"

import { useState } from "react";
import { motion } from 'framer-motion';
import { Menu, X, User, LogIn, UserPlus, LogOut } from 'lucide-react';
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
  onLogoClick: () => void; 
};

export const Header = ({
  onSearch,
  searchQuery,
  setSearchQuery,
  user,
  onSignIn,
  onSignUp,
  onLogoClick
}: HeaderProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };
  
  return (
    <>
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
              <motion.button 
                onClick={onLogoClick}
                className="flex items-center space-x-3 text-lg font-medium text-white hover:text-gray-300 transition-colors"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                Episteme
              </motion.button>
            </div>

            <div className="hidden md:flex items-center space-x-4 flex-1 max-w-xl mx-8">
              <SearchBox 
                onSearch={onSearch} 
                value={searchQuery} 
                onChange={setSearchQuery}
              />
            </div>

            <div className="hidden lg:flex items-center space-x-3">
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

      {sidebarOpen && (
        <motion.div
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-zinc-900 border-r border-zinc-800 z-30 lg:hidden overflow-y-auto"
        >
          <div className="p-4 space-y-4">
            <div className="md:hidden">
              <SearchBox 
                onSearch={onSearch} 
                value={searchQuery} 
                onChange={setSearchQuery}
              />
            </div>

            {user ? (
              <div className="space-y-3 pt-4 border-t border-zinc-800">
                <div className="flex items-center space-x-3 px-3 py-2 bg-zinc-800 rounded-md">
                  {user.image ? (
                    <Image 
                      src={user.image} 
                      alt={user.name || "User"} 
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <User size={20} className="text-gray-400" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{user.name || "User"}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                </div>
                <motion.button 
                  onClick={() => {
                    handleSignOut();
                    setSidebarOpen(false);
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-zinc-800 hover:bg-red-500/10 rounded-md transition-colors text-gray-300 hover:text-red-400 border border-zinc-700 hover:border-red-500/20"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <LogOut size={16} />
                  <span className="text-sm">Sign Out</span>
                </motion.button>
              </div>
            ) : (
              <div className="space-y-3 pt-4 border-t border-zinc-800">
                <motion.button 
                  onClick={() => {
                    onSignIn();
                    setSidebarOpen(false);
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors text-gray-300 hover:text-white border border-zinc-700"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <LogIn size={16} />
                  <span className="text-sm">Sign In</span>
                </motion.button>
                <motion.button 
                  onClick={() => {
                    onSignUp();
                    setSidebarOpen(false);
                  }}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-white text-black rounded-md hover:bg-gray-100 transition-colors border font-medium"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <UserPlus size={16} />
                  <span className="text-sm">Sign Up</span>
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
        />
      )}
    </>
  );
};