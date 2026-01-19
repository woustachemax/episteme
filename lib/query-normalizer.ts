import db from './db';

const NAME_SUFFIXES = /\s+(jr|sr|ii|iii|iv|v|junior|senior)$/i;

function normalizeSuffixes(query: string): string {
  return query
    .replace(NAME_SUFFIXES, '')
    .replace(/\b(jr|sr)\b/gi, (match) => match.toLowerCase() === 'jr' ? 'junior' : 'senior')
    .trim();
}

function extractWords(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(w => w.length > 0);
}

export async function normalizeQuery(query: string): Promise<string> {
  if (!query) return '';
  
  let normalized = normalizeSuffixes(query.trim().toLowerCase());
  const words = extractWords(normalized);
  
  if (words.length >= 2) {
    return normalized;
  }
  
  if (words.length === 0) return normalized;
  
  const searchWord = words[0];
  
  try {
    const matchingArticles = await db.article.findMany({
      where: {
        query: {
          contains: searchWord,
          mode: 'insensitive'
        }
      },
      select: { query: true },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    
    if (matchingArticles.length > 0) {
      const fullNames = matchingArticles
        .map(a => normalizeSuffixes(a.query.toLowerCase()))
        .filter(q => extractWords(q).length >= 2)
        .sort((a, b) => extractWords(b).length - extractWords(a).length);
      
      if (fullNames.length > 0) {
        return fullNames[0];
      }
      
      const bestMatch = matchingArticles[0].query.toLowerCase();
      if (extractWords(bestMatch).length >= extractWords(normalized).length) {
        return normalizeSuffixes(bestMatch);
      }
    }
  } catch (error) {
    console.error('Error normalizing query:', error);
  }
  
  return normalized;
}
