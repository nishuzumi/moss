# Troubleshooting / FAQ

Common problems when setting up and using Moss, with symptom-cause-fix format and copy-pasteable solutions.

---

## Build Pipeline

### Symptom
`pnpm typecheck` fails with hundreds of `Cannot find module '@themoss/...'` errors even though the source files exist.

### Cause
TypeScript resolves cross-package declarations through compiled output in `dist/` directories. If `pnpm build` hasn't run yet, those declaration files don't exist.

### Fix
Always run `pnpm build` before `pnpm typecheck`:

```bash
pnpm build
pnpm typecheck
```

---

## Node.js / pnpm Version Mismatch

### Symptom
Installation fails with obscure peer dependency errors.

### Cause
Moss requires Node.js >= 22 and pnpm >= 11.

### Fix
Check: node --version (>=22) / pnpm --version (>=11). Install pnpm: corepack enable && corepack prepare pnpm@latest --activate

---

## vitest 4.x Incompatibility

### Symptom
After bumping vitest to 4.x, decorator-based Protocol classes throw runtime errors.

### Cause
Moss uses Stage-3 decorators. vitest 3.x uses esbuild (supports them); vitest 4.x uses oxc (does not yet).

### Fix
Do not bump vitest to 4.x. See ADR 0001. Do not enable experimentalDecorators.

---

## TypeScript Version Pin

### Symptom
TS 6.x produces declaration errors after build.

### Cause
Moss pins TypeScript to 5.9.x — tsup's DTS plugin does not yet support TS 6.

### Fix
Keep TypeScript at 5.9.x.

---

## Supply-Chain Guard

### Symptom
pnpm install fails with package too new errors.

### Cause
pnpm-workspace.yaml sets minimumReleaseAge: 1440 (24 hours). Packages younger than 1 day are rejected.

### Fix
Wait 24 hours or pin an older version.

---

## RPC Connectivity

### Symptom
Live tests fail with FetchError / timeout.

### Fix
Set MONAD_RPC_URL environment variable or use pnpm test:offline.

---

## pnpm fetch-abi Missing API Key

### Symptom
fetch-abi fails with 401.

### Fix
Get a free key from Monadscan, export MONADSCAN_API_KEY.

---

## MCP Server Connection

### Symptom
MCP client shows Connection refused / spawn ENOENT.

### Fix
Run pnpm build first. Use absolute path in MCP config. Include MONADSCAN_API_KEY in env block.

---

## Decorator Metadata Error

### Symptom
Cannot read properties of undefined (reading 'metadata').

### Fix
Use namespace imports (import * as kuru) not named imports (import { Kuru }).

---

## Test Failures: offline passes but online fails

### Fix
Check RPC connectivity. Verify fixed addresses on Monadscan.

---

## Still Stuck?

Check closed issues, read ADRs, run pnpm build && pnpm typecheck && pnpm lint, or open a new issue.
