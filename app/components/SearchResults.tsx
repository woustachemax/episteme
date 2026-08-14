import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, ExternalLink, BookOpen } from 'lucide-react';
import { useState, useEffect, type JSX } from 'react';
import { SuggestionsModal } from './SuggestionsModal';
import { AnimatedLoader } from './AnimatedLoader';
import { DivergenceThreads } from './DivergenceThreads';

type ResearchSource = {
  index: number;
  type: 'wikipedia' | 'independent';
  title: string;
  url: string;
};

type ResearchDivergence = {
  claim: string;
  wikipediaSays: string;
  independentSays: string;
  citationIndexes: number[];
};

type ResearchResult = {
  synthesis: string;
  sources: ResearchSource[];
  divergences: ResearchDivergence[];
};

type SearchResultsData = {
  query: string;
  content: string;
  formatted?: {
    title: string;
    summary: string;
    sections: Array<{
      heading: string;
      content: string;
    }>;
    keyFacts: string[];
    metadata: {
      wordCount: number;
      categories: string[];
      relatedTopics: string[];
    };
  };
  research?: ResearchResult;
  cached?: boolean;
};

type SearchResultsProps = {
  results: SearchResultsData | null;
  isLoading: boolean;
  currentQuery?: string;
  onRequestAuth: () => void;
};

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function renderSynthesis(text: string, onCite: (index: number) => void): JSX.Element[] {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

  return paragraphs.map((para, pIdx) => {
    const cleaned = para.replace(/\*\*/g, '').trim();
    const parts = cleaned.split(/(\[\d+\])/g);

    return (
      <p key={pIdx} className="leading-relaxed text-gray-300 mb-4 last:mb-0">
        {parts.map((part, i) => {
          const match = part.match(/^\[(\d+)\]$/);
          if (match) {
            const index = parseInt(match[1], 10);
            return (
              <button
                key={i}
                onClick={() => onCite(index)}
                className="inline-flex items-center justify-center text-[10px] font-medium mx-0.5 -translate-y-0.5 px-1.5 py-0.5 rounded bg-zinc-800 text-blue-300 hover:bg-zinc-700 hover:text-blue-200 border border-zinc-700 transition-colors"
              >
                {index}
              </button>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </p>
    );
  });
}

export const SearchResults = ({ results, isLoading, currentQuery, onRequestAuth }: SearchResultsProps) => {
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [highlightedSource, setHighlightedSource] = useState<number | null>(null);

  const hasSynthesis = Boolean(results?.research?.synthesis);

  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);
  const [expandedForQuery, setExpandedForQuery] = useState<string | undefined>(results?.query);
  if (results?.query !== expandedForQuery) {
    setExpandedForQuery(results?.query);
    setManualExpanded(null);
  }
  const articleExpanded = manualExpanded ?? !hasSynthesis;

  useEffect(() => {
    const handleTextSelection = (e: MouseEvent) => {
      const articleContent = document.getElementById('article-content');
      if (!articleContent || !articleContent.contains(e.target as Node)) {
        return;
      }

      const selectedText = window.getSelection()?.toString();
      if (selectedText && selectedText.length > 3 && results) {
        const storageKey = `selectedText_${results.query}`;
        localStorage.setItem(storageKey, selectedText.trim());
        setSuggestionsOpen(true);
      }
    };

    document.addEventListener('mouseup', handleTextSelection as EventListener);
    return () => document.removeEventListener('mouseup', handleTextSelection as EventListener);
  }, [results]);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-12">
        <AnimatedLoader query={currentQuery || results?.query || 'your query'} />
      </div>
    );
  }

  if (!results) return null;

  const handleCitationClick = (index: number) => {
    const el = document.getElementById(`source-${index}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedSource(index);
    setTimeout(() => setHighlightedSource(current => (current === index ? null : current)), 2000);
  };

  const sources = results.research?.sources ?? [];
  const title = (results.formatted?.title || results.query).replace(/^#+\s*/, '').replace(/\*\*/g, '');

  const CachedBadge = () => (
    <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-700 text-emerald-300 text-xs font-medium rounded-md">
      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
      Cached
    </span>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto px-6 py-12"
    >
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <DivergenceThreads articleQuery={results.query} onCitationClick={handleCitationClick} onRequestAuth={onRequestAuth} />

          {hasSynthesis && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
              className="bg-zinc-900 rounded-lg p-8 border border-zinc-800"
            >
              <div className="flex justify-between items-start gap-4 mb-5">
                <h1 className="text-2xl font-semibold text-white">{title}</h1>
                {results.cached && <CachedBadge />}
              </div>
              {renderSynthesis(results.research!.synthesis, handleCitationClick)}
            </motion.div>
          )}

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
            className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden"
            id="article-content"
          >
            <button
              onClick={() => hasSynthesis && setManualExpanded(!articleExpanded)}
              className={`w-full flex items-center justify-between gap-4 p-6 text-left ${hasSynthesis ? 'cursor-pointer hover:bg-zinc-800/40 transition-colors' : ''}`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <BookOpen size={18} className="text-gray-500 mt-1 shrink-0" />
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-white truncate">
                    {hasSynthesis ? 'Full Wikipedia article' : title}
                  </h2>
                  <p className="text-gray-400 text-sm mt-0.5 line-clamp-1">
                    {results.formatted?.summary || results.query}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {!hasSynthesis && results.cached && <CachedBadge />}
                {hasSynthesis && (articleExpanded ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />)}
              </div>
            </button>

            {articleExpanded && (
              <div className="px-8 pb-8">
                {results.formatted?.keyFacts && results.formatted.keyFacts.length > 0 && (
                  <div className="bg-zinc-800/50 rounded-lg p-4 mb-6 border border-zinc-700">
                    <h3 className="text-sm font-semibold text-white mb-3">Key Facts</h3>
                    <ul className="space-y-2">
                      {results.formatted.keyFacts.map((fact, idx) => (
                        <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                          <span className="text-blue-400 font-bold min-w-fit">•</span>
                          <span>{fact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-6">
                  {results.formatted?.sections && results.formatted.sections.length > 0 ? (
                    results.formatted.sections.map((section, idx) => {
                      const cleanHeading = section.heading.replace(/^#+\s*/, '').replace(/\*\*/g, '');
                      const paragraphs = section.content.split(/\n\n+/).filter(p => p.trim().length > 0);
                      return (
                        <div key={idx} className="scroll-mt-4">
                          <h3 className="text-base font-semibold text-white mb-3">{cleanHeading}</h3>
                          <div className="prose prose-invert max-w-none text-gray-300 space-y-4">
                            {paragraphs.map((para, pIdx) => (
                              <p key={pIdx} className="leading-relaxed text-gray-300">
                                {para.trim()}
                              </p>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="prose prose-invert max-w-none text-gray-300 space-y-4">
                      {results.content.split(/\n\n+/).filter(p => p.trim().length > 0).map((para, idx) => (
                        <p key={idx} className="leading-relaxed text-gray-300">
                          {para.trim()}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>

          <SuggestionsModal
            articleQuery={results.query}
            content={results.content}
            isOpen={suggestionsOpen}
            onClose={() => setSuggestionsOpen(false)}
            onRequestAuth={onRequestAuth}
          />
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-8 space-y-6">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
              className="bg-zinc-900 rounded-lg p-6 border border-zinc-800"
            >
              <h3 className="text-sm font-medium mb-4 text-gray-400">
                Sources {sources.length > 0 && `(${sources.length})`}
              </h3>

              {sources.length === 0 ? (
                <p className="text-sm text-gray-500">No sources available.</p>
              ) : (
                <ul className="space-y-3">
                  {sources.map(source => (
                    <li
                      key={source.index}
                      id={`source-${source.index}`}
                      className={`rounded-md p-3 border transition-colors ${
                        highlightedSource === source.index
                          ? 'border-blue-500/60 bg-blue-500/10'
                          : 'border-zinc-800 bg-zinc-800/40'
                      }`}
                    >
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-start gap-2"
                      >
                        <span className="text-xs font-medium text-gray-500 mt-0.5 shrink-0">[{source.index}]</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 mb-0.5">
                            {source.type === 'wikipedia' && (
                              <span className="text-[10px] uppercase tracking-wide text-blue-400 font-medium">Wikipedia</span>
                            )}
                          </span>
                          <span className="text-sm text-gray-200 group-hover:text-white transition-colors line-clamp-2 block">
                            {source.title}
                          </span>
                          <span className="text-xs text-gray-500">{hostnameOf(source.url)}</span>
                        </span>
                        <ExternalLink size={13} className="text-gray-600 group-hover:text-gray-400 transition-colors mt-0.5 shrink-0" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
