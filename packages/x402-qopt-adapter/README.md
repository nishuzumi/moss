# QOpt x402 Adapter

## Purpose

`@themoss/x402-qopt-adapter` adds a service-level adapter for QUBO optimization APIs protected by x402 payments. It validates payment requirements before a paid request is retried.

## Architecture

This package is an HTTP adapter, not a Moss on-chain Protocol package. It handles x402 headers, policy checks, and result parsing without creating Monad `TransactionNode` objects.

## Supported x402 version

- x402 V2 only
- Required headers:
	- `PAYMENT-REQUIRED`
	- `PAYMENT-SIGNATURE`
	- `PAYMENT-RESPONSE`

## Supported payment scheme

- `exact` only

## Adapter workflow

1. `quote()` sends a QUBO request and expects HTTP 402.
2. Adapter decodes `PAYMENT-REQUIRED` and selects an `exact` requirement.
3. Adapter validates budget, network, asset, recipient, and optional resource.
4. Caller obtains an external `PAYMENT-SIGNATURE`.
5. `submitPaid()` retries request with signature and parses result + settlement metadata.

## Payment-policy validation

`validatePaymentPolicy()` enforces:

- `maxAmount` upper bound
- exact network match
- exact asset match (case-insensitive)
- optional recipient match
- optional resource URL match

## Quantum provenance

Results include:

- `backend`
- `backendType`
- `classicalObjective`
- `optimalityGap`

This keeps solver provenance explicit and avoids overstating quantum execution.

## Security boundaries

- Adapter never accepts or stores private keys.
- Adapter never creates blockchain signatures.
- Adapter never broadcasts or settles payments.
- Signature generation is an external wallet/client boundary.

## Offline demonstration

See [examples/x402-qopt](../../examples/x402-qopt/README.md) for a local mock flow using `demo-payment-signature`.

## Limitations

- No support for x402 V1.
- No support for non-`exact` schemes.
- Demo settlement metadata is mock data.
- Demo backend is `mock-quantum-simulator`, not a physical QPU.

## Future work

- Integrate official x402 client SDK for wallet-facing flows.
- Add facilitator/testnet integration.
- Add additional optimization problem formats.
- Add richer payment receipt verification policies.
