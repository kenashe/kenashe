# Product

What kenashe.ai is for, who it serves, and the editorial rules that constrain everything the
pipeline writes. Change code freely; change the things on this page deliberately.

---

## Goal

**The Lab** is Ken Ashe's public AI build log: daily notes and periodic deep-dives on AI,
written from an operator's point of view. Ken is a digital marketer, CPA and PMP who ships
agents, automations and AI-assisted web systems, and documents the receipts.

Two jobs the site does:

1. **Credibility artifact.** Demonstrate, in public and under a real name, that he ships and
   understands this material.
2. **Discoverability.** Be the source an LLM or search engine reaches for on the topics he
   owns — not just for his name.

The second goal drives an unusual amount of the architecture: topic hubs, related-post
linking, entity/provenance schema, `llms.txt`, and an AI-crawler-friendly `robots.txt`.
See [ARCHITECTURE.md](ARCHITECTURE.md).

## Beachheads

Four locked topics. Each has an evergreen hub page (`src/data/topics.ts`) that aggregates a
family of tags, leads with an owned point of view, and pins the newest deep-dive as a
"Start here" pillar.

| Hub | Canonical tag | Angle |
|---|---|---|
| **AI Agents & Evals** | `ai-agents` (+`evals`) | What separates an agent demo from a system that ships — and how to measure it. |
| **AI for Marketing & Ops** | `marketing-ops` | Does it move a number, and can you prove it? Marketer-and-CPA framing. |
| **Building With AI** | `building-with-ai` | Building in public: what shipped, what broke, the plumbing that decided it. |
| **AI × Digital Assets** | `digital-assets` | Where AI collides with domains and crypto, read clear-eyed by a domains operator. |

Two of these needed structural help to exist at all — see
[DECISIONS.md](DECISIONS.md#d8). Marketing and digital-assets each get a **reserved daily
slot**; all four rotate for the weekly pillar.

## Content shape

| Tier | Length | Cadence |
|---|---|---|
| Note | 400–600 words, 2–3 `##` sections | ~7/day |
| Flagship | 800–1200 words, 3–5 sections | ~3/day |
| Deep-dive pillar | 1800–2600 words, 5–7 sections, 8 spoke links | 1/week (Tuesday) |

Every post opens with a one-line `TL;DR:`, phrases `##` headings as questions a reader would
actually ask (where natural), and closes with a **Practitioner's Take** — a concrete, forward
-looking paragraph, never a summary.

## Voice

Defined in `pipeline/src/prompts.ts` (`VOICE`). The gate enforces it.

**Is:** direct and conversational; short sentences mixed with long; concrete numbers and
named people/labs; curious about practical use, skeptical of breathless claims; first-person
for opinion. An optimist who ships.

**Is not:**
- **No em dashes.** Commas, colons, parens, periods.
- No AI tells: *delve, navigate, in essence, it's worth noting, moreover, furthermore,
  leverage (verb), robust, seamless, cutting-edge, ever-evolving, tap into, a testament to,
  unlock the potential*.
- No throat-clearing openers ("In today's world…", "AI is transforming…").
- No invented statistics.
- No clickbait titles — banned patterns include "Why I Stopped…", "X Things About Y",
  "The Ultimate Guide", "How to Master", "X vs Y: Which Wins?".

## Editorial guardrails

**Sourcing.** Posts synthesize multiple sources into an original take; they never summarize
one. The primary source must be **named** — title plus author/lab, with the arXiv ID when
the material provides one, copied verbatim and never invented. Vague references ("a new
study", "the authors", "the video") are a critical fail. Where sources disagree or a claim
is thin, say so. See [DECISIONS.md](DECISIONS.md#d10).

**First-party claims.** What a product does, costs, who can use it and when it ships belongs
to the company that makes it — cite its own announcement. Where the specifics come only from
trade coverage, name who reported it and treat them as reported, not confirmed. Never state
pricing, availability, limits or platform mechanics as settled fact on third-party authority
alone. See [DECISIONS.md](DECISIONS.md#d14).

**Financial / crypto.** For any post touching crypto, tokens, domains or tradable assets:
no price predictions, no financial or investment advice, no buy/sell calls, no shilling or
token promotion. Stay clear-eyed on risk, hype and scams; cover the AI mechanics and what an
operator can actually use. Enforced in both `VOICE` and `GATE_SYSTEM` as a critical fail.

**Critical fails** (auto-draft, regardless of score): hidden or unnamed primary source; a
thin single-source summary dressed as analysis; fabricated statistics; the financial-advice
rules above; title/body contradiction; a closing paragraph that merely summarizes.

## Visual language

Hero + inline images are generated per post, with the art direction chosen deterministically
from the slug so a post is internally consistent while the feed stays varied. Five curated
directions (editorial painterly, flat vector, isometric riso, cinematic still-life,
Bauhaus/constructivist), each with its own palette.

Hard rules in the prompts: **no text, letters, numbers or logos anywhere in an image** (the
model garbles them, and fake labels on an AI-drawn chart are a factual-integrity problem),
and no AI-art clichés — no glowing orbs, neon brains, circuit boards, humanoid robots or
stock-photo people.

## Operating principles

- **Autonomous, spot-checked.** No human approval queue. Failures become drafts, never
  deletions, and the daily digest is the review surface.
- **Shadow first.** Any risky change gets a shadow run before it goes live.
  [DECISIONS.md](DECISIONS.md#d4) is what happens when you skip it.
- **Publish nothing you can't defend.** A reserved slot is not a publish; a thin pillar is
  skipped rather than shipped.
- **Improve the output, don't lower the bar** — the ordering used for every gate problem so
  far. Lower the threshold only when you can show the grader, not the writing, is the limit.
