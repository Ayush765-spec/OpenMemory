<div align="center">

# 🧠 Memo

### Autonomous Multi-Agent Research Pipeline with Decentralized Memory

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Ollama](https://img.shields.io/badge/Ollama-Local%20LLM-white?logo=ollama)](https://ollama.com/)
[![0G Network](https://img.shields.io/badge/0G%20Network-Decentralized%20Storage-blue)](https://0g.ai/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

*A fully offline, privacy-first research assistant powered by a cooperative team of AI agents that think, debate, and remember — with optional decentralized storage on the 0G blockchain.*

---

</div>

## 📌 What is Memo?

**Memo** is not just another AI chatbot wrapper. It is an **orchestrated multi-agent system** where three specialized AI agents — a **Researcher**, a **Summarizer**, and a **Critic** — collaborate through an iterative pipeline to produce deeply researched, peer-reviewed answers to any question.

What makes Memo fundamentally different:

| Feature | Typical AI App | Memo |
|---|---|---|
| LLM Location | Cloud API (OpenAI, etc.) | **100% Local** via Ollama |
| Agent Architecture | Single prompt-response | **Multi-agent pipeline** with iterative refinement |
| Memory | Stateless / session-only | **Persistent semantic memory** with recall |
| Data Privacy | Sent to 3rd-party servers | **Never leaves your machine** |
| Storage Layer | Centralized database | **Decentralized on 0G Network** (optional) |
| Tool Use | None | **Native tool-calling** (web search, memory recall) |
| Quality Assurance | None | **Built-in Critic agent** with confidence scoring |

---

## 🏗️ System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 16)                │
│  ┌─────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │  Query Input │  │ Cartoon Agent    │  │  Memory Vault │  │
│  │  + Streaming │  │ Visualization    │  │  Browser      │  │
│  │  Log Console │  │ (2.5D Animated)  │  │               │  │
│  └──────┬───────┘  └──────────────────┘  └───────────────┘  │
│         │  Server-Sent Events (NDJSON Stream)               │
└─────────┼───────────────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────────────┐
│                    API LAYER (Next.js Route Handlers)        │
│         POST /api/query          GET /api/memories           │
│         (Streaming Response)     (Memory Listing)            │
└─────────┬───────────────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────────────┐
│                     ORCHESTRATOR ENGINE                      │
│                                                             │
│  ┌──────────┐    ┌────────────┐    ┌───────────┐           │
│  │RESEARCHER│───▶│ SUMMARIZER │───▶│  CRITIC   │           │
│  │  Agent   │    │   Agent    │    │   Agent   │           │
│  └────┬─────┘    └────────────┘    └─────┬─────┘           │
│       │                                   │                 │
│       │    ◄── Iterative Refinement ──►   │                 │
│       │         (up to 2 loops)           │                 │
│       │                                   │                 │
│  ┌────▼────────────────┐    ┌─────────────▼─────────────┐  │
│  │  TOOL EXECUTION     │    │  VERDICT ENGINE           │  │
│  │  • DuckDuckGo Search│    │  • APPROVED → Save & Done │  │
│  │  • Memory Recall    │    │  • NEEDS_MORE_RESEARCH    │  │
│  └─────────────────────┘    │    → Re-enter pipeline    │  │
│                             └───────────────────────────┘  │
└─────────┬───────────────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────────────┐
│                      MEMORY / STORAGE LAYER                 │
│                                                             │
│  ┌─────────────────────┐    ┌───────────────────────────┐  │
│  │   LOCAL FILESYSTEM  │    │   0G DECENTRALIZED LAYER  │  │
│  │   ./memory/*.json   │    │   • Merkle Tree Hashing   │  │
│  │   (Default Mode)    │    │   • On-chain Upload       │  │
│  │                     │    │   • Content-addressed      │  │
│  └─────────────────────┘    │     Retrieval              │  │
│                             └───────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          SEMANTIC MEMORY RETRIEVAL                    │  │
│  │   Cosine Similarity on Ollama Embeddings              │  │
│  │   Fallback: Keyword Overlap Search                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔬 Technical Deep Dive

### 1. Multi-Agent Orchestration (`lib/orchestrator.js`)

The core of Memo is an **iterative, self-correcting agent loop** — not a simple chain.

```text
Query → [Retrieve Memories] → [Research] → [Summarize] → [Critique]
                                    ▲                         │
                                    └─── if NEEDS_MORE_RESEARCH
```

- **Iterative Refinement**: The Critic agent evaluates the research output and can send the pipeline back to the Researcher with specific gaps to fill. This runs for up to **2 iterations**, ensuring depth without infinite loops.
- **Retry with Backoff**: Each agent call is wrapped in a `withRetry()` utility that handles Ollama daemon cold-start latency — automatically retrying once after a 2-second delay.
- **Context Accumulation**: On refinement iterations, new research findings are **appended** (not replaced), building a growing knowledge base within a single query session.

### 2. Research Agent with Native Tool-Calling (`agents/researchagent.js`)

The Research Agent is not a simple prompt → response system. It implements **Ollama's native tool-calling protocol**:

```javascript
// The agent is given two tools:
tools: [
  { name: "recall_memory",  // Retrieve past findings from storage },
  { name: "web_search",     // Live DuckDuckGo search via duck-duck-scrape }
]
```

**How it works:**
1. The agent receives the query + any relevant past memories as context.
2. Ollama's model decides **autonomously** whether to call tools.
3. If tools are called, results are fed back as `role: 'tool'` messages.
4. The agent can chain multiple tool calls (up to 5 loops) before producing final findings.
5. On refinement iterations, the Critic's identified **gaps** become the new research directive.

This is a **ReAct-style** (Reasoning + Acting) loop running entirely on local hardware.

### 3. Summarizer Agent (`agents/summarizeragent.js`)

Produces structured JSON output from raw research findings:

```json
{
  "answer": "2-3 sentence synthesized answer",
  "keyTakeaways": ["point 1", "point 2", "point 3"],
  "memorySnippet": "one-line summary for future semantic recall",
  "mergeKey": "existing_memory_key_or_null"
}
```

**Memory Deduplication**: The Summarizer checks past memory keys and, if the current query covers the same topic as an existing memory, returns that key as `mergeKey` — updating the existing memory instead of creating duplicates.

### 4. Critic Agent (`agents/criticagent.js`)

The Critic introduces **adversarial self-evaluation** into the pipeline:

- **Completeness Check**: Does the answer actually address the query?
- **Gap Analysis**: Identifies specific missing angles or logical holes.
- **Confidence Scoring**: Rates the output from 0-100.
- **Verdict System**: Returns `APPROVED` to finalize, or `NEEDS_MORE_RESEARCH` to trigger re-entry into the pipeline.
- **Follow-up Generation**: Suggests further lines of inquiry for the user.

### 5. Semantic Memory System (`storage/index.js` + Orchestrator)

Memo has **persistent, semantic memory** — not just raw storage, but intelligent recall:

#### Embedding-Based Retrieval
```text
Query → Ollama Embedding → Cosine Similarity vs All Memory Embeddings → Top-K Results
```

- Uses Ollama's local embedding model to vectorize both the query and stored memories.
- Computes **cosine similarity** to find semantically related past sessions.
- Falls back to **keyword overlap search** if the embedding model is unavailable.

#### Dual Storage Backend
- **Local Mode** (`USE_0G=false`): Simple JSON files in `./memory/`, zero configuration.
- **Decentralized Mode** (`USE_0G=true`): Full 0G Network integration:
  - Files are Merkle-tree hashed for tamper-proof integrity.
  - Uploaded to 0G's decentralized storage via the `@0glabs/0g-ts-sdk`.
  - Downloaded by content-addressed root hash.
  - Local index maps memory keys → on-chain root hashes.

### 6. Real-Time Streaming Frontend (`app/page.js`)

The frontend uses **NDJSON streaming** (Newline-Delimited JSON) over a single HTTP connection:

```javascript
// Server streams stage updates in real-time
const reader = res.body.getReader();
// Each line is a JSON object: { type: "stage", stage: "research", message: "..." }
```

- **Live pipeline visualization**: See each agent activate in real-time.
- **Animated 2.5D agent characters** (`components/CartoonAgents.jsx`): Three cartoon agents physically walk to a chalkboard when their stage is active, using `requestAnimationFrame` for smooth 60fps movement with bobbing walk cycles.
- **Interactive follow-up**: Click on Critic-suggested questions to immediately re-run the pipeline.

---

## 🎯 What Makes Memo Unique?

### 1. Fully Autonomous & Offline
Unlike LangChain/AutoGPT apps that require cloud APIs, Memo runs **entirely on your machine** via Ollama. Your research data, memories, and queries never leave your hardware. No API keys required for core functionality.

### 2. True Multi-Agent Collaboration (Not Just Chained Prompts)
Most "multi-agent" systems are sequential prompt chains. Memo implements a **closed-loop feedback system** where the Critic can reject outputs and force re-investigation — mimicking real peer-review processes.

### 3. Agent Tool-Calling on Local Models
Implementing Ollama's tool-calling protocol for live web search and memory recall — running a ReAct agent loop on consumer hardware — is architecturally non-trivial and rarely seen in open-source projects.

### 4. Decentralized Storage on 0G Network
Memo is one of the few research tools that offers **blockchain-backed, content-addressed storage** for AI-generated knowledge. Your research memories are tamper-proof and verifiable via Merkle tree hashing.

### 5. Semantic Memory with Embedding Recall
Instead of simple keyword lookup, Memo uses **vector embeddings** to find semantically related past sessions — enabling the system to build on prior knowledge even when queries are phrased differently.

### 6. Production-Grade Streaming UX
Real-time NDJSON streaming with animated agent visualization creates an experience that is **transparent and engaging** — you see exactly what each agent is doing, when.

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version | Purpose |
|---|---|---|
| **Node.js** | ≥ 18.x | Runtime |
| **Ollama** | Latest | Local LLM inference |
| **An Ollama Model** | e.g. `qwen2.5-coder` | Agent reasoning |

### 1. Clone the Repository

```bash
git clone https://github.com/Ayush765-spec/OpenMemory.git
cd OpenMemory
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Install & Start Ollama

Download from [ollama.com](https://ollama.com/) and pull a model:

```bash
ollama pull qwen2.5-coder
```

Make sure Ollama is running (it starts automatically on install, or run `ollama serve`).

### 4. Configure Environment

Create a `.env.local` file:

```env
# LLM Configuration
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder
OLLAMA_EMBED_MODEL=llama3

# Storage Mode
USE_0G=false

# (Optional) 0G Network Configuration — only if USE_0G=true
PRIVATE_KEY=your_wallet_private_key
EVM_RPC=https://evmrpc-testnet.0g.ai
INDEXER_RPC=https://indexer-storage-testnet-turbo.0g.ai
```

### 5. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📂 Project Structure

```text
memo/
├── agents/
│   ├── researchagent.js      # Research Agent — tool-calling, web search, memory recall
│   ├── summarizeragent.js    # Summarizer Agent — structured JSON synthesis
│   └── criticagent.js        # Critic Agent — adversarial evaluation & verdict
│
├── lib/
│   └── orchestrator.js       # Core pipeline engine — iteration, retry, memory retrieval
│
├── storage/
│   └── index.js              # Dual storage backend (local filesystem / 0G Network)
│
├── components/
│   ├── CartoonAgents.jsx     # 2.5D animated agent visualization (requestAnimationFrame)
│   ├── AgentCanvas.jsx       # Canvas-based agent renderer
│   └── ThreeAgents.jsx       # Three.js agent visualization (experimental)
│
├── app/
│   ├── layout.js             # Root layout with metadata
│   ├── page.js               # Main UI — streaming console, results, memory vault
│   └── api/
│       ├── query/route.js    # POST — streaming orchestrator endpoint (NDJSON)
│       └── memories/route.js # GET  — list stored memories
│
├── memory/                   # Local memory storage (gitignored)
├── next.config.mjs           # Next.js config — external packages for 0G SDK
├── package.json              # Dependencies
└── .env.local                # Environment variables (gitignored)
```

---

## 🔧 Configuration Reference

| Variable | Default | Description |
|---|---|---|
| `OLLAMA_URL` | `http://localhost:11434` | Ollama API endpoint |
| `OLLAMA_MODEL` | `qwen2.5-coder` | Model used for agent reasoning |
| `OLLAMA_EMBED_MODEL` | `llama3` | Model used for semantic embeddings |
| `USE_0G` | `false` | Enable decentralized 0G storage |
| `PRIVATE_KEY` | — | Wallet key for 0G transactions |
| `EVM_RPC` | — | 0G EVM RPC endpoint |
| `INDEXER_RPC` | — | 0G storage indexer endpoint |

---

## 🧪 How a Query Flows Through the System

```text
User types: "What are the latest advances in quantum computing?"
         │
         ▼
    ┌─── API Route (/api/query) ───────────────────────────┐
    │                                                       │
    │  1. MEMORY RETRIEVAL                                 │
    │     → Load past sessions from storage                │
    │     → Embed query + memories via Ollama              │
    │     → Rank by cosine similarity, pick top 3          │
    │                                                       │
    │  2. RESEARCH AGENT (Iteration 1)                     │
    │     → Receives query + past memory context           │
    │     → Autonomously decides to call web_search tool   │
    │     → DuckDuckGo returns top 4 results               │
    │     → Agent synthesizes raw findings                 │
    │                                                       │
    │  3. SUMMARIZER AGENT                                 │
    │     → Distills findings into structured JSON         │
    │     → Generates answer, takeaways, memory snippet    │
    │     → Checks for duplicate memories (mergeKey)       │
    │                                                       │
    │  4. CRITIC AGENT                                     │
    │     → Evaluates completeness and accuracy            │
    │     → Verdict: NEEDS_MORE_RESEARCH                   │
    │     → Identifies gaps: ["practical applications",    │
    │       "error correction breakthroughs"]               │
    │                                                       │
    │  5. RESEARCH AGENT (Iteration 2 — Refinement)        │
    │     → Directive: investigate identified gaps          │
    │     → New findings appended to existing research     │
    │                                                       │
    │  6. SUMMARIZER → CRITIC (Iteration 2)                │
    │     → Verdict: APPROVED (confidence: 87%)            │
    │                                                       │
    │  7. SAVE TO MEMORY                                   │
    │     → Persisted locally or to 0G Network             │
    │                                                       │
    │  8. STREAM RESULT TO FRONTEND                        │
    │     → Answer + Takeaways + Critique + Follow-ups     │
    └───────────────────────────────────────────────────────┘
```

---

## 🛡️ Privacy & Security

- **Zero Telemetry**: No data is sent to any external service (except DuckDuckGo for web search, when the agent decides to call it).
- **Local-First**: All LLM inference runs on your machine via Ollama.
- **Secrets Management**: `.env.local` is gitignored; private keys never reach version control.
- **0G Storage**: When enabled, memories are content-addressed and verifiable — no centralized server can modify your stored knowledge.

---

## 📜 License

This project is open source under the [MIT License](LICENSE).

---

<div align="center">

**Built with 🧠 by Ayush Mukherjee**

*Memo — Because your research deserves agents that think, debate, and remember.*

</div>
