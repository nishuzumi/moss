# Moss Beginner Tutorials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Chinese beginner tutorial suite that teaches setup, the Moss workflow, first-time contribution, Protocol integration, and a safe AI Agent demo using the repository's current APIs.

**Architecture:** Keep each learning goal in one focused Markdown file under `docs/tutorials/zh-CN/`, with an index that supplies the recommended reading order. Reuse repository examples and Protocol templates instead of introducing new runtime code, and add entry links to the existing Chinese README and documentation index.

**Tech Stack:** Markdown, Node.js 22+, pnpm 11.10.0, TypeScript 5.9.x, Moss Registry/Simulator/MCP APIs, Monad mainnet chain ID 143.

---

### Task 1: Create the tutorial index and learning path

**Files:**
- Create: `docs/tutorials/zh-CN/README.md`

- [ ] **Step 1: Write the tutorial index**

Create a landing page with the six requested topics, their learning outcomes, recommended order, audience notes, and the safety invariant that Moss never signs or sends transactions.

- [ ] **Step 2: Verify every planned page has one index link**

Run: `rg -n '01-getting-started|02-first-pull-request|03-protocol-integration|04-ai-agent-demo|05-environment-setup|06-faq' docs/tutorials/zh-CN/README.md`

Expected: all six filenames appear.

### Task 2: Write environment setup and getting-started guides

**Files:**
- Create: `docs/tutorials/zh-CN/01-getting-started.md`
- Create: `docs/tutorials/zh-CN/05-environment-setup.md`

- [ ] **Step 1: Write the environment setup guide**

Document Git, Node.js 22+, Corepack/pnpm 11.10.0, cloning `https://github.com/Wea1her/moss`, dependency installation, optional `MOSS_RPC_URL`, build-before-typecheck ordering, offline tests, and common environment diagnostics.

- [ ] **Step 2: Write the Moss getting-started guide**

Explain the architecture and `discover → load → action → simulate` workflow; run the existing WMON and Kuru examples; explain Capability, Query, Change, Receipt, Outcome, and Warning; require stopping on every Warning and intent alignment before any external signer boundary.

- [ ] **Step 3: Check commands against workspace scripts**

Run: `rg -n '"(build|typecheck|lint|test)"|packageManager|"node"' package.json .github/workflows/ci.yml`

Expected: tutorial commands match Node 22+, pnpm 11.10.0, and repository scripts.

### Task 3: Write the first Pull Request guide

**Files:**
- Create: `docs/tutorials/zh-CN/02-first-pull-request.md`

- [ ] **Step 1: Write the contribution workflow**

Cover fork/clone/upstream remotes, branching from `main`, small changes, documentation checks, required verification commands, when to add a changeset, Conventional Commit examples with an English prefix and Chinese subject, pushing, completing the PR template, handling CI/review, and security-reporting boundaries.

- [ ] **Step 2: Cross-check repository contribution requirements**

Run: `rg -n 'changeset|build|typecheck|lint|test|private vulnerability|branch' CONTRIBUTING.md .github/PULL_REQUEST_TEMPLATE.md SECURITY.md`

Expected: every mandatory requirement is represented in the guide.

### Task 4: Write the Protocol integration practice

**Files:**
- Create: `docs/tutorials/zh-CN/03-protocol-integration.md`

- [ ] **Step 1: Write a template-based integration walkthrough**

Teach copying `packages/protocols/_template`, renaming the package, ABI and fixed-address provenance, typed Handles, `{ type, description }` parameters, Capability/Query decorators, exactly one direct transaction per Capability, pure exhaustive Receipts, exports/composition, tests, live simulation, and changesets.

- [ ] **Step 2: Include a review checklist and explicit anti-patterns**

Call out hand-written ABIs, private keys, zero/multiple direct transactions, RPC use inside Receipts, incomplete Change coverage, guessed token symbols, skipped simulations, and edits to generic core for Protocol-specific behavior.

- [ ] **Step 3: Cross-check the template and ADRs**

Run: `rg -n 'CHANGEME|exactly one|ABI origin|Receipt|ParamsSpec|Handle' packages/protocols/_template docs/adr docs/protocol-onboarding.md`

Expected: guide terminology matches current template and architecture decisions.

### Task 5: Write the AI Agent demo guide

**Files:**
- Create: `docs/tutorials/zh-CN/04-ai-agent-demo.md`

- [ ] **Step 1: Write the no-private-key MCP path**

Document building the MCP server, configuring its absolute path and RPC environment, starting an MCP client, recording user intent, invoking the four tools in order, comparing ordered Receipt texts, and stopping on every Warning.

- [ ] **Step 2: Write the optional local-fork signer demo**

Use the existing `examples/agent-swap` scripts to separate Agent construction/simulation from the disposable local-fork wallet; state clearly that the bundled Anvil key is public and must never hold real funds.

- [ ] **Step 3: Verify names and scripts**

Run: `rg -n 'discover|load|action|simulate|fork|swap|wallet' docs/mcp-tools.md examples/agent-swap/package.json examples/agent-swap/README.md`

Expected: all tool and script names used by the guide exist.

### Task 6: Write FAQ and wire navigation

**Files:**
- Create: `docs/tutorials/zh-CN/06-faq.md`
- Modify: `README.zh-CN.md`
- Modify: `docs/README.md`

- [ ] **Step 1: Write the FAQ**

Answer setup, RPC, chain support, balance/private-key, build/typecheck, Warning, Capability editing, token identity, Protocol contribution, changeset, MCP path, and production-readiness questions with links to authoritative repository documents.

- [ ] **Step 2: Add navigation links**

Add one beginner-tutorial entry to the Chinese README documentation table and one Chinese tutorial-suite entry to `docs/README.md`.

- [ ] **Step 3: Check local Markdown links**

Run a local script that extracts relative Markdown links from the seven new pages plus the two modified indexes, resolves fragments away, and reports any missing target.

Expected: `0 missing local links`.

### Task 7: Validate the documentation change

**Files:**
- Verify: all files listed above

- [ ] **Step 1: Run formatting/lint checks**

Run: `pnpm exec biome check docs/tutorials/zh-CN README.zh-CN.md docs/README.md`

Expected: no errors.

- [ ] **Step 2: Run repository checks in required order**

Run:

```bash
pnpm build
pnpm typecheck
pnpm lint
MOSS_SKIP_E2E=1 pnpm test
```

Expected: all commands exit successfully. If dependencies are unavailable, report the exact missing prerequisite and still run link and content checks.

- [ ] **Step 3: Review the diff**

Run: `git diff --check` and `git status --short`.

Expected: no whitespace errors and only the planned documentation files are modified.
