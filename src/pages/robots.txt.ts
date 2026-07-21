import type { APIContext } from 'astro';

// AI/LLM crawlers we explicitly welcome (in addition to the allow-all default).
// The wildcard below already permits them; listing them is an intent signal that
// training and answer-engine crawlers are welcome to read and cite the site.
const AI_BOTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'anthropic-ai',
  'Claude-Web',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'Amazonbot',
  'Bytespider',
  'CCBot',
  'Meta-ExternalAgent',
  'cohere-ai',
];

export const GET = ({ site }: APIContext) => {
  const sitemap = new URL('/sitemap-index.xml', site).toString();
  const llms = new URL('/llms.txt', site).toString();
  const aiBlock = AI_BOTS.map((bot) => `User-agent: ${bot}\nAllow: /`).join('\n\n');
  const body =
    `# KenAshe.ai welcomes search and AI crawlers. LLM-friendly map: ${llms}\n` +
    `User-agent: *\nAllow: /\n\n` +
    `# AI / LLM crawlers explicitly welcome\n${aiBlock}\n\n` +
    `Sitemap: ${sitemap}\n`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
