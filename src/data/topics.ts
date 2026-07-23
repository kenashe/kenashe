// Beachhead topic hubs. Each hub is an evergreen pillar page at /topics/<slug>/ that
// aggregates every post whose tags intersect `family` and leads with an owned POV intro.
// `canonical` is the tag the pipeline standardizes on going forward; the hub still
// gathers the whole family so older, fragmented tags are included.
export interface Topic {
  slug: string;
  title: string;
  blurb: string;
  canonical: string;
  family: string[];
  intro: string;
}

export const topics: Topic[] = [
  {
    slug: 'agents-and-evals',
    title: 'AI Agents & Evals',
    blurb: 'What separates an agent demo from a system that ships, and how to actually evaluate it.',
    canonical: 'ai-agents',
    family: ['ai-agents', 'agents', 'agentic', 'tool-use', 'langchain', 'evals', 'evaluation', 'agent-eval'],
    intro: `AI agents get hyped as autonomous coworkers and dismissed as glorified chatbots. Both miss the point. An agent is a loop: a model that calls tools, hits errors, retries, and sometimes finishes the job. What separates a demo from something you'd run in production is rarely the model. It's the harness, the tool design, and whether you can actually measure when it works. That's why agents and evaluation belong together here. I track the architectures that hold up, the eval methods that catch failure before your users do, and the honest gap between a slick demo and a system that ships.`,
  },
  {
    slug: 'ai-marketing-ops',
    title: 'AI for Marketing & Ops',
    blurb: 'How AI really changes marketing and operations work, from a marketer and CPA who wants proof.',
    canonical: 'marketing-ops',
    family: ['marketing-ops', 'marketing-automation', 'seo', 'brand-voice', 'ai-marketing'],
    intro: `I'm a marketer and a CPA, so I look at AI the way an operator does: does it move a number, and can I prove it? Most AI-for-marketing content is either vendor hype or generic prompt lists. This is the other thing. Here I track how AI actually changes marketing and operations work, replacing manual effort in real campaigns, SEO, and internal tooling, and where it quietly fails or adds cost. The test I keep coming back to: can a marketer ship a working tool before lunch, without a dev team? When the answer is yes, I show how. When it's no, I say so.`,
  },
  {
    slug: 'building-with-ai',
    title: 'Building With AI',
    blurb: 'Building with AI in public: what shipped, what broke, and the plumbing that decided it.',
    canonical: 'building-with-ai',
    family: ['building-with-ai', 'ai-workflows', 'builder-tools', 'developer-tools', 'ai-coding', 'ai-tools', 'workflows'],
    intro: `I build with AI in public: agents, automations, and web systems, shipped and documented, including the pipeline that writes this site. This hub is the running log. Not tutorials in the abstract, but what actually worked, what broke, and the boring infrastructure that decided the outcome. The through-line: shipping with AI is less about the model and more about the plumbing, the taste, and the willingness to cut what isn't working. If you'd rather see the receipts than the highlight reel, start here.`,
  },
  {
    slug: 'ai-digital-assets',
    title: 'AI × Digital Assets',
    blurb: 'Where AI and digital assets collide, read clear-eyed by an operator who runs a domains business.',
    canonical: 'digital-assets',
    family: ['digital-assets', 'domains', 'crypto', 'web3'],
    intro: `AI and digital assets keep colliding: AI companies buying premium domains, agents that need to pay for things, tokenized models, machine-to-machine settlement. Most coverage is either domain-industry inside baseball or crypto hype. This hub is the intersection, from an operator who runs a domains business and stays clear-eyed on the rest. No price predictions, no token shilling, no financial advice. Just where AI genuinely changes how digital assets get valued, acquired, and used, and where the "killer use case" claims deserve a slow, skeptical read.`,
  },
];
