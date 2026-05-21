import type { MetadataRoute } from 'next';

const APP_DISALLOW = [
  '/api/',
  '/auth/',
  '/account',
  '/my-collections',
  '/collection/',
  '/calendar',
  '/new-collection',
  '/planner/',
  '/p/',
  '/presentation/',
  '/tech-pack/',
];

// Wave 0a — explicit allowlist for major LLM crawlers. Same disallow rules
// as the wildcard rule (app surfaces never index), but declared per-bot
// so we control crawl signals + can revisit individually if a bot becomes
// abusive. See SEO-GEO-STRATEGY §3.3.7 + §5.5.
const LLM_BOTS = [
  'GPTBot',           // OpenAI
  'ClaudeBot',        // Anthropic
  'PerplexityBot',    // Perplexity
  'Google-Extended',  // Google AI training (separate from Googlebot)
  'Applebot-Extended', // Apple AI training
  'cohere-ai',        // Cohere
  'anthropic-ai',     // Anthropic legacy
  'CCBot',            // Common Crawl (feeds many LLMs)
  'Bytespider',       // ByteDance
  'OAI-SearchBot',    // OpenAI search-specific
  'PerplexityUser',   // Perplexity user-agent for live search
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: APP_DISALLOW },
      ...LLM_BOTS.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: APP_DISALLOW,
      })),
    ],
    sitemap: 'https://www.aimily.app/sitemap.xml',
    host: 'https://www.aimily.app',
  };
}
