# Data sources & external services

Everything the system talks to. Registry of feeds: `pipeline/config/sources.yaml` (that file
is authoritative; this document explains it).

---

## Feed registry

Each entry: `name`, `type`, `tier`, `weight`, plus type-specific fields.

| Field | Meaning |
|---|---|
| `tier` | `1` = primary/authoritative origin, `2` = commentary/community. Feeds `rankScore` (+0.5 for any tier-1 item). |
| `weight` | Per-source ranking weight, summed across a story's items. |
| `primary` | Original reporting (a trade newsroom) despite tier 2. **Pillar-anchor eligibility only** — does not affect ranking. See [DECISIONS.md](DECISIONS.md#d7). |
| `aiFilter` | Gate a general-interest feed to AI-relevant items via keyword match on title+body. |
| `keywords` | Explicit keyword list (overrides `aiFilter`'s default AI list). |

### Connectors (`pipeline/src/ingest.ts`)

| `type` | Source | Auth | Notes |
|---|---|---|---|
| `rss` | any RSS/Atom URL | none | Handles CDATA and attributed `#text` nodes. Caps 15 items. |
| `youtube` | channel RSS + transcript | `SUPADATA_API_KEY` (optional) | Jitter 400–900 ms + 3 retries. Falls back to the video description without a key. Caps 3/channel. |
| `arxiv` | export.arxiv.org API | none | Category query, newest first, 15 max. |
| `github_releases` | GitHub Releases API | `GITHUB_TOKEN` (optional, raises rate limit) | Skips drafts/prereleases. |
| `hackernews` | Algolia HN API | none | `minPoints` + keyword filter. |
| `reddit` | (legacy JSON connector) | none | **Unused** — subreddits are ingested as `rss`; see below. |

### Current sources (36)

**Tier 1 — official blogs:** OpenAI Blog, Google DeepMind, Hugging Face Blog, Mistral News.

**Tier 1 — research & code:** arXiv `cs.AI`, `cs.CL`, `cs.LG`; GitHub AI releases
(`openai/openai-python`, `anthropics/anthropic-sdk-python`, `ggml-org/llama.cpp`,
`vllm-project/vllm`, `langchain-ai/langchain`, `meta-llama/llama-stack`).

**Tier 2 — community:** Hacker News (AI, ≥150 points), r/LocalLLaMA, r/MachineLearning.

**Tier 2 — AI × digital assets** (all `aiFilter`): Domain Name Wire\*, DomainInvesting\*,
TheDomains, Decrypt, CoinDesk\*, The Block\*, CoinTelegraph, The Defiant.

**Tier 2 — AI × marketing & ops** (all `aiFilter`): Marketing AI Institute\*, Search Engine
Journal, Martech\*.

**Tier 2 — YouTube:** Claude, OpenAI, IBM Technology, Matt Wolfe, AI Explained, Matthew
Berman, The AI Advantage, Wes Roth, The AI Grid, Alex Finn, Two Minute Papers, 1littlecoder,
Sam Witteveen, bycloud.

`*` = `primary: true`.

## Operational quirks — read before editing feeds

**Verifying a feed locally proves nothing.** Several sources serve fine from a laptop and
403 from the GitHub Actions runner. The only real test is a live run. See
[DECISIONS.md](DECISIONS.md#d6).

- **r/MachineLearning must stay LAST in `sources.yaml`.** Two back-to-back Reddit `.rss`
  fetches trip a 429; the ordering is the fix. Do not "tidy" the file by regrouping it.
- **Reddit is ingested via `.rss`, not `.json`** — the JSON endpoint 403s from cloud IPs for
  every user-agent.
- **YouTube** rate-limits bursts; the jitter + retry in `youtube()` exists for that. Removing
  it brings back intermittent 404/500s across ~10 channels.
- **Dead/blocked and removed:** Anthropic RSS, Meta RSS, DNJournal (404s), namepros (403),
  Search Engine Land (403 from the runner only).
- **A source returning `0 items` is normal** for `aiFilter` feeds on a quiet day. A source
  erroring logs `[ingest] <name>: <message>` and never fails the run.

## External services

| Service | Used for | Credential | Failure mode |
|---|---|---|---|
| **OpenAI** | notes prose, the gate, embeddings, images (`gpt-image-1`) | `OPENAI_API_KEY` | no key → lexical embedder + no images (dev still runs) |
| **Anthropic** | flagship + deep-dive prose (`claude-opus-4-8`) | `ANTHROPIC_API_KEY` | synthesis throws; story recorded in `report.errors` |
| **DeepSeek** | triage, alt text | `DEEPSEEK_API_KEY` | alt text falls back to the intent string |
| **Google Gemini** | configured but **not currently called** (see ARCHITECTURE "known wart") | `GOOGLE_API_KEY` | n/a |
| **Supadata** | YouTube transcripts | `SUPADATA_API_KEY` | falls back to video description |
| **Postgres + pgvector** (Supabase/Neon) | dedup memory, related posts | `DATABASE_URL` | run fails; nothing published |
| **GitHub Actions** | the scheduler | built-in | see runbook in ARCHITECTURE.md |
| **GitHub Contents API** | commits | `GITHUB_TOKEN` | push retries with rebase up to 5× |
| **Vercel** | hosting + builds | `VERCEL_DEPLOY_HOOK` | git integration also triggers builds |
| **Telegram** | daily digest + error pings | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | digest logs to stdout instead |

**Rate limits worth knowing:** arXiv asks for ≤1 request per 3 s (we make 3 total);
GitHub API is 60/h unauthenticated vs 5000/h with a token; Reddit and YouTube are the
fragile ones (above). No provider rate limit has been hit in production so far.

## Cost shape

Roughly 10 posts/day: ~1–3 Opus long-form pieces, ~7 GPT-class notes, 10 gate calls, ~13
image generations, plus embeddings for every ingested item (cheap). The weekly pillar is one
extra Opus call at ~8k output tokens. There is no budget enforcement in code — if cost
matters, lower `DAILY_NOTES_MAX` or switch `MODELS.note`.

## Adding a source

1. Add the entry to `sources.yaml` (keep r/MachineLearning last).
2. Use `tier: 2` + `aiFilter: true` for general-interest feeds.
3. Add `primary: true` **only** for original-reporting newsrooms.
4. If it belongs to a beachhead with a reserved slot, add its exact `name` to `DA_DOMAINS`,
   `DA_CRYPTO`, or `MK_SOURCES` in `run.ts` — the sets match on source name, so a typo
   silently disables the guarantee.
5. Ship it, then check the next run's `[ingest]` line to confirm it returns items **from the
   runner**.
