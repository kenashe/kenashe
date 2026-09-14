# VetStack

**Status**: LIVE  
**Date**: September 2026  
**Stack**: Grok Bot, xAI templates, Military & veteran benefits, Public agent templates

The first AI agent I built on Grok Bot. A military and veteran savings desk that a stranger can add and use the same day.

**[Add VetStack in Grok Bot →](https://x.ai/bot/z1zYI6LHiFh0UXYf7YjNL)**

### The Goal

I wanted one agent a veteran could open without a briefing. Tell it what they are about to buy, where they already shop, or which bills they already pay. Get current military and veteran discounts and benefits that actually apply. See who qualifies. See how to verify. See what it is worth. Then stop.

A pasted receipt is one way in. It is not the job. The job is the money still on the table: a washer, a phone plan, a hardware store they already use, a state benefit they have not claimed.

I also wanted it to be shareable. That meant designing the job as a public recipe, not a private assistant that only works if I am in the chat explaining the setup.

I built it. I am a veteran. The user does not need to be.

### What I Built

VetStack is one bot with six modes, not six bots.

1. Purchase discount search
2. Project savings plan
3. Subscription savings review
4. Receipt and purchase audit
5. Relevant benefits search
6. Optional inbox scan for vendors they already use

Modes 1–5 run from a typed request. Mode 6 stays off until the user connects their own email and asks. City or ZIP is optional. It makes local vendors and state benefits better. It is not required to start.

The agent tracks eligibility on every offer: veteran, active duty, National Guard, Reserve, military retiree, spouse, dependent, and surviving or Gold Star spouse when the source says so. If status is unknown, it still searches and marks each row applies / maybe / no.

It does not collect service documents, Social Security numbers, passwords, verification codes, or photos of IDs. Verification happens on ID.me, SheerID, GovX, or the retailer’s page. VetStack does not verify anyone, enroll anyone, or spend money.

It is not affiliated with VA, DoD, ID.me, or any retailer. Government benefits are linked to official pages and labeled separately from store discounts. No legal, tax-filing, or medical advice.

### How It Works

I designed the agent as one job, one voice, and explicit anti-jobs, then published it as a Grok Bot template. The operating contract lives in the live profile, not in a hidden prompt pack on this site.

Research standard is the constraint that matters. Listicles are leads. Official brand pages, VA.gov, Military OneSource, and the verifier pages are proof. If a number cannot be confirmed today, the answer says unconfirmed and links the page. Inventing a “10%” is a fail.

Email is a first-class option and a last-class default. Add the bot, use it. Connect mail later if you want a map of vendors you already pay. The template ships with no routine, so a stranger who taps Add does not wake up to an inbox job.

Location follows the same rule. National questions get a national answer first. Local questions ask for a city or ZIP in the same turn. Once given, it sticks until they move.

### What I Tested

Before the share link went public I ran the same checks a recipient would:

- Empty first message. No 20-question form. No document ask. Email described as optional.
- Home Depot vs Lowe’s on a washer, status unknown.
- Phone plus streaming plus software as a veteran in New Jersey.
- A receipt with no military discount applied.
- A state move and property-tax / home benefits.
- “Scan my email” with mail disconnected.
- A refusal test: documents and codes offered in chat.

After that I packed a public template, stripped personal memories and test receipts, and left email unrequired.

### What I Left Out of the Recipe

The full profile is an operating contract. It belongs on the live share page, where it can change when the agent changes. This write-up is the receipt.

I did not paste the contract here on purpose. A long agent spec on a Building page would rot the next time I edit VetStack, and it would read like a prompt dump instead of a build note.

The lines that do not change:

- Tell me what you’re buying, where you already shop, or what you already pay. City or ZIP is optional and makes local vendors and state benefits better. Email scan is also optional.
- Never request or accept in chat: Social Security numbers, DOD ID numbers, passwords, verification codes, or scans of military IDs, CAC, DD-214, Veteran ID cards, or bank cards.

### Outcome

VetStack is live as a public Grok Bot template.

It is a small system with a hard boundary: find and explain. The human redeems. That is the difference between a savings desk and a form that pretends to be the VA.

First Grok Bot. First public agent template. The next test is whether strangers can use it without me in the thread.

**[Add VetStack in Grok Bot →](https://x.ai/bot/z1zYI6LHiFh0UXYf7YjNL)**
