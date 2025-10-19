interface EntityCheckResult {
    type: 'company' | 'person' | 'concept' | 'ambiguous';
    confidence: number;
    context: string;
    sources: string[];
    keywords: string[];
}

async function checkDomainExists(query: string): Promise<string | null> {
    const potentialDomains = [
        `${query}.com`,
        `${query}.ai`,
        `${query}.io`,
        `${query}.co`,
        `get${query}.com`,
    ];

    for (const domain of potentialDomains) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);
            
            const response = await fetch(`https://dns.google/resolve?name=${domain}`, {
                method: 'GET',
                signal: controller.signal
            });
            
            clearTimeout(timeout);
            const data = await response.json();
            
            if (data.Status === 0 && data.Answer) {
                return domain;
            }
        } catch {
            continue;
        }
    }
    return null;
}

function buildCompanyContext(query: string, domain: string): EntityCheckResult {
    return {
        type: 'company',
        confidence: 0.9,
        context: `${query} is a technology company or startup. Official website: https://${domain}. Focus on finding recent information about their products, services, team, funding, and market position.`,
        sources: [
            `https://${domain}`,
            `site:crunchbase.com ${query}`,
            `site:linkedin.com/company ${query}`,
            `site:techcrunch.com ${query}`,
            `"${query}" startup`,
            `"${query}" company funding`
        ],
        keywords: ['startup', 'company', 'B2B', 'SaaS', 'technology', 'funding', 'Series A']
    };
}

function buildAmbiguousContext(query: string): EntityCheckResult {
    return {
        type: 'ambiguous',
        confidence: 0.5,
        context: `The term "${query}" may refer to multiple entities. Prioritize recent technology companies, startups, or software products over historical or biological references. Look for .com/.ai/.io domains, Crunchbase listings, and recent news articles.`,
        sources: [
            `"${query}" company`,
            `"${query}" startup`,
            `"${query}" technology`,
            `site:crunchbase.com ${query}`,
            query
        ],
        keywords: ['company', 'startup', 'technology', 'software']
    };
}

export async function resolveEntity(query: string): Promise<EntityCheckResult> {
    const normalizedQuery = query.toLowerCase().trim();
    
    const domain = await checkDomainExists(normalizedQuery);
    
    if (domain) {
        return buildCompanyContext(query, domain);
    }

    const hasCapitalization = /^[A-Z][a-z]+$/.test(query);
    const isSingleWord = !query.includes(' ');
    const isShortName = query.length <= 15;
    
    if (hasCapitalization && isSingleWord && isShortName) {
        return buildAmbiguousContext(query);
    }

    return {
        type: 'concept',
        confidence: 0.7,
        context: `General topic: ${query}`,
        sources: [query],
        keywords: []
    };
}