import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, X, TrendingUp } from 'lucide-react';

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
  const [selectedText, setSelectedText] = useState('');
  const [newText, setNewText] = useState('');
  const [reason, setReason] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

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
    }
  }, [isOpen, articleQuery]);

  const handleTextSelection = () => {
    const selected = window.getSelection()?.toString() || '';
    if (selected) {
      setSelectedText(selected);
    }
  };

  const handleSubmitSuggestion = async () => {
    if (!selectedText || !newText || !reason) {
      alert('Please fill in all fields');
      return;
    }

    setIsLoading(true);
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

      if (response.ok) {
        setSubmitted(true);
        setSelectedText('');
        setNewText('');
        setReason('');
        setTimeout(() => setSubmitted(false), 3000);
        await handleFetchSuggestions();
      }
    } catch (error) {
      console.error('Error submitting suggestion:', error);
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
            className="text-gray-500 hover:text-white transition-colors p-1"
          >
            <X size={24} />
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

          <div className="grid md:grid-cols-2 gap-8">
            {/* Left column - Submission form */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white">Propose an Edit</h3>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  1. Select text to change
                </label>
                <div
                  onMouseUp={handleTextSelection}
                  className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 text-gray-300 max-h-32 overflow-hidden cursor-text text-sm leading-relaxed"
                >
                  {content.substring(0, 300)}...
                  <p className="text-xs text-gray-600 mt-3">Highlight text to select</p>
                </div>
                {selectedText && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 p-3 bg-zinc-900 border border-zinc-800 rounded-lg"
                  >
                    <p className="text-xs text-gray-500 mb-1">Selected text:</p>
                    <p className="text-sm text-white font-medium">"{selectedText.substring(0, 100)}{selectedText.length > 100 ? '...' : ''}"</p>
                  </motion.div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  2. Replacement text
                </label>
                <textarea
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none focus:border-gray-700 focus:ring-1 focus:ring-gray-800 transition-all"
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
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-white placeholder-gray-600 focus:outline-none focus:border-gray-700 focus:ring-1 focus:ring-gray-800 transition-all"
                  placeholder="e.g., Updated statistics, corrected typo, recent news"
                />
              </div>

              <button
                onClick={handleSubmitSuggestion}
                disabled={isLoading || !selectedText || !newText || !reason}
                className="w-full bg-white hover:bg-gray-100 disabled:bg-gray-700 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 active:scale-95"
              >
                <Send size={18} />
                {isLoading ? 'Submitting...' : 'Submit Suggestion'}
              </button>
            </div>

            {/* Right column - Community suggestions */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={20} className="text-white" />
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
                      className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors"
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
