# AI Werewolf

**Status**: SHIPPED  
**Date**: August 2026  
**Stack**: HyperAgent, Fable 5, Multi-Agent AI, Python, Social Simulation, Hidden-Role Games, AI Video

A multi-agent social deduction simulation that tested whether AI agents could create believable deception, trust, persuasion, and emergent drama inside a hidden-role game.

### The Goal

I wanted to explore whether autonomous AI agents could create genuinely interesting social dynamics when placed inside a hidden-role game involving deception, persuasion, trust, and group decision-making.

The deeper question was: can AI agents create drama without a human writer deciding the plot?

I also wanted to test whether the simulation could become entertaining content rather than simply another multi-agent technical demo. A good AI Werewolf game would not just show agents taking turns. It would show them forming relationships, hiding information, making accusations, defending themselves, and changing strategy as the game state evolved.

### What I Built

I iterated through three increasingly sophisticated versions of an autonomous, Traitors-style social deduction game.

**Version 1** used four AI characters with distinct personalities and intentionally stripped-down rules. It was a proof of concept for whether agents could play a hidden-role game at all.

**Version 2** expanded to seven recurring characters with shared history, a pre-game prologue, two werewolves, a Seer, real eliminations, night kills, and private wolf coordination.

**Version 3** expanded the cast to nine characters and added stronger speaking styles, daily social challenges, private confessionals, direct interrogation, and two edited formats: a mystery version where the audience could guess the traitors and a Traitors-style version where the audience knew the hidden roles.

The final shipped artifact was a reusable HyperAgent and Fable simulation framework plus multiple completed game transcripts that could be edited into future scripts or AI-generated video.

### How It Works

The game loop is:

**cast setup → relationship prologue → role assignment → night actions → public discussion → interrogation → locked vote → elimination → role reveal → win check → edited recap**

HyperAgent acts as the game operator. It manages orchestration, rules, turn order, game state, private information, locked votes, eliminations, role reveals, and win conditions.

Separate Fable 5 agents control each player. Those agents handle character decisions, speech, suspicion, deception, alliances, private werewolf strategy, Seer investigations, and votes.

Every character receives only the information their role is allowed to know. Werewolves can coordinate privately. The Seer can investigate hidden roles. Villagers must reason from public conversation, behavior, accusations, voting patterns, and limited information.

After setup, the agents control their own speech, accusations, alliances, votes, and strategy. I defined the structure and the rules, but not the outcome.

Later versions also established relationships and shared experiences before roles were assigned. That created a behavioral baseline. Once the game started, sudden changes in tone, loyalty, or suspicion became more meaningful because the agents had something to deviate from.

### What Broke & What I Learned

The first version was too artificial.

With almost no real information or consequences, agents began accusing players who had not even spoken yet. They manufactured meaning from speaking order, silence, and tiny signals that did not actually support the accusation.

**No consequences means fake strategy.** The agents needed changing game state, private information, and real eliminations before their choices started to feel grounded.

**Private information changed the quality of deception.** Once werewolves could coordinate privately and the Seer had asymmetric knowledge, the game became more believable. Agents began lying, deflecting, protecting allies, and pushing false narratives in ways that felt strategically coherent.

**History made behavior legible.** The pre-game prologue and shared relationships helped establish a baseline. Suspicion became more interesting when characters could compare current behavior to prior behavior.

**Personality can contaminate evaluation.** Strong accents and elaborate character styles made the transcripts more entertaining, but they also made it harder to separate character design from underlying model behavior.

**Text does not scale as entertainment.** The larger nine-player version created compelling moments, but it became slow and produced far too much material to consume comfortably as raw text. The project started pointing toward edited formats and AI-generated video instead of transcript-first publishing.

The biggest lesson was that the agents became interesting only when the game became real to them. Private information, consequences, memory, and changing incentives mattered more than personality prompts.

### Outcome

The experiment successfully demonstrated that AI agents can create surprisingly rich social-deduction dynamics when given real incentives, private information, history, and consequences.

The strongest next direction is shifting from fictional AI characters toward **model-versus-model competition**, putting models such as GPT, Claude, Gemini, Kimi, and GLM directly against one another to test which models are best at deception, persuasion, detecting lies, and surviving a social deduction game.

The existing simulations could also serve as scripts for future AI-generated video, where the Traitors-style format may have significantly more entertainment value than raw text transcripts.

This project sits somewhere between a game, a benchmark, and an entertainment prototype. It showed that multi-agent systems become much more interesting when the agents are not just talking. They need stakes, memory, hidden information, and a reason to lie.
