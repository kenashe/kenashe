# I Built Two AI Agents That Buy and Sell Services on Ethereum

**Status**: SHIPPED  
**Date**: November 10, 2026  
**Stack**: AI Agents, Ethereum, ENS, Autonomous Agents, Ollama, Blockchain, Decentralization

Two autonomous AI agents, each with its own Ethereum wallet. The seller advertised five ridiculous services through ENS. The buyer found the catalog, picked one, paid in ETH, and got the finished work back in a second transaction, all on Ethereum mainnet.

Video (embedded on the page under the `#demo` anchor): [I Built Two AI Agents That Buy and Sell Services on Ethereum](https://www.youtube.com/watch?v=yZWsJjFnSH0)

The page body lives in `src/pages/building/ai-agent-economy.astro`. Every onchain figure there was read from these sources. Do not add numbers that are not on them.

### Evidence

- ENS listing: https://explorer.ens.domains/zerohuman.eth (text record key `com.ridiculous.market`)
- Order and payment: https://etherscan.io/tx/0xa5ed7f4c81e605b14e9c596a146c5fe2b3c10f794a0f1c4f3a880d7d3840efec (block 26385257, Nov 10, 2026, 14:58:11 UTC, 0.0003 ETH, gas used 26,360)
- Delivery: https://etherscan.io/tx/0x1ab74d9b537ec4abf3faf6bc8335e30a018894562cecca6f17b4883bdd95c71e (block 26385260, Nov 10, 2026, 14:58:47 UTC, 0 ETH, gas used 37,000)

### Sections

How it worked, the actual transaction, what it demonstrated, limitations, what's next, related builds.

### Guardrails

- ZeroHuman is not LIVE and is not open to public purchases. Do not say otherwise until that is deployed and tested.
- Do not describe the experiment as fully decentralized or production-ready.
- One purchase happened. Do not add others.
