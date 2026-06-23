export type Project = {
  title: string;
  status: 'LIVE' | 'SHIPPED';
  dek: string;
  stack: string[];
  shippedAt?: string;
  metric?: string;
  // Custom footer parts, rendered as `·`-separated meta with no "Shipped" key.
  // Used when a build's receipt isn't a ship date (e.g. an event line).
  footer?: string[];
};

// Days elapsed since an ISO date. Computed at build time — Vercel redeploys
// frequently enough (the blog pipeline ships daily) that drift stays small.
export const daysSince = (iso: string) =>
  Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));

export const projects: Project[] = [
  {
    title: 'AI blog automation v2',
    status: 'LIVE',
    dek: "Scans the day's AI sources, clusters them into distinct stories, and auto-publishes only the drafts that clear an editorial quality gate. No human in the loop.",
    stack: ['GitHub Actions', 'Claude Opus 4.8', 'GPT-5.5', 'pgvector'],
    shippedAt: 'Jun 2026',
    metric: 'runs daily',
  },
  {
    title: 'Geo-targeted affiliate site',
    status: 'LIVE',
    dek: "Auto-detects each visitor's country and language, then serves the right offers in their language. Generated entirely from a spreadsheet.",
    stack: ['Cloudflare', 'GitHub', 'HyperAgent', 'Claude Fable 5'],
    shippedAt: 'Jun 2026',
    metric: '58 markets, 26 languages',
  },
  {
    title: 'kenashe.ai',
    status: 'LIVE',
    dek: 'This site. Built end-to-end with Claude Code, reviewed by Codex, shipped in a day.',
    stack: ['Astro', 'Tailwind', 'MDX', 'Vercel'],
    shippedAt: 'May 2026',
  },
  {
    title: 'Daily email to myself',
    status: 'LIVE',
    dek: 'Morning brief at 6 AM: weather, tickers, a dad joke, and 300 words on a rotating topic.',
    stack: ['Python', 'Claude API', 'Mac Mini'],
    shippedAt: 'May 2026',
    metric: `${daysSince('2026-05-04')} days running`,
  },
  {
    title: 'Sir Pitches-a-lot',
    status: 'SHIPPED',
    dek: 'An agent with one job: pitch Ashe Brands to prospective clients. Built in an afternoon, pitched a real target live.',
    stack: ['HyperAgent', 'Airtable', 'Claude Opus 4.8'],
    footer: ['June 2026', 'Agent Battle Night', 'NY Tech Week'],
  },
  {
    title: 'Agent website redesign',
    status: 'SHIPPED',
    dek: 'Used HyperAgent to rebuild a live business site and deploy it to GitHub Pages with a custom domain, agent-driven end to end.',
    stack: ['HyperAgent', 'GitHub Pages', 'Web3Forms'],
    footer: ['Jun 2026', 'LuckyDomains.io'],
  },
  {
    title: 'AI blog automation v1',
    status: 'SHIPPED',
    dek: 'Autonomous pipeline that turns curated YouTube transcripts into auto-published blog posts.',
    stack: ['n8n', 'Claude Opus 4.7', 'Gemini 3.1 Pro', 'GPT-5.5'],
    footer: ['May 2026', '40-point QA gate'],
  },
  {
    title: 'Six-agent email response team',
    status: 'SHIPPED',
    dek: 'A coordinator plus sentiment, research, draft, and QA agents that turn customer support emails into reviewed replies.',
    stack: ['Cassidy AI', 'Claude', 'ChatGPT'],
    footer: ['Feb 2026', 'Maven capstone', 'AI Build Lab'],
  },
  {
    title: 'Personal assistant chatbot',
    status: 'SHIPPED',
    dek: 'A chat agent wired to Gemini that searches email and answers questions on weather, the forecast, and local news.',
    stack: ['n8n', 'Gemini', 'Gmail', 'Weather + news APIs'],
    footer: ['Dec 2025', 'Personal build'],
  },
];
