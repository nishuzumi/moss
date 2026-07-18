# @themoss/protocol-chainlink

Read-only Chainlink Data Feed Protocol adapter for Moss on Monad.

The adapter allows an Agent to read the latest round and metadata from a
caller-supplied Chainlink Data Feed proxy address.

## Supported Query

### `latestRound`

Reads the latest round from a Chainlink Data Feed.

Input:

| Parameter | Type | Description |
| --- | --- | --- |
| `feed` | Address | Chainlink Data Feed proxy address to query |

Output:

| Field | Description |
| --- | --- |
| `feed` | Queried Feed proxy address |
| `description` | Human-readable Feed description |
| `decimals` | Number of decimals used by the Feed |
| `version` | Feed proxy version |
| `roundId` | Latest round identifier |
| `answer` | Raw signed integer answer |
| `formattedAnswer` | Answer formatted using Feed decimals |
| `startedAt` | Round start timestamp |
| `updatedAt` | Last update timestamp |
| `answeredInRound` | Round in which the answer was produced |

## Moss Discovery Metadata

- Protocol: `chainlink`
- Method: `latestRound`
- Kind: `query`
- Category: `token`
- Tags: `oracle`, `price-feed`

This adapter is read-only. It does not construct unsigned transactions,
move assets, sign messages, or send transactions.

## Example

```typescript
import { Registry } from "@themoss/core";
import { Chainlink } from "@themoss/protocol-chainlink";
import { monadRuntime } from "@themoss/system";

const runtime = await monadRuntime();
const registry = new Registry(runtime).use(Chainlink);

const account = "0xcccccccccccccccccccccccccccccccccccccccc";

// Official MON / USD Feed used here as an example.
const feed = "0xBcD78f76005B7515837af6b50c7C52BCf73822fb";

const result = await registry.action(
  "chainlink",
  "latestRound",
  account,
  { feed },
);

console.log(result);
```

## ABI provenance

The committed ABI is the complete verified-contract ABI retrieved from the
Monad explorer through Etherscan API V2.

The ABI source file records:

- the Feed proxy address;
- the explorer page;
- the retrieval date;
- the `explorer` origin required by Moss ADR 0007.

The generated ABI should not be edited manually or replaced with a
hand-selected function subset.

## Testing

Run the package checks from the repository root:

```bash
pnpm --filter @themoss/protocol-chainlink build
pnpm --filter @themoss/protocol-chainlink typecheck
pnpm --filter @themoss/protocol-chainlink test
```

Set `MOSS_SKIP_E2E=1` to skip the live Monad mainnet test.

The live test verifies that the official MON / USD Feed:

- has deployed bytecode;
- can be queried from Monad mainnet;
- returns a positive answer;
- returns a non-zero update timestamp.

## Security and limitations

- The caller supplies the Feed proxy address.
- This adapter does not maintain a trusted Feed allowlist.
- Consumers must verify the Feed description and denomination.
- Consumers must inspect `updatedAt` before using an answer.
- The adapter does not enforce a maximum staleness period.
- The adapter does not provide financial or price-validity guarantees.
- A successful RPC response does not prove that a Feed is suitable for a
  particular trading, lending, or liquidation decision.