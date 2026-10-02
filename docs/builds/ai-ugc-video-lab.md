# Building an AI UGC Video Agent

**Status**: SHIPPED  
**Date**: October 2026  
**Stack**: HyperAgent, AI Video, Agents, Gemini, ffmpeg

A Hyperagent port of the open-source One Face Lock skill that turns one product photo and one line of copy into 50 UGC concepts with the same fictional creator locked across all of them, then an experiment in rendering five of those concepts as AI-generated vertical ads and checking the output with code before I reviewed it.

Videos: `public/video/ai-ugc-video-lab/tactical-raccoon-1..4.mp4` (TH-01, HT-29, CF-42, TH-09), 720x1280 H.264/AAC, served as supplied.

The agent in this build is my Hyperagent port of the open-source **one-face-lock Agent Skill v1.1.0** by **@danclipping** (MIT license). The method, the ad formats, and the drift check are theirs. My part was adapting the skill into a working agent, running the experiment, picking the concepts, directing the iterations, judging the generated video, and building the QA workflow around it.

### The Goal

I wanted to test whether a single-purpose agent could generate a large pack of UGC ad concepts while keeping the same fictional creator consistent across every one of them, and then help turn a few selected concepts into usable AI-generated video.

The product I gave it was fictional on purpose: *“The Tactical Raccoon, a chaotic but highly effective perimeter security companion.”*

The joke that emerged was that the raccoon mostly just sits there. Apparently that is enough.

### What I Built

A Hyperagent adaptation of the One Face Lock skill. It asks for two things and nothing else: one product photo and one line about the product.

It returns a 50-script UGC pack. The same fictional creator, Dev, is locked across all 50 scripts: face, voice, clothing, room, lighting, and camera style are written once and pasted into every script word for word. The product’s appearance is locked the same way, from the photo rather than from the copy.

The pack ends with a drift check, and the agent runs it as code rather than by eye: the two lock blocks must appear byte-identical in exactly 50 prompt blocks, every lock field must have exactly one value across the file, the format counts and numbering must be right, every hook must be unique and the right length, and no banned phrases may appear. One representative line, from the first card: *“so yeah, my perimeter security is a raccoon.”*

### The Experiment

The input was a stock photo of an ordinary raccoon plus the Tactical Raccoon line. The photo showed no tactical gear at all, so the skill’s rule applied: trust the photo for how the product looks and the copy for what it does. The product lock describes the raccoon exactly as photographed and bans vests, goggles, and harnesses.

That conflict produced the creative premise. The raccoon just sits there, and somehow the security works.

The agent generated 50 concepts. I selected five to take through video production. Five finished ads were produced across 31 successful video generations; most concepts needed more than one pass to improve visual continuity, movement, voice delivery, framing, and other quality issues. Four of the five are shown below because they are the four I liked best.

### Four Selected Ads

- **TH-01** — “So yeah, my perimeter security is a raccoon.” Pan to the raccoon by the door, then back to Dev for “Nobody has come in.” (11.8s)
- **HT-29** — “How to know if he’s working: count the break-ins. I’ll wait.” A four-second silent stare, then “Yeah… that’s the number.” (13.1s)
- **CF-42** — “I had a chain and a prayer. Now I have a chain and a raccoon.” Dev lifts a squirming raccoon into frame on the last line. (14.1s)
- **TH-09** — Camera, alarm, raccoon, counted on his fingers. “The raccoon… nobody walks in.” (14.1s)

The Tactical Raccoon is fictional. Dev is an AI-generated person. These videos are AI-generated, testimonial-style ads created as an experiment, not real customer endorsements or advertisements for a real product.

CF-42 is also the one deliberate break from the product lock, which says the raccoon only sits. Dev reaches below the frame and comes up holding it, because that gave the animal a physical reason to be at chest height.

### What Broke

The failures were specific and mostly repeatable, so a short list is more useful than the rerender history.

- **Invented geometry.** When the camera panned to parts of the room the opening frame had not shown, the model drew a different door: paneled, no chain lock. Whatever it cannot see, it makes up.
- **Impossible phones.** A second phone with a lit screen appeared in Dev’s hand for about 0.4 seconds in one take. The camera is the phone, so that cannot exist.
- **The reference photo as a frame.** Twice, the last quarter second of a clip jumped to the raw raccoon reference image on its white background.
- **Static animals.** The prompt originally described the raccoon as “perfectly still.” The model obeyed, and the raccoon looked like a cutout.
- **Burned-in captions.** One take subtitled its own dialogue on screen despite a “no text” instruction.
- **Composited subjects.** A raccoon placed at chest height next to Dev floated there with no support and looked pasted in, because the staging gave it no reason to be there.

Rerenders and setup changes fixed most of these: showing the model the door in the start frame, trimming glitch frames from clip tails, stating explicitly that no device is ever visible, describing the raccoon as a living animal with small movements, banning subtitles outright, and changing the staging so Dev holds the raccoon.

### How I Checked the Videos

The agent cannot watch a clip the way a person does, but it can take one apart. Every render went through the same pass before I saw it.

- **Contact sheets.** ffmpeg pulled frames into tiled images: one or two per second across the whole clip, more across camera moves, and 24 per second across the last three quarters of a second to catch single-frame glitches. The agent inspected those sheets directly. This is what caught the door flicker, the doubled door, the pasted reference frames, the second phone, and the burned-in caption.
- **A motion metric.** To check whether the raccoon actually moved, the raccoon segment was converted to grayscale at 8 fps and the average pixel difference between consecutive frames was measured. Crude, but it turned “looks static” into a number: the final TH-01 scored about twice the earlier take during the raccoon shot.
- **Speech timing from audio energy.** Loudness in 0.1-second windows produced a timeline of where each line landed. For HT-29 it confirmed the four-second “I’ll wait” beat was really silent, and it flagged a clip where the payoff line arrived before the raccoon did.
- **Pitch tracking.** When I said a TH-09 line went up at the end where it should have dropped, the agent ran an autocorrelation pitch tracker over the final phrase: roughly 100 Hz rising to 123 Hz in the original, 127 Hz falling to about 101–105 Hz in the retake. The measurement agreed with my ear both times.
- **Join checks.** Every finished ad is two clips joined end to end, so frames across each join were sampled for visible jumps in face, framing, or light.

The distinction that matters: the automated checks surfaced problems and measurements. I still decided which take was actually better.

### What I Learned

**The model invents what it cannot see.** The door changed because the opening portrait showed only a sliver of it. Better input and setup mattered more than adding prompt instructions.

**Fixing a checklist problem can make the video worse.** Forcing the correct end frame nailed the door and made everything before it rushed and stiff. Stronger visual consistency is not automatically worth losing motion, personality, or comedic timing.

**Sometimes rerolling beats re-prompting.** The TH-09 keeper was a fresh roll of the original, unedited prompts after two rounds of targeted fixes had each lost something.

**Physical staging matters.** The raccoon-holding shot in CF-42 works because the animal has a believable reason to be at chest height. The composited version of the same idea did not.

**Automated QA makes subjective review more efficient. It does not replace judgment.** By my checklist, the door change in TH-01 was the biggest flaw. As a viewer, the raccoon’s personality mattered far more, and several “fixes” made the door correct and the ad worse. The person picking the take mattered more than the checklist.

### Outcome

- 1 Hyperagent adaptation of the One Face Lock skill
- 50 UGC concepts
- 5 finished ads
- 31 successful video generations during production
- 4 selected ads shown on this page
- Roughly 2.5 hours from the raccoon photo to the fifth finished ad

This was an experiment in AI-assisted creative production and quality control, not an autonomous ad agency. I selected the scripts and approved or rejected every take. The agent handled generation, inspection, measurement, trimming, and joining, and told me what it had found wrong before I watched each clip.

### Credits

- **one-face-lock Agent Skill** v1.1.0 by **@danclipping**, MIT license: the method, formats, and drift check this agent is built on.
- Built and run in Hyperagent.
- Agent orchestration: Claude Opus 5.5.
- Video generation: Gemini Omni 1.1 Flash.
- Image generation and editing: Nano Banana Pro and Nano Banana 2.
- Post-processing and analysis: ffmpeg, Python, NumPy.
