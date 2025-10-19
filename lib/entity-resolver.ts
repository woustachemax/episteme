interface EntityCheckResult {
    type: 'company' | 'person' | 'concept' | 'technology';
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

export async function resolveEntity(query: string): Promise<EntityCheckResult> {
    const lower = query.toLowerCase().trim();
    
    if (/streamer|youtuber|influencer|athlete|singer|actor|rapper|artist|player|coach/i.test(lower)) {
        return {
            type: 'person',
            confidence: 0.9,
            context: `${query} is a person. Focus on biographical info, career, and achievements.`,
            sources: [`"${query}" biography`, `"${query}" career`, `"${query}" who is`, query],
            keywords: ['biography', 'career', 'achievements']
        };
    }
    
    if (/^[a-z]+[0-9]+[a-z0-9_]*$/i.test(query) && query.length > 7) {
        return {
            type: 'person',
            confidence: 0.85,
            context: `${query} is likely a content creator or online personality. Focus on their content, audience, and career.`,
            sources: [`"${query}" streamer`, `"${query}" youtuber`, `"${query}" who is`, query],
            keywords: ['content creator', 'online personality']
        };
    }
    
    const domain = await checkDomainExists(lower);
    if (domain) {
        return {
            type: 'company',
            confidence: 0.95,
            context: `${query} is a company with website: https://${domain}. Focus on products, services, founding, and recent news.`,
            sources: [
                `https://${domain}`,
                `site:crunchbase.com ${query}`,
                `site:linkedin.com/company ${query}`,
                `"${query}" company`,
                query
            ],
            keywords: ['company', 'startup', 'technology', 'products']
        };
    }
    
    if (/inc|corp|ltd|llc|technologies|systems|solutions/i.test(lower)) {
        return {
            type: 'company',
            confidence: 0.85,
            context: `${query} appears to be a company. Focus on business info, products, and leadership.`,
            sources: [`"${query}" company`, `site:crunchbase.com ${query}`, query],
            keywords: ['company', 'business']
        };
    }
    
    if (/^[A-Z]{2,}$/.test(query) || /\.js$|\.py$|api|framework/i.test(lower)) {
        return {
            type: 'technology',
            confidence: 0.8,
            context: `${query} is a technology or technical concept. Focus on how it works and use cases.`,
            sources: [`"${query}" technology`, `"what is ${query}"`, query],
            keywords: ['technology', 'technical']
        };
    }
    
    return {
        type: 'concept',
        confidence: 0.6,
        context: `${query} - Analyze search results to determine if this is a person, company, or concept.`,
        sources: [
            `"${query}" company`,
            `"${query}" who is`,
            `"${query}" startup`,
            query
        ],
        keywords: []
    };
}