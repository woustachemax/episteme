import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

type AnalysisResult = {
  error?: string;
  names?: string[];
  dates?: string[];
  word_count?: number;
  [key: string]: unknown;
};

type FactCheckResult = {
  error?: string;
  factual_claims?: string[];
  bias_words_found?: string[];
  confidence_score?: number;
  total_claims?: number;
  [key: string]: unknown;
};

type SearchResultsData = {
  query: string;
  content: string;
  analysis?: AnalysisResult;
  factCheck?: FactCheckResult;
};

type SearchResultsProps = {
  results: SearchResultsData | null;
  isLoading: boolean;
};

export const SearchResults = ({ results, isLoading }: SearchResultsProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-6">
          <Loader2 size={32} className="animate-spin text-white mx-auto" />
          <p className="text-gray-400 font-light">Searching and analyzing content...</p>
        </div>
      </div>
    );
  }

  if (!results) return null;

  const getConfidenceColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getConfidenceBg = (score?: number) => {
    if (!score) return 'bg-gray-500/10';
    if (score >= 0.8) return 'bg-green-500/10';
    if (score >= 0.6) return 'bg-yellow-500/10';
    return 'bg-red-500/10';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto px-6 py-12"
    >
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
            className="bg-zinc-900 rounded-lg p-8 border border-zinc-800"
          >
            <h2 className="text-xl font-medium mb-6 text-white">Search Results</h2>
            <div className="prose prose-invert max-w-none">
              <div 
                className="text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: results.content
                    .replace(/## (.+)/g, '<h2 class="text-lg font-medium text-white mt-8 mb-4">$1</h2>')
                    .replace(/# (.+)/g, '<h1 class="text-xl font-medium text-white mt-10 mb-6">$1</h1>')
                    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-medium">$1</strong>')
                    .replace(/- \*\*(.+?)\*\*/g, '• <strong class="text-white font-medium">$1</strong>')
                    .replace(/\n- /g, '\n• ')
                    .replace(/\n/g, '<br>')
                }}
              />
            </div>
          </motion.div>

          {results.analysis && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
              className="bg-zinc-900 rounded-lg p-8 border border-zinc-800"
            >
              <h3 className="text-lg font-medium mb-6 text-white">Content Analysis</h3>
              <div className="text-gray-300">
                {results.analysis.error ? (
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertTriangle size={16} />
                    <p>{results.analysis.error}</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {results.analysis.word_count && (
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-sm">Word Count</span>
                        <span className="text-white font-medium">{results.analysis.word_count.toLocaleString()}</span>
                      </div>
                    )}
                    
                    {results.analysis.names && results.analysis.names.length > 0 && (
                      <div>
                        <span className="text-gray-400 text-sm block mb-3">Key Names</span>
                        <div className="flex flex-wrap gap-2">
                          {results.analysis.names.slice(0, 10).map((name, index) => (
                            <motion.span 
                              key={index}
                              initial={{ scale: 0.9, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: 0.3 + (index * 0.05), duration: 0.3 }}
                              className="bg-zinc-800 text-gray-300 px-3 py-1.5 rounded-md text-sm border border-zinc-700 hover:border-zinc-600 transition-colors"
                            >
                              {name}
                            </motion.span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {results.analysis.dates && results.analysis.dates.length > 0 && (
                      <div>
                        <span className="text-gray-400 text-sm block mb-3">Key Dates</span>
                        <div className="flex flex-wrap gap-2">
                          {results.analysis.dates.slice(0, 10).map((date, index) => (
                            <motion.span 
                              key={index}
                              initial={{ scale: 0.9, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: 0.4 + (index * 0.05), duration: 0.3 }}
                              className="bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-md text-sm border border-blue-500/20 hover:border-blue-500/40 transition-colors"
                            >
                              {date}
                            </motion.span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-6">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
              className="bg-zinc-900 rounded-lg p-6 border border-zinc-800"
            >
              <h3 className="text-sm font-medium mb-3 text-gray-400">Search Query</h3>
              <p className="text-white text-sm bg-zinc-800 rounded-md p-3 border border-zinc-700">
                {results.query}
              </p>
            </motion.div>

            {results.factCheck && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.5, ease: "easeOut" }}
                className="bg-zinc-900 rounded-lg p-6 border border-zinc-800"
              >
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 size={16} className="text-green-400" />
                  <h3 className="text-sm font-medium text-white">Fact Check</h3>
                </div>
                
                <div className="space-y-4">
                  {results.factCheck.error ? (
                    <div className="flex items-center gap-2 text-red-400">
                      <AlertTriangle size={14} />
                      <p className="text-sm">{results.factCheck.error}</p>
                    </div>
                  ) : (
                    <>
                      {results.factCheck.confidence_score !== undefined && (
                        <motion.div 
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.4, duration: 0.4 }}
                          className={`${getConfidenceBg(results.factCheck.confidence_score)} rounded-lg p-4 border border-opacity-20`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">Confidence</span>
                            <span className={`font-medium ${getConfidenceColor(results.factCheck.confidence_score)}`}>
                              {Math.round((results.factCheck.confidence_score || 0) * 100)}%
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${(results.factCheck.confidence_score || 0) * 100}%` }}
                              transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
                              className={`h-full rounded-full ${
                                results.factCheck.confidence_score && results.factCheck.confidence_score >= 0.8 
                                  ? 'bg-green-400' 
                                  : results.factCheck.confidence_score && results.factCheck.confidence_score >= 0.6 
                                  ? 'bg-yellow-400' 
                                  : 'bg-red-400'
                              }`}
                            />
                          </div>
                        </motion.div>
                      )}

                      {results.factCheck.bias_words_found && results.factCheck.bias_words_found.length > 0 && (
                        <div>
                          <span className="text-gray-400 text-sm block mb-2">Bias Indicators</span>
                          <div className="flex flex-wrap gap-1.5">
                            {results.factCheck.bias_words_found.map((word, idx) => (
                              <motion.span 
                                key={idx}
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.5 + (idx * 0.1), duration: 0.3 }}
                                className="bg-red-500/10 text-red-400 px-2 py-1 rounded text-xs border border-red-500/20 hover:border-red-500/40 transition-colors"
                              >
                                {word}
                              </motion.span>
                            ))}
                          </div>
                        </div>
                      )}

                      {results.factCheck.total_claims && (
                        <div className="flex items-center justify-between py-2">
                          <span className="text-gray-400 text-sm">Total Claims</span>
                          <span className="text-white font-medium">{results.factCheck.total_claims}</span>
                        </div>
                      )}

                      {results.factCheck.factual_claims && results.factCheck.factual_claims.length > 0 && (
                        <div>
                          <span className="text-gray-400 text-sm block mb-3">Key Claims</span>
                          <div className="space-y-2">
                            {results.factCheck.factual_claims.slice(0, 3).map((claim, idx) => (
                              <motion.div 
                                key={idx}
                                initial={{ x: -10, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.6 + (idx * 0.1), duration: 0.4 }}
                                className="text-sm text-gray-300 bg-zinc-800 rounded-md p-3 border border-zinc-700"
                              >
                                {claim.trim()}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};