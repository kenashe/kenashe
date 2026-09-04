---
title: "AI agents can sound strategic while reasoning from events that never happened"
description: "I built three versions of an AI Werewolf game. The first agents made confident accusations from behavior that had not occurred. The useful fix was not more polished prose. It was an environment that could contradict them."
date: 2026-09-04
---

I gave four Fable 5 agents hidden roles and asked them to play Werewolf through Hyperagent.

The first speaker opened with this accusation:

> **Sable:** "Ptolemy. Hasn't said a word yet and that silence is doing a lot of work."

Ptolemy had not said a word because it was not his turn.

The second speaker immediately did the same thing:

> **Bosch:** "Wren has said nothing, which is precisely what a careful operator does when the opening move belongs to someone else."

Wren had not received a turn either.

The dialogue sounded strategic. Silence can be suspicious in a social deduction game. A careful player might wait for others to commit before choosing a target. The explanations made sense in the abstract.

They just did not describe anything that had happened.

That failure repeated across all three games in the first version. The agents were not producing random gibberish. They were producing plausible social reasoning from nonexistent evidence.

That became the most useful result of the project.

[See the full excerpt and source transcript.](https://github.com/kenashe/ai-werewolf/blob/2ce5356e779b1b29c839244b44394a7ce96dedf1/evidence/01-v1-silence-before-turn.md)

## The agents had a theory, but no evidence

Version 1 was intentionally stripped down. I wanted to test whether four strongly defined AI characters could remain distinct.

The format had four players, one werewolf, three public discussion rounds, no eliminations, no night kills, and one final vote.

The characters did sound different. The game itself gave them almost nothing meaningful to reason about.

In the second game, Bosch spoke first and announced:

> "I have been watching, and Ptolemy strikes me as the one to watch: there is something in the way a methodical mind hides behind silence."

Again, Ptolemy had not spoken.

In the third game, Ptolemy asked Wren:

> "How did you decide on the order in which you were going to speak today?"

Wren did not decide. The Game Master randomized the order.

Across all three Version 1 games, at least one agent treated behavior that had not occurred, or a condition controlled by the operator, as evidence about another player.

This was not simply the werewolf bluffing. Villagers did it too.

The problem was not that the models lacked concepts. They had plenty. They knew that silence can signal concealment, that patience can be strategic, that an early accusation can be deflection, and that neutrality can be a way to avoid commitment.

The problem was that they substituted those general ideas for evidence from the actual game.

[Game 2 example.](https://github.com/kenashe/ai-werewolf/blob/2ce5356e779b1b29c839244b44394a7ce96dedf1/evidence/02-v1-observation-before-action.md)  
[Game 3 example.](https://github.com/kenashe/ai-werewolf/blob/2ce5356e779b1b29c839244b44394a7ce96dedf1/evidence/03-v1-random-order-treated-as-choice.md)

## Why the failure looked convincing

The output did not look broken.

Each claim was written in the language of social deduction. The next agent could respond to it, criticize it, or use it as the basis for another theory. The conversation became more structured even when its starting premise was unsupported.

That is the dangerous part.

Reasoning-shaped language is not the same thing as reasoning over the environment.

When the task required an interpretation but the environment supplied very little grounded evidence, the agents reached for a plausible theory of what normally matters. More discussion did not create more evidence. It created more interpretations of the same evidentiary vacuum.

A polished transcript can therefore look like multi-agent reasoning while remaining weakly connected to the world the agents are supposed to be reasoning about.

## I changed the environment

I built two larger versions.

Version 2 added seven recurring characters, shared history, a role-free prologue, two werewolves, a Seer, daily elimination votes, night kills, role reveals, and direct interrogation.

Version 3 expanded to nine characters and added stronger voices, social missions, private confessionals, an open floor, and separate mystery and omniscient audience cuts.

The important change was not simply more characters. The game now had a canonical public record and explicit private state.

Votes changed who remained alive. Night actions changed the next day's game state. Eliminated roles were revealed. A Seer received private information. Werewolves coordinated privately. Claims could be checked against a transcript that existed outside any single agent's memory.

The project also became much larger:

| Version | Run shape | Runtime | Player calls | Approx. subagent tokens | Hyperagent-reported metered usage |
|---|---|---:|---:|---:|---:|
| V1 | Three small games | 16 min | Not recorded | ~2.85M | ~$18 |
| V2 | One seven-player game | 36 min | 75 | ~4.44M | ~$48 |
| V3 | One nine-player game | 1 hr 56 min | 231 | ~19.7M | $50.29 |

The metered usage was covered by Hyperagent credits. These are platform-reported run figures, not out-of-pocket costs or an attempt to infer token pricing.

[Run details and screenshots.](https://github.com/kenashe/ai-werewolf/blob/2ce5356e779b1b29c839244b44394a7ce96dedf1/RUNS.md)

## A claim that could actually fail

Late in Version 3, Ptolemy claimed that Finch's position had followed Inez's lead.

Finch checked the public transcript:

> **Finch:** "The transcript has me naming Ptolemy in my own speech before Inez ever opened her mouth."

Ptolemy conceded:

> **Ptolemy:** "Yes, I concede in full... the transcript has Finch's 'leans Ptolemy' before Inez ever spoke."

The agents were still capable of making factual mistakes. Version 3 did not solve hallucination.

It did something more useful: it gave the mistake somewhere to fail.

The public record contradicted Ptolemy. Another player found the contradiction. Ptolemy had to respond to it, and the correction became part of the next vote.

That is a much better target than trying to prompt every false statement out of existence. The goal is not an agent system in which no one is ever wrong. The goal is an agent system in which wrong claims can be exposed by the environment and carry consequences.

[Read the full exchange.](https://github.com/kenashe/ai-werewolf/blob/2ce5356e779b1b29c839244b44394a7ce96dedf1/evidence/04-v3-transcript-correction.md)

## The wolves started making real strategic decisions

The private behavior changed too.

In Version 3, Ptolemy and Vale were the two werewolves. During their private orientation, they agreed to preserve distance:

> "We only coordinate on the night kill, never on the floor."

They did not publicly defend one another. They let the village create its own majorities, then joined those votes without looking like a visible pair.

After Day 1, they chose to kill Wren because she was auditing the transcript and comparing votes with earlier commitments:

> "Kill the auditor, keep the misdirection."

They did not know Wren was the Seer. They killed her because of what she was actually doing in the game and accidentally removed the village's information role at the same time.

This was strategy grounded in state:

1. Wren established a public method.
2. That method threatened the wolves.
3. The wolves privately evaluated the threat.
4. Their action removed Wren.
5. Her private information disappeared with her.
6. The next day's decision environment changed.

The village eventually eliminated three villagers and no wolves. Ptolemy and Vale won without ever voting against or openly rescuing each other.

[Read the private strategy excerpts and source logs.](https://github.com/kenashe/ai-werewolf/blob/2ce5356e779b1b29c839244b44394a7ce96dedf1/evidence/05-v3-grounded-wolf-strategy.md)

## Grounding did not make the agents error-free

Version 3 still contained inaccurate claims.

Inez overstated how often Finch had endorsed Rook. Rook misremembered whether he had been given a chance to answer. Ptolemy reversed the order of two public statements.

The difference was that the system now had a canonical record, adversarial readers, and consequences. Some errors were corrected by other players during the game. The operator log preserved the remaining anomalies rather than silently treating them as fact.

Errors became contestable instead of decorative.

[Operator notes.](https://github.com/kenashe/ai-werewolf/blob/2ce5356e779b1b29c839244b44394a7ce96dedf1/v3/output/OPERATOR_NOTES.md)

## What this does not prove

This was not a controlled experiment.

I changed many variables between versions, including the number of players, game mechanics, private information, persona prompts, relationship history, voting structure, role reveals, night actions, interrogation format, and anti-confabulation instructions.

The sample was tiny. All player agents ran through Hyperagent. Strong fictional personalities made the games more entertaining while making it harder to separate persona behavior from model behavior.

I am not claiming that adding eliminations caused unsupported reasoning to disappear.

The narrower observation is:

> In the minimally grounded version, all three games contained confident social reasoning based on nonexistent behavior or operator-controlled conditions. In the richer versions, much more of the reasoning attached to observable state, and factual errors could be challenged against a shared record.

This is a build observation, not a benchmark.

## The broader lesson for multi-agent systems

This is not really about Werewolf.

Many multi-agent demos consist mainly of language models talking to other language models. One proposes, another critiques, and a third synthesizes. The transcript becomes longer and more convincing, but the environment may still have no independent way to say whether any of them are right.

If a task demands an explanation and supplies too little grounded evidence, an agent can substitute a plausible theory of the domain for evidence from the task itself.

The design rules I am taking forward are simple:

1. **Keep canonical state outside the agents.** Do not let conversational memory become the source of truth.
2. **Give actions observable consequences.** Votes, tests, file changes, code execution, prices, approvals, and state transitions create evidence.
3. **Make claims falsifiable against logs or tools.** A polished explanation should not outrank the record.
4. **Separate public and private information deliberately.** Hidden state should be controlled by the environment, not leaked through prompts.
5. **Evaluate outcomes, not just prose quality.** Coherent discussion can still be detached from reality.

The shortest version is:

> Give agents a world that can contradict them.

## The entertainment tradeoff

The richer game worked as a story. It felt closer to *The Traitors* than to a conventional agent demo.

It also became too large.

Version 3 took almost two hours, used 231 player calls and about 19.7 million subagent tokens, and produced far more text than I would want to consume repeatedly. Accents, relationships, confessionals, and social missions improved the fiction while making the system worse as an evaluation of the underlying model.

The feature that made the game more entertaining also became a confound.

## Next: make the models the cast

The next version removes the fictional personalities.

Instead, six different models will play against one another under the same rules. Their identities will be hidden from the other players but visible to the audience. Across multiple games, each model will rotate through Werewolf, Seer, and Villager roles.

That changes the question from:

> Can a carefully written character fool another carefully written character?

to:

> Which models are naturally better at deception, persuasion, evidence tracking, belief revision, and detecting lies?

The first match will still be a showcase, not a scientific benchmark. If the format works, I will move the player calls out of Hyperagent and into a direct-provider harness for cleaner comparisons.

The useful result so far came from the failure.

The first agents sounded as though they were reasoning strategically before the environment gave them anything real to reason about. The fix was not asking them to sound smarter.

It was giving them a world capable of proving them wrong.

---

The complete prompts, transcripts, hidden-role files, private logs, operator notes, and run metadata are available in the [public GitHub repository](https://github.com/kenashe/ai-werewolf).
