import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession, signIn } from 'next-auth/react';

type Suggestion = {
  id: string;
  oldText: string;
  newText: string;
  reason: string;
  votes: number;
  status: string;
  author?: {
    id: string;
    name: string;
    email: string;
  };
};

type SuggestionsModalProps = {
  articleQuery: string;
  content: string;
  isOpen: boolean;
  onClose: () => void;
};

export const SuggestionsModal = ({
  articleQuery,
  content,
  isOpen,
  onClose
}: SuggestionsModalProps) => {
  const { data: session } = useSession();
  const [selectedText, setSelectedText] = useState('');
  const [newText, setNewText] = useState('');
  const [reason, setReason] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);

  const handleFetchSuggestions = async () => {
    setFetchError(null);
    try {
      const response = await fetch(`/api/suggestions?articleQuery=${encodeURIComponent(articleQuery)}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch suggestions';
      setFetchError(msg);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleFetchSuggestions();
      const storageKey = `selectedText_${articleQuery}`;
      const storedText = localStorage.getItem(storageKey);
      if (storedText) {
        setSelectedText(storedText);
      } else {
        const selected = window.getSelection()?.toString() || '';
        if (selected && selected.length > 3) {
          setSelectedText(selected.trim());
        }
      }
    }
  }, [isOpen, articleQuery]);

  const handleSubmitSuggestion = async () => {
    if (!selectedText || !newText || !reason) {
      alert('Please fill in all fields');
      return;
    }

    if (!session) {
      setAuthError(true);
      return;
    }

    setIsLoading(true);
    setAuthError(false);
    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleQuery,
          oldText: selectedText,
          newText,
          reason
        })
      });

      if (response.status === 401) {
        setAuthError(true);
        return;
      }

      if (response.ok) {
        setSubmitted(true);
        setSelectedText('');
        setNewText('');
        setReason('');
        setTimeout(() => setSubmitted(false), 3000);
        await handleFetchSuggestions();
      } else {
        const errorData = await response.json().catch(() => ({}));
        setFetchError(errorData.error || 'Failed to submit suggestion');
      }
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      setFetchError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden border border-zinc-800 shadow-2xl flex flex-col"
      >
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold text-white">Suggest Changes</h2>
            <p className="text-sm text-gray-500 mt-1">Help improve this article with community edits</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-1 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto flex-1">
          {submitted && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-950/30 border border-green-900 text-green-300 p-4 rounded-lg flex items-center gap-3"
            >
              <div className="text-lg">✓</div>
              <div>
                <p className="font-medium">Suggestion submitted successfully</p>
                <p className="text-sm text-green-300/70">Your contribution will appear in the suggestions feed</p>
              </div>
            </motion.div>
          )}

          {fetchError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-950/30 border border-red-900 text-red-300 p-4 rounded-lg text-sm"
            >
              Error loading suggestions: {fetchError}
            </motion.div>
          )}

          {authError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-950/30 border border-red-900 text-red-300 p-4 rounded-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Authentication required</p>
                  <p className="text-sm text-red-300/70 mt-1">Please sign in to submit suggestions</p>
                </div>
                <button
                  onClick={() => signIn()}
                  className="ml-4 bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                >
                  Sign In
                </button>
              </div>
            </motion.div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Propose an Edit</h3>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  1. Selected text
                </label>
                {selectedText ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg"
                  >
                    <p className="text-sm text-white leading-relaxed">"{selectedText}"</p>
                  </motion.div>
                ) : (
                  <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg text-gray-500 text-sm">
                    No text selected. Select text from the article to suggest changes.
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  2. Replacement text
                </label>
                <textarea
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none focus:border-gray-400 transition-colors"
                  placeholder="Enter the corrected or updated text"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  3. Reason for change
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none focus:border-gray-400 transition-colors"
                  placeholder="e.g., Updated statistics, corrected typo, recent news"
                />
              </div>

              <button
                onClick={handleSubmitSuggestion}
                disabled={isLoading || !selectedText || !newText || !reason || !session}
                className={`w-full font-semibold py-3 rounded-lg flex items-center justify-center transition-all duration-200 active:scale-95 ${
                  !session 
                    ? 'bg-white hover:bg-gray-100 text-zinc-900' 
                    : 'bg-white hover:bg-gray-100 disabled:bg-gray-700 disabled:cursor-not-allowed text-black'
                }`}
              >
                {!session ? 'Sign in required to submit suggestions' : isLoading ? 'Submitting...' : 'Submit Suggestion'}
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Community Suggestions</h3>
              </div>

              {suggestions.length === 0 ? (
                <div className="h-full flex items-center justify-center text-center">
                  <div>
                    <p className="text-gray-400 text-sm">No suggestions yet</p>
                    <p className="text-gray-500 text-xs mt-1">Be the first to suggest a change</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-hidden">
                  {suggestions.map((sugg) => (
                    <motion.div
                      key={sugg.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-zinc-900 border border-zinc-800 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <span className={`text-xs font-semibold uppercase px-2 py-1 rounded ${
                          sugg.status === 'APPROVED' ? 'bg-green-950 text-green-400' :
                          sugg.status === 'REJECTED' ? 'bg-red-950 text-red-400' :
                          'bg-gray-950 text-gray-400'
                        }`}>
                          {sugg.status}
                        </span>
                        <span className="text-sm font-semibold text-gray-400">
                          {sugg.votes} votes
                        </span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500 font-medium">Change:</p>
                        <p className="text-sm text-gray-300 leading-relaxed">
                          <span className="line-through text-red-500/70 bg-red-950/30 px-1 rounded">{sugg.oldText}</span>
                          <span className="mx-1">→</span>
                          <span className="text-green-400/90 bg-green-950/30 px-1 rounded">{sugg.newText}</span>
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {sugg.reason}
                      </p>
                      {sugg.author && (
                        <p className="text-xs text-gray-600 mt-2">
                          by {sugg.author.name}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
