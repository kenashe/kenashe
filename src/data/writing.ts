// Metadata for the human-directed essays under /writing/. The index page renders this
// list, and each essay page reads its own entry, so title/date/authorship live in one place.
//
// `authorship` is the on-page label for how a piece was produced. It is optional: essays
// without one fall back to DEFAULT_AUTHORSHIP. Set it per essay; never special-case a slug
// in a template.
export const DEFAULT_AUTHORSHIP = 'Written by hand';

// The essay's cover image: the file in src/assets/writing/, its alt text, and an optional
// caption. The page displays it through <EssayFigure essay={essay} /> (hero or inline, the
// page decides where); /writing/ derives the thumbnail and BaseLayout gets the social image
// from the same entry, so changing the file here changes all three. The build fails if the
// declared file is missing or the page never renders it (src/data/writing-images.ts).
export interface EssayImage {
  file: string;
  alt: string;
  caption?: string;
}

export interface Essay {
  slug: string;
  title: string;
  date: string; // as displayed on the index
  published: string; // ISO date for structured data (datePublished)
  dek: string;
  authorship?: string;
  image?: EssayImage; // omit only when the essay genuinely has no suitable image (listed text-only)
}

export const essays: Essay[] = [
  {
    slug: 'ai-editor-trusted-least',
    title: 'I Used AI to Make My First Video. The AI Editor Was the Part I Trusted Least.',
    date: 'September 25, 2026',
    published: '2026-09-25',
    dek: 'My first talking-head video was made with an iPhone, a script, and more AI tools than I needed. AI was excellent at scripting, captions, and audio cleanup, and least trustworthy when it made editorial decisions for me.',
    image: {
      file: 'ai-editor-trusted-least.jpg',
      alt: 'Illustration contrasting AI-assisted audio and captions with human judgment in video editing.',
    },
  },
  {
    slug: 'my-automated-blog-got-cited',
    title: 'My automated blog got cited. Am I helping kill the internet?',
    date: 'September 15, 2026',
    published: '2026-09-15',
    dek: 'An AI-assisted news site cited my automated Digest. What that citation proves, what it does not, and why a backlink does not need to become an endorsement.',
    authorship: 'Human-directed, AI-assisted',
    image: {
      file: 'my-automated-blog-got-cited.jpg',
      alt: 'Illustration in three steps. A robot with a code symbol on its face types at a keyboard. An arrow leads to a machine dispensing a page labeled Citation. Another arrow leads to a QuantixNews newspaper marked AI-assisted drafting, human editorial review, headlined Nvidia’s reported performance. Along the bottom: Validate. Corroborate. Disclose.',
    },
  },
  {
    slug: 'you-can-use-ai-to-learn-almost-anything-even-ai',
    title: 'You Can Use AI to Learn Almost Anything. Even AI.',
    date: 'September 14, 2026',
    published: '2026-09-14',
    dek: 'How I turned ChatGPT into a tutor with exercises, quizzes, and feedback, and a starting prompt you can use for almost any subject.',
    authorship: 'Human-directed, AI-assisted',
    image: {
      file: 'you-can-use-ai-to-learn-almost-anything-even-ai.jpg',
      alt: 'Pixel illustration of a person at a computer under a sign showing a loop: practice, feedback, mastery. A stone path leads away from the desk toward a wooden signpost that reads new goals.',
      caption: 'I kept the tutor. I did not finish the plan.',
    },
  },
  {
    slug: 'ai-agents-reasoning-from-events-that-never-happened',
    title: 'AI agents can sound strategic while reasoning from events that never happened',
    date: 'September 4, 2026',
    published: '2026-09-04',
    dek: 'What happened when AI agents were required to explain social decisions without enough grounded evidence, and why the useful fix was an environment that could contradict them.',
    authorship: 'Human-directed, AI-assisted',
    image: {
      file: 'ai-agents-reasoning-from-events-that-never-happened.jpg',
      alt: 'Illustration for the essay: AI agents debating inside a cloud of hypothetical events labeled counterfactual debate, simulated deception, and events that never happened, floating above a timeline of what actually happened: agent A spoke, agent B voted.',
    },
  },
  {
    slug: 'the-digest-is-the-system',
    title: 'The digest is the system. Building is the work.',
    date: 'August 28, 2026',
    published: '2026-08-28',
    dek: 'Why the autonomous blog stops being the public face of this site, and what stands behind it instead.',
    image: {
      file: 'the-digest-is-the-system.jpg',
      alt: 'Illustration in two panels. Left, labeled The Digest: the system, robotic arms in a glass case assemble a stack of posts from a chip fed by source icons, marked 600+ posts. Right, labeled Building: the record, a typewriter on a workbench holds a page reading My real name, Building, Work, beside a notebook and pen.',
    },
  },
];

export const hrefFor = (e: Essay): string => `/writing/${e.slug}/`;

export function essayBySlug(slug: string): Essay {
  const e = essays.find((x) => x.slug === slug);
  if (!e) throw new Error(`No essay metadata for slug "${slug}" in src/data/writing.ts`);
  return e;
}

export const authorshipOf = (e: Essay): string => e.authorship ?? DEFAULT_AUTHORSHIP;
