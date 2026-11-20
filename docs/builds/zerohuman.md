# ZeroHuman: A Business Only AI Agents Can Use

**Status**: LIVE  
**Date**: November 16, 2026 (built November 11–16)  
**Stack**: AI Agents, Ethereum, ENS, ERC-8004, TypeScript, Railway, DeepSeek, HyperAgent

An always-on service that sells two small jobs (Decision and Encouragement) to other AI agents for 0.0001 ETH each. Agents pay the ENS name zerohuman.eth and get results back in a transaction from the same name.

The page body lives in `src/pages/building/zerohuman.astro`. Every onchain figure there was read from these sources. Do not add numbers that are not on them.

### Evidence

- ENS: https://explorer.ens.domains/zerohuman.eth (ETH address = service wallet 0x8D6616b332919310708DeEAc62CD72663195d1d0; text record `com.zerohuman.services`; primary name of the wallet = zerohuman.eth)
- First Decision order: https://etherscan.io/tx/0x76b5d2598052c4a6b94fba00282fd920c4200d19f5c22480669712e3a4c0c4c6 (block 26427993, Nov 16, 2026, 0.0001 ETH)
- Its delivery: https://etherscan.io/tx/0x830b88fe664ffc7e76e0bdb10dee9298889c2519660d77d0c82579cf222accb3 (picked "run the allowlist trial longer", index 1 of 3, target block 26427998; seller gas 8,261,956,622,240 wei)
- First Encouragement order: https://etherscan.io/tx/0x48c36d5f80b167de598c151a5caa61061728444689104012e9e89313c2e972bf
- Its delivery: https://etherscan.io/tx/0xeb9896517dc902c2510e16a7489250d1fbbce7f4be274828096a13a5a10161a3 (seller gas 9,172,836,340,080 wei; DeepSeek reply quoted on the page)
- ERC-8004 registration (agent 56626): https://etherscan.io/tx/0xa217a3066aa82eb3b4143dd1fc90e8ac711134d6dab9d759bed4d3ec7977b78f
- Prompt-injection test (Sepolia): https://sepolia.etherscan.io/tx/0xbb3d2466a48783a290e591a9b85f3486e8af4ac4ac616d4b2aa010acc5358d5c
- Code and test/review record: https://github.com/kenashe/zerohuman (154 tests; reviews in docs/SECURITY.md)
- Live status: https://zerohuman-production.up.railway.app

### Sections

What it sells, the name is the business, how an order works, the first mainnet orders, how it was built and tested, how agents find it, limitations, what's next, related builds.

### Guardrails

- Both paid mainnet orders came from Ken's own allowlisted test buyer. As of November 20, 2026 there were no outside buyers. Do not imply customers or traction until a new wallet actually pays.
- Do not call it trustless or escrowed: there is no escrow, refunds are manual, and the service wallet key is on Railway.
- Decision randomness can be influenced by block builders; keep the "low-stakes only" framing.
- No video exists for this build (Ken decided not to make one).
