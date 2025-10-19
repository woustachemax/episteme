interface TavilyResponse {
    results: Array<{
        title: string;
        url: string;
        content: string;
        score: number;
    }>;
}

export async function searchWeb(query: string, entityContext?: string[]): Promise<string> {
    try {
        const searchQueries = entityContext && entityContext.length > 0 
            ? entityContext 
            : [`"${query}"`];

        const allResults: Array<{ title: string; url: string; content: string; score: number }> = [];

        for (const searchQuery of searchQueries.slice(0, 3)) {
            const response = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    api_key: process.env.TAVILY_API_KEY,
                    query: searchQuery,
                    search_depth: 'advanced',
                    include_answer: false,
                    max_results: 5,
                    include_domains: [],
                    exclude_domains: [
                        'reddit.com',
                        'quora.com',
                        'answers.yahoo.com',
                        'wikipedia.org'
                    ]
                })
            });

            if (!response.ok) {
                console.error(`Tavily API error for query "${searchQuery}":`, response.status);
                continue;
            }

            const data: TavilyResponse = await response.json();
            allResults.push(...data.results);
        }

        if (allResults.length === 0) {
            throw new Error('No search results found');
        }

        const uniqueResults = Array.from(
            new Map(allResults.map(item => [item.url, item])).values()
        ).sort((a, b) => b.score - a.score);

        const formattedResults = uniqueResults
            .map((result, index) => {
                return `
        SOURCE ${index + 1}: ${result.title}
        URL: ${result.url}
        CONTENT: ${result.content}
        RELEVANCE SCORE: ${result.score}
        ---`;
            })
            .join('\n');

        return formattedResults;

    } catch (error) {
        console.error('Search error:', error);
        throw new Error('Failed to fetch web search results');
    }
}