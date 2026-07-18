# x402 QOpt Example

## Start the server

```bash
pnpm --filter @themoss/example-x402-qopt server
```

## Run the client

```bash
pnpm --filter @themoss/example-x402-qopt client
```

## Expected flow

1. Client sends QUBO request.
2. Server returns HTTP 402.
3. Adapter validates payment requirements.
4. Demo supplies an external mock signature.
5. Server returns optimization result.
6. Adapter parses settlement metadata.

## Warning

This example uses no production funds and does not settle a real blockchain payment.
