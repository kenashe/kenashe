# X article toolkit

**Status**: LIVE  
**Date**: October 2026  
**Stack**: GitHub, Markdown, Python, JSON Schema, GitHub Actions, Agents

I turned research-backed X Article skills into a model-neutral toolkit that any AI agent can load and follow. The repository owns the method. The model is replaceable.

**[View on GitHub →](https://github.com/kenashe/x-article-toolkit)**  
**[Read the original research by @fuckgrowth →](https://x.com/fuckgrowth/status/2104482656532464095)**

Architecture figure: GitHub (source of truth) → three doors (AGENTS.md for agents that read repositories, llms.txt for agents that fetch URLs, toolkit.json for agent stacks) → any agent → headline → lock → hook → lock → cover → lock → X Article package. Rendered as an HTML/CSS figure on the page, no image.

The research, the dataset and the original skills in this build are by **@fuckgrowth**. My part was the architecture around them: the model-neutral port, the agent interfaces, the workflow, the state interface, the tests and the documentation.

### The Goal

In September 2026 @fuckgrowth published an X Article on how to write better headlines, built on 40,478 X Articles posted between January 1 and September 26, 2026: 6,835 that passed 100,000 views and 33,643 that did not. Alongside it came the research document, the dataset of winners, and three Claude skills (headline-writer, hook-writer, cover-writer) with the words “feed this to your agent.”

I wanted to use the methodology. I did not want to use it only inside the one environment the skills were written for.

My first instinct was to port the skills to whichever AI products I happened to be using. That would have worked, and it would have left the same method living in several places, each drifting a little every time one of them was edited.

So I changed the layer. Instead of making an AI product the home of the workflow, I made a GitHub repository the source of truth, and the agents became consumers of it.

### What I Built

A public, MIT-licensed repository, `kenashe/x-article-toolkit`, that prepares an X Article for publication in three canonical stages: **headline**, **hook** (the first lines X shows on the card) and **cover** (whether to use one, and the brief if so). An article can go through the whole workflow or each stage can be used on its own.

Give it a draft and it returns a compact publishing package: the selected headline, the selected hook, a cover or no-cover decision, the cover concept, cover text and image prompt where a cover applies, the original article, and a reference to the methodology version used.

The article body is not rewritten. The approved hook can become the opening two lines; everything after that stays the user’s own text unless editing is asked for separately. The system is not meant to make every publishing decision on its own.

### How It Works

Each stage ends in an explicit approval lock before the next one starts:

```
ARTICLE DRAFT
  → HEADLINE WRITER → headline candidates → LOCKED HEADLINE
  → HOOK WRITER     → hook candidates     → LOCKED HOOK
  → COVER WRITER    → cover / no cover    → LOCKED COVER
  → X ARTICLE PACKAGE
```

The locks are plain text (`Locked headline:`, `Locked hook:`, `Locked cover:`), so any runtime can carry them between stages without a shared memory or a database.

**headline-writer** takes a draft or structured notes, generates ten candidates, scores them against the source methodology’s seven measured move families, four failure marks and five levels, runs a ten-point check, presents the strongest five, recommends one, and stops for the user to lock a headline. The point is that it applies a documented, measured procedure rather than asking a model to “write a catchy headline.”

**hook-writer** runs against the locked headline and the draft. It writes eight two-line openings, renders them the way the X card would cut them, scores them, presents the best four and stops for approval. The source research is explicit that the hook moves the odds far less than the headline, and that most of the hook rules are craft observed in winning articles rather than measured effects. The skill says so every time it runs.

**cover-writer** receives the locked headline, the locked hook and the draft, and can answer **Use cover** or **No cover**. No cover is a normal, complete output. When a cover is right, it picks from ten documented briefs and produces a cover concept, a cover sentence, an image prompt, the 1200 × 480 specification and a structured evaluation of the plan. The no-cover path matters: the toolkit follows the methodology instead of generating an image because an image model happens to be available.

### One Methodology, Different Agents

This is the part I care most about. The repository gives any agent, or any agent stack, several doors into the same methodology.

**AGENTS.md** is the primary entry point. It tells an agent what to load, in what order, how the workflow runs, what to do when code execution is or is not available, which rules are fixed and what must never be invented or changed. An agent that understands repositories can start there.

**llms.txt** is an ordered list of the files an AI system needs, with raw GitHub URLs and token estimates (about 16,000 tokens for everything). Agents that consume URLs can load the toolkit without knowing the repository layout first.

**toolkit.json** exposes the same structure in machine-readable form: the skills, the read order, the scripts, the lock labels, the token estimates and where the dataset lives. A custom agent stack can build its context from it programmatically.

A **generic adapter** gives a copy-paste instruction block for anything without a dedicated integration.

Dedicated adapters exist for Grok Bot, ChatGPT and Claude Code. They are conveniences layered on top of the generic path, not the identity of the project. The ChatGPT packages are generated from the canonical skills so they cannot drift; the Claude adapter just links the canonical skills into place. Generic first, specific runtimes second.

### Optional by Design

Several useful capabilities are deliberately optional, because portability mattered more than assuming every agent has the same tools.

**Scripts.** Each skill ships a Python scoring script (standard library only, `--json` output available). The model does the writing; the scripts provide deterministic checks. An agent without a terminal applies the same checks by hand from the rule files and says that it did.

**Dataset.** The 6,835-article dataset is external and fetched on demand, never bundled. When present it adds nearest winning examples, topic and shape swipe files, cover-image references and a way to check the current month’s named entities. Without it, every rule still applies.

**State.** Version 1 keeps no persistent state. The repository defines the interface and JSON schemas for personalization and performance tracking later, but no skill claims to remember or learn from earlier runs unless a store is actually connected. The original skills described their record-keeping as self-learning; this one does not.

**Optional tooling.** The author’s X Articles finder, which collected the dataset, is included separately under `optional/`. It needs Apify and model-specific tagging and is not a dependency. The cover-image analysis tools (Pillow pixel checks, an Apple Vision OCR helper) sit beside it for the same reason.

### Tests Against Drift

The repository does not just say the different interfaces should stay in sync. It checks. A single test script, run by CI on every push and pull request, verifies the repository structure, the skill front matter, that every internal reference resolves, that the generated ChatGPT packages and the `llms.txt` / `toolkit.json` indexes match the canonical skills, that no Claude-specific paths or claims have leaked into model-neutral files, that nothing credential-shaped is committed, that the author’s rule files are byte-identical to the archived originals, and that the three scoring scripts run with and without the dataset and reproduce the author’s own worked example.

The goal is not that CI is nice to have. It is that an agent reading the toolkit through any door gets the same methodology, and that the measured rules cannot be quietly edited.

### What I Learned

I started this thinking I needed to turn someone else’s Claude skills into skills for the tools I use. I ended up deciding that was the wrong layer.

The useful part was not Claude. It was not ChatGPT or Grok either. It was the methodology. So I put that in GitHub and made the agents come to it.

AGENTS.md, llms.txt and toolkit.json are different doors into the same system. An agent can run the scripts if it has a terminal, or follow the same rules by hand if it does not. The repository owns the method. The model is replaceable.

For this build, the durable asset turned out to be the methodology, the instructions, the schemas, the tests and the source data, stored somewhere boring and portable. That is a pattern I expect to use again.

### Source and Attribution

The underlying research, the dataset, the source methodology and the original headline-writer, hook-writer and cover-writer skills are by **@fuckgrowth**, published in September 2026. The headline rules come from the 40,478-article study described above; the cover rules come from a separate study of 1,391 covers on X Articles over 300,000 views. Every measured number in the toolkit is the author’s, and the author’s rule files are kept byte-for-byte in the repository. @fuckgrowth has given explicit permission for the material to be used and redistributed in this MIT-licensed toolkit.

The model-neutral port, the architecture, the workflow and package format, the agent interfaces and adapters, the state interface and schemas, the tests and the documentation are this project’s. The repository’s `SOURCES.md`, `PROVENANCE.md` and `NOTICE.md` list the sources and classify every file as original, ported or added.

The research is observational: the rules raise odds, they do not predict a given article. The dataset ends September 26, 2026. The cover study is winners-only. None of that is softened on the page or in the repository.

**[View on GitHub →](https://github.com/kenashe/x-article-toolkit)**
