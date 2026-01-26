'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, X, Check } from 'lucide-react';

export const FactCheckSettings = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [useExternal, setUseExternal] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('factcheck_api_key');
    const savedUrl = localStorage.getItem('factcheck_api_url');
    const savedUseExternal = localStorage.getItem('factcheck_use_external');
    
    if (savedKey) setApiKey(savedKey);
    if (savedUrl) setApiUrl(savedUrl);
    if (savedUseExternal) setUseExternal(JSON.parse(savedUseExternal));
  }, []);

  const handleSave = () => {
    localStorage.setItem('factcheck_api_key', apiKey);
    localStorage.setItem('factcheck_api_url', apiUrl);
    localStorage.setItem('factcheck_use_external', JSON.stringify(useExternal));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleClear = () => {
    setApiKey('');
    setApiUrl('');
    setUseExternal(false);
    localStorage.removeItem('factcheck_api_key');
    localStorage.removeItem('factcheck_api_url');
    localStorage.removeItem('factcheck_use_external');
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-full p-3 text-gray-300 hover:text-white transition-colors z-40"
        title="Fact-checking settings"
      >
        <Settings size={20} />
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Fact-Checking Settings</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-zinc-800/50 rounded p-4 border border-zinc-700">
                <div className="flex items-center gap-2 mb-1">
                  <Check size={16} className="text-green-400" />
                  <h3 className="font-medium text-white">Local Analysis</h3>
                </div>
                <p className="text-sm text-gray-400">
                  Always available - analyzes bias patterns and suspicious language locally without external APIs.
                </p>
              </div>

              <div className="border border-zinc-700 rounded p-4">
                <label className="flex items-center gap-3 cursor-pointer mb-4">
                  <input
                    type="checkbox"
                    checked={useExternal}
                    onChange={(e) => setUseExternal(e.target.checked)}
                    className="rounded border-zinc-600 bg-zinc-800 text-white-500 focus:ring-white-500"
                  />
                  <span className="font-medium text-white">Enable External Fact-Check API</span>
                </label>

                {useExternal && (
                  <div className="space-y-3 pl-7">
                    <div>
                      <label className="block text-sm text-gray-300 mb-1">API URL</label>
                      <input
                        type="text"
                        value={apiUrl}
                        onChange={(e) => setApiUrl(e.target.value)}
                        placeholder="https://api.example.com/verify"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-white-500 transition-colors"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Should accept POST requests with {'{content, title}'} body
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-300 mb-1">API Key</label>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="your-api-key"
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-white-500 transition-colors"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Sent as Bearer token in Authorization header
                      </p>
                    </div>

                    <div className="text-xs text-yellow-600 bg-yellow-900/20 border border-yellow-700 rounded p-2">
                      Stored locally in your browser. Never shared with our servers.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSave}
                className="flex-1 bg-white-600 hover:bg-white-500 text-zinc font-medium py-2 rounded transition-colors flex items-center justify-center gap-2"
              >
                {saved ? (
                  <>
                    <Check size={16} /> Saved!
                  </>
                ) : (
                  'Save Settings'
                )}
              </button>
              {(apiKey || apiUrl) && (
                <button
                  onClick={handleClear}
                  className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium py-2 rounded transition-colors border border-red-700"
                >
                  Clear
                </button>
              )}
            </div>

            <p className="text-xs text-gray-500 mt-4 text-center">
              Settings are stored locally. No data is sent to our servers.
            </p>
          </motion.div>
        </motion.div>
      )}
    </>
  );
};
