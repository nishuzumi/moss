import { QOptX402Adapter } from "@themoss/x402-qopt-adapter";

const endpoint = "http://localhost:4021/optimize/qubo";

const problem = {
  matrix: [
    [1, -2, 0],
    [-2, 4, -1],
    [0, -1, 2],
  ],
};

const adapter = new QOptX402Adapter();

const quote = await adapter.quote(endpoint, problem, {
  maxAmount: 2000n,
  expectedNetwork: "eip155:143",
  expectedAsset: "0x0000000000000000000000000000000000000002",
  expectedPayTo: "0x0000000000000000000000000000000000000003",
  expectedResource: endpoint,
});

console.log("Verified payment quote:");
console.log(quote);

const response = await adapter.submitPaid(endpoint, problem, quote, "demo-payment-signature");

console.log("Optimization result:");
console.log(response);
