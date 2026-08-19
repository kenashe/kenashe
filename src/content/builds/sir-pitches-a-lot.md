---
title: "Sir Pitches-a-Lot"
status: "SHIPPED"
date: "August 2026"
stack:
  - "HyperAgent"
  - "Airtable"
  - "Lucky Domains"
  - "Prompt Engineering"
  - "Founder-Led Sales"
  - "Landing Pages"
  - "Outbound Automation"
summary: "A HyperAgent competition agent that researched an anonymized founder target, pitched Lucky Domains, and generated a personalized landing page campaign designed around one question: would they reply?"
---

## The Goal

The challenge was to build an agent that could create a mini outreach campaign for a matched target, not just write a single cold email.

The product was **Lucky Domains**, my domain acquisition and SEO strategy business. The target was a specific founder at a specific company, but I kept the public version anonymized.

The win condition was simple: **would they reply?**

That changed the project. The real challenge was not writing one good pitch. It was designing an agent that could repeatedly produce a good campaign under competition constraints.

The campaign needed to feel specific, useful, credible, and founder-to-founder. It also needed to support more than email. Pages, videos, social media concepts, mini decks, visuals, teardowns, and useful artifacts were all valid ways to pitch the target.

## What I Built

I built **Sir Pitches-a-Lot**, a reusable HyperAgent system prompt designed for an Airtable outreach competition.

The name was intentionally unserious. The agent’s behavior was not.

The final shipped artifact was a reusable agent prompt plus a target-specific Lucky Domains campaign package. For this run, HyperAgent generated a personalized landing page as the main creative asset.

Sir Pitches-a-Lot was designed to create a complete campaign package, including:

- A research hook
- A fit thesis
- A first-touch email
- A follow-up sequence
- A personalized creative asset
- A clear call to action
- A shareable campaign package

The agent was built using the same structured prompt framework I have been using across agent experiments: identity, context, instructions, criteria, and examples.

## How It Works

The agent workflow is:

**brief → research → trigger selection → fit thesis → email sequence → asset choice → landing page → campaign package → QA**

Sir Pitches-a-Lot starts with the Airtable Battle Brief, the matched target, and the product being pitched.

It researches the target and company, then looks for a fresh and relevant hook from the last 6 to 12 months. If it finds a real trigger, it uses that as the opening angle. If research is thin, it follows a fallback ladder: target-specific trigger, company-specific trigger, observable workflow or business model fact, and finally a clearly labeled assumption.

That fallback ladder mattered because AI-generated outreach has an obvious failure mode: fake personalization. The agent was explicitly told not to invent research, not to treat stale information as current, and not to present assumptions as facts.

Once it has a credible hook, the agent builds a narrow fit thesis around why Lucky Domains could matter to that target now. It then drafts a concise first-touch email, follow-ups that add new value, and a low-friction CTA that a founder could answer quickly.

The creative asset is chosen based on what would most increase reply probability. The default preference is a teardown, audit, opportunity map, workflow map, or landing page rather than a generic product deck. In this run, the strongest format was a personalized landing page.

## What Broke & What I Learned

The first version of the prompt over-produced.

It created a complete campaign report, but the win condition was not “who can write the longest campaign.” The win condition was “would they reply?” That forced the prompt to become tighter and more practical.

**The real product was the agent.** The competition was not just about producing one polished pitch. It rewarded the ability to build an agent that could research, reason, choose an asset format, write the campaign, and package the result.

**The asset choice mattered.** A generic deck would not prove much. A personalized landing page gave the pitch a more concrete shape and made the outreach feel built for the target rather than copied from a template.

**Personalization can become hallucination.** Without hard constraints, an outreach agent will be tempted to create hooks that sound plausible but are not real. The fallback ladder became one of the most important parts of the prompt.

**Submission format mattered.** The brief asked for a campaign share link, not a pile of disconnected assets. The final agent was updated to build one shareable campaign package and embed the creative asset inside it when possible.

**The best CTA is low-friction.** A meeting request is expensive. A one-word reply to receive a teardown, mockup, map, or short walkthrough is much easier to answer.

## Outcome

Sir Pitches-a-Lot shipped as a working HyperAgent competition agent.

It created a tailored Lucky Domains campaign for an anonymized founder target and generated a personalized landing page as the primary campaign asset.

The project clarified an important distinction for me: building with AI is not just about getting one strong output. The bigger opportunity is designing agents that can repeatedly produce useful work under real constraints.

This was a small project, but it pointed toward a larger idea I keep coming back to: the best AI systems are not just clever. They are structured, honest, useful, and built to ship.
