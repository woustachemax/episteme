import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

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
[ key: string]: unknown;
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
        <div className="text-center space-y-4">
          <Loader2 size={48} className="animate-spin text-purple-400 mx-auto" />
          <p className="text-slate-300">Searching and analyzing content...</p>
        </div>
      </div>
    );
  }

  if (!results) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
    >
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 rounded-xl p-6 border border-slate-700/30 backdrop-blur-sm"
          >
            <h2 className="text-2xl font-bold mb-4 text-purple-300">Search Results</h2>
            <div className="prose prose-invert max-w-none">
              <div 
                className="text-slate-300 leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: results.content
                    .replace(/## (.+)/g, '<h2 class="text-xl font-bold text-purple-300 mt-6 mb-3">$1</h2>')
                    .replace(/# (.+)/g, '<h1 class="text-2xl font-bold text-purple-200 mt-8 mb-4">$1</h1>')
                    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                    .replace(/- \*\*(.+?)\*\*/g, '• <strong class="text-white font-semibold">$1</strong>')
                    .replace(/\n- /g, '\n• ')
                    .replace(/\n/g, '<br>')
                }}
              />
            </div>
          </motion.div>

          {results.analysis && (
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 rounded-xl p-6 border border-slate-700/30 backdrop-blur-sm"
            >
              <h3 className="text-xl font-bold mb-4 text-blue-300">Content Analysis</h3>
              <div className="text-slate-300">
                {results.analysis.error ? (
                  <p className="text-amber-400">{results.analysis.error}</p>
                ) : (
                  <div className="space-y-4">
                    {results.analysis.word_count && (
                      <div>
                        <span className="font-semibold text-blue-300">Word Count: </span>
                        <span>{results.analysis.word_count}</span>
                      </div>
                    )}
                    
                    {results.analysis.names && results.analysis.names.length > 0 && (
                      <div>
                        <span className="font-semibold text-blue-300">Key Names: </span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {results.analysis.names.slice(0, 10).map((name, index) => (
                            <span 
                              key={index}
                              className="bg-blue-900/30 text-blue-200 px-2 py-1 rounded text-sm"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {results.analysis.dates && results.analysis.dates.length > 0 && (
                      <div>
                        <span className="font-semibold text-blue-300">Key Dates: </span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {results.analysis.dates.slice(0, 10).map((date, index) => (
                            <span 
                              key={index}
                              className="bg-green-900/30 text-green-200 px-2 py-1 rounded text-sm"
                            >
                              {date}
                            </span>
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
          <div className="sticky top-24 space-y-6">
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-6 border border-slate-700/50 backdrop-blur-sm"
            >
              <h3 className="text-lg font-semibold mb-3 text-purple-300">Search Query</h3>
              <p className="text-slate-300 text-sm bg-slate-800/50 rounded-lg p-3">
                {results.query}
              </p>
            </motion.div>

            {results.factCheck && (
              <motion.div
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-6 border border-slate-700/50 backdrop-blur-sm"
              >
                <h3 className="text-lg font-semibold mb-3 text-green-300">Fact Check</h3>
                <div className="text-slate-300 text-sm space-y-4">
                  {results.factCheck.error ? (
                    <p className="text-amber-400">{results.factCheck.error}</p>
                  ) : (
                    <>
                      {results.factCheck.confidence_score && (
                        <div>
                          <span className="font-semibold text-green-300">Confidence Score:</span>{" "}
                          {results.factCheck.confidence_score}
                        </div>
                      )}

                      {results.factCheck.bias_words_found && results.factCheck.bias_words_found.length > 0 && (
                        <div>
                          <span className="font-semibold text-green-300">Bias Words Found:</span>{" "}
                          {results.factCheck.bias_words_found.join(", ")}
                        </div>
                      )}

                      {results.factCheck.total_claims && (
                        <div>
                          <span className="font-semibold text-green-300">Total Claims:</span>{" "}
                          {results.factCheck.total_claims}
                        </div>
                      )}

                      {results.factCheck.factual_claims && results.factCheck.factual_claims.length > 0 && (
                        <div>
                          <span className="font-semibold text-green-300">Factual Claims:</span>
                          <ul className="list-disc pl-5 mt-2 space-y-1">
                            {results.factCheck.factual_claims.map((claim, idx) => (
                              <li key={idx}>{claim.trim()}</li>
                            ))}
                          </ul>
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
