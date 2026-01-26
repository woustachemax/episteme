export interface WikiArticle {
  title: string;
  content: string;
  summary: string;
  infobox?: Record<string, string>;
  links: string[];
  categories: string[];
}

export interface BiasAnalysis {
  biasScore: number; 
  biasWordsFound: string[];
  totalBiasWords: number;
  neutralWords: number;
  suspiciousPatterns: string[];
  confidence: number;
  summary: string;
}

export interface FormattedContent {
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
}

const BIAS_WORDS = {
  positive: [
    'amazing', 'incredible', 'fantastic', 'brilliant', 'excellent', 'outstanding',
    'revolutionary', 'groundbreaking', 'remarkable', 'magnificent', 'superior',
    'best', 'greatest', 'perfect', 'unparalleled', 'legendary', 'iconic'
  ],
  negative: [
    'terrible', 'awful', 'horrible', 'dreadful', 'worst', 'useless', 'pathetic',
    'devastating', 'disastrous', 'inferior', 'failed', 'disaster', 'catastrophic',
    'atrocious', 'abysmal', 'execrable'
  ],
  opinion: [
    'believe', 'opinion', 'should', 'must', 'clearly', 'obviously', 'undoubtedly',
    'allegedly', 'reportedly', 'supposedly', 'claim', 'argued', 'insists'
  ]
};

const NEUTRAL_WORDS = [
  'is', 'was', 'were', 'be', 'have', 'has', 'do', 'does', 'did',
  'can', 'could', 'may', 'might', 'will', 'would', 'said', 'according',
  'reported', 'found', 'noted', 'observed', 'documented', 'described'
];

async function fetchWikipediaArticle(query: string): Promise<WikiArticle | null> {
  try {
    const searchQuery = encodeURIComponent(query.trim());
    
    const searchResponse = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${searchQuery}&format=json&origin=*`
    );
    
    if (!searchResponse.ok) throw new Error('Wikipedia search failed');
    
    const searchData = await searchResponse.json() as any;
    if (!searchData.query?.search || searchData.query.search.length === 0) {
      return null;
    }
    
    const queryLower = query.toLowerCase();
    let bestMatch = searchData.query.search[0];
    let bestScore = 0;
    
    for (const result of searchData.query.search) {
      const titleLower = (result.title as string).toLowerCase();
      const exactMatch = titleLower === queryLower ? 1000 : 0;
      const startsWithMatch = titleLower.startsWith(queryLower) ? 100 : 0;
      const containsMatch = titleLower.includes(queryLower) ? 50 : 0;
      const words = queryLower.split(/\s+/);
      const wordMatch = words.filter(w => titleLower.includes(w)).length * 10;
      
      const score = exactMatch + startsWithMatch + containsMatch + wordMatch;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = result;
      }
    }
    
    const pageTitle = bestMatch.title as string;
    
    const pageResponse = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages|pageterms|categories|links&titles=${encodeURIComponent(pageTitle)}&explaintext=true&format=json&origin=*&exsectionformat=wiki&redirects=1`
    );
    
    if (!pageResponse.ok) throw new Error('Wikipedia page fetch failed');
    
    const pageData = await pageResponse.json() as any;
    const pages = pageData.query?.pages || {};
    const pageId = Object.keys(pages)[0] as string;
    const page = pages[pageId] as any;
    
    if (!page || page.missing) return null;
    
    const extract: string = page.extract || '';
    const categories: string[] = page.categories?.map((c: any) => (c.title as string).replace('Category:', '')) || [];
    const links: string[] = page.links?.map((l: any) => l.title as string).slice(0, 20) || [];
    
    const summary = extract.split('\n')[0] || extract.substring(0, 200);
    
    return {
      title: page.title,
      content: extract,
      summary: summary,
      links: links,
      categories: categories
    };
  } catch (error) {
    return null;
  }
}

export function analyzeBias(content: string): BiasAnalysis {
  if (!content || content.length === 0) {
    return {
      biasScore: 0,
      biasWordsFound: [],
      totalBiasWords: 0,
      neutralWords: 0,
      suspiciousPatterns: [],
      confidence: 0,
      summary: 'No content to analyze'
    };
  }
  
  const words = content.toLowerCase().split(/\s+/);
  const foundBiasWords: string[] = [];
  const foundNeutralWords: Set<string> = new Set();
  const suspiciousPatterns: string[] = [];
  
  const factualPatterns = [
    /(?:one of|among|considered|regarded as|widely|universally|generally).*?(?:best|greatest|top)/i,
    /(?:best|greatest|top).*?(?:of all time|ever|in history|in the world)/i,
    /(?:record|award|championship|title|achievement|accomplishment)/i,
    /(?:born|died|founded|established|created|invented).*?\d{4}/i,
    /(?:statistics|data|research|study|survey|report).*?(?:show|indicate|demonstrate)/i
  ];
  
  Object.entries(BIAS_WORDS).forEach(([type, biasWordList]) => {
    biasWordList.forEach(biasWord => {
      const regex = new RegExp(`\\b${biasWord}\\b`, 'gi');
      const matches = [...content.matchAll(regex)];
      
      matches.forEach(match => {
        if (!match.index) return;
        
        const start = Math.max(0, match.index - 50);
        const end = Math.min(content.length, match.index + match[0].length + 50);
        const context = content.substring(start, end).toLowerCase();
        
        const isFactual = factualPatterns.some(pattern => pattern.test(context));
        
        if (['best', 'greatest', 'worst', 'top'].includes(biasWord.toLowerCase())) {
          if (isFactual) {
            return;
          }
        }
        
        if (type === 'opinion' && isFactual) {
          return;
        }
        
        foundBiasWords.push(`${biasWord} (${type})`);
      });
    });
  });
  
  words.forEach(word => {
    const cleanWord = word.replace(/[.,!?;:]/g, '');
    if (NEUTRAL_WORDS.includes(cleanWord.toLowerCase())) {
      foundNeutralWords.add(cleanWord);
    }
  });
  
  const patterns = [
    { regex: /\b(all|every|never|always)\b/gi, name: 'Absolutist language' },
    { regex: /\b(clearly|obviously|undoubtedly)\b/gi, name: 'Certainty claims' },
    { regex: /\b(allegedly|supposedly|claimed)\b/gi, name: 'Unverified claims' },
    { regex: /\b(should|must|ought)\b/gi, name: 'Prescriptive language' },
    { regex: /\b(\$[\d,]+|[\d,]+ million|[\d,]+ billion)\b/g, name: 'Specific numbers' }
  ];
  
  patterns.forEach(({ regex, name }) => {
    if (regex.test(content)) {
      suspiciousPatterns.push(name);
    }
  });
  
  const biasWordCount = foundBiasWords.length;
  const neutralWordCount = foundNeutralWords.size;
  const totalWords = words.length;
  
  const biasRatio = biasWordCount / Math.max(totalWords / 10, 1);
  const neutralRatio = neutralWordCount / Math.max(totalWords / 10, 1);
  const rawBiasScore = Math.min(1, biasRatio / (1 + neutralRatio));
  
  const patternBias = Math.min(0.3, suspiciousPatterns.length * 0.05);
  const biasScore = Math.min(1, rawBiasScore + patternBias);
  
  const confidence = Math.min(1, (biasWordCount + suspiciousPatterns.length) / 20);
  
  let summary = '';
  if (biasScore < 0.2) {
    summary = 'Very neutral and factual tone';
  } else if (biasScore < 0.4) {
    summary = 'Mostly neutral with minor bias indicators';
  } else if (biasScore < 0.6) {
    summary = 'Moderate bias detected';
  } else if (biasScore < 0.8) {
    summary = 'Significant bias indicators present';
  } else {
    summary = 'Highly biased content';
  }
  
  return {
    biasScore: Math.round(biasScore * 100) / 100,
    biasWordsFound: [...new Set(foundBiasWords)],
    totalBiasWords: biasWordCount,
    neutralWords: neutralWordCount,
    suspiciousPatterns: [...new Set(suspiciousPatterns)],
    confidence: Math.round(confidence * 100) / 100,
    summary
  };
}

export async function getWikiArticleWithBiasAnalysis(query: string) {
  const article = await fetchWikipediaArticle(query);
  
  if (!article) {
    return {
      success: false,
      error: 'Article not found'
    };
  }
  
  const biasAnalysis = analyzeBias(article.content);
  const formatted = formatWikipediaContent(article);
  
  return {
    success: true,
    article,
    formatted,
    biasAnalysis,
    metadata: {
      wordCount: article.content.split(/\s+/).length,
      categories: article.categories,
      relatedTopics: article.links
    }
  };
}

export function formatWikipediaContent(article: WikiArticle): FormattedContent {
  const normalizedContent = normalizeWikiFormat(article.content);
  const lines = normalizedContent.split('\n').filter(line => line.trim());
  const sections: FormattedContent['sections'] = [];
  let currentSection = { heading: 'Overview', content: '' };
  const keyFacts: string[] = [];

  let overviewLines = 0;
  for (let i = 0; i < lines.length && overviewLines < 3; i++) {
    if (lines[i].trim().length > 10) {
      currentSection.content += (currentSection.content ? '\n\n' : '') + lines[i];
      overviewLines++;
    }
  }

  let sectionStartIdx = overviewLines;
  let currentHeading = '';
  
  for (let i = sectionStartIdx; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith('==') && line.endsWith('==')) {
      if (currentSection.content.trim()) {
        sections.push({ ...currentSection });
      }
      currentHeading = line.replace(/==/g, '').trim();
      currentSection = { heading: currentHeading, content: '' };
    } 
    else if (line.match(/^[\*•\-]\s+/)) {
      keyFacts.push(line.replace(/^[\*•\-]\s+/, '').trim());
      currentSection.content += (currentSection.content ? '\n' : '') + line;
    }
    else if (line.trim().length > 0) {
      currentSection.content += (currentSection.content ? '\n\n' : '') + line;
    }
  }

  if (currentSection.content.trim()) {
    sections.push(currentSection);
  }

  if (sections.length === 0) {
    const paragraphs = article.content.split(/\n\n+/).filter(p => p.trim().length > 0);
    sections.push({
      heading: 'Content',
      content: paragraphs.join('\n\n')
    });
  }

  const displaySections = sections.slice(0, 10);

  return {
    title: article.title,
    summary: article.summary,
    sections: displaySections,
    keyFacts: keyFacts.length > 0 ? keyFacts.slice(0, 8) : [],
    metadata: {
      wordCount: article.content.split(/\s+/).length,
      categories: article.categories.slice(0, 10),
      relatedTopics: article.links.slice(0, 10)
    }
  };
}

function normalizeWikiFormat(content: string): string {
  const lines = content.split('\n');
  return lines.map(line => {
    const match = line.match(/^(=+)\s*(.+?)\s*\1$/);
    if (match) {
      const equals = match[1];
      const text = match[2].trim();
      const level = equals.length - 1;
      if (level > 0) {
        return `${'#'.repeat(level)} ${text}`;
      }
      return text;
    }
    return line;
  }).join('\n');
}
