# Moss Simple Flow Examples

Enhanced examples demonstrating the `discover → load → action → simulate` flow with proper error handling, CLI parameters, and friendly output.

## Features

- 🎨 **Colorful Output**: Using chalk for better visibility
- 📝 **Structured Logging**: Step-by-step progress tracking
- ✅ **Error Handling**: Custom error types and validation
- ⚙️ **CLI Parameters**: Flexible configuration via command-line arguments
- 📊 **Table Formatting**: Readable tabular data presentation

## Prerequisites

- Node.js 20+
- pnpm
- Set `MOSS_RPC_URL` environment variable

## Installation

```bash
pnpm install
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm wrap` | Run WMON wrap example |
| `pnpm swap` | Run Kuru swap example |
| `pnpm combined` | Run combined flow example |
| `pnpm typecheck` | TypeScript type checking |

## Usage

### WMON Wrap

```bash
pnpm wrap --amount 1.5 --account 0xYourAddress
```

**Parameters:**
- `--amount`: Amount of MON to wrap (default: 1.5)
- `--account`: Your wallet address

### Kuru Swap

```bash
pnpm swap --amount 1 --token-in MON --token-out USDC --account 0xYourAddress
```

**Parameters:**
- `--amount`: Amount to swap (default: 1)
- `--token-in`: Input token (MON, USDC, AUSD, WMON) (default: MON)
- `--token-out`: Output token (MON, USDC, AUSD, WMON) (default: USDC)
- `--account`: Your wallet address

### Combined Flow

```bash
pnpm combined --amount 1 --account 0xYourAddress
```

Demonstrates a multi-step workflow: MON → USDC → MON

## Project Structure

```
src/
├── utils/
│   ├── logger.ts       # Colorful logging utilities
│   ├── error-handler.ts # Error types and validation
│   └── args.ts         # CLI parameter parsing
├── wmon-wrap.ts        # WMON wrap example
├── kuru-swap.ts        # Kuru swap example
└── combined-flow.ts    # Multi-step combined example
```

## Key Concepts

### Error Handling

Custom `MossError` class with error codes for easier debugging:
- `INVALID_AMOUNT`: Amount must be a positive number
- `INVALID_TOKEN`: Token must be one of supported tokens
- `INVALID_ADDRESS`: Invalid address format

### CLI Parameter Parsing

Supports kebab-case parameters that are converted to camelCase:
- `--token-in` → `tokenIn`
- `--token-out` → `tokenOut`

### Simulation

All examples use `createTraceSimulator` with an observer to validate transaction effects against declared expectations.
