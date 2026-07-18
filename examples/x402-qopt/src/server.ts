import { createHash, randomUUID } from "node:crypto";
import { encodeBase64Json, validateQuboProblem } from "@themoss/x402-qopt-adapter";
import express from "express";

const app = express();
app.use(express.json());

const PORT = 4021;
const PRICE = "1000";
const NETWORK = "eip155:143";
const ASSET = "0x0000000000000000000000000000000000000002";
const PAY_TO = "0x0000000000000000000000000000000000000003";
const RESOURCE = `http://localhost:${PORT}/optimize/qubo`;

function evaluate(matrix: number[][], solution: number[]): number {
  let total = 0;

  for (let i = 0; i < matrix.length; i += 1) {
    const left = solution[i];
    const row = matrix[i];

    if (left === undefined || row === undefined) {
      throw new Error("Invalid QUBO matrix or solution shape");
    }

    for (let j = 0; j < matrix.length; j += 1) {
      const coefficient = row[j];
      const right = solution[j];

      if (coefficient === undefined || right === undefined) {
        throw new Error("Invalid QUBO matrix or solution shape");
      }

      total += left * coefficient * right;
    }
  }

  return total;
}

function solveReference(matrix: number[][]) {
  const size = matrix.length;
  const combinations = 2 ** size;

  let bestSolution: number[] = [];
  let bestValue = Number.POSITIVE_INFINITY;

  for (let mask = 0; mask < combinations; mask += 1) {
    const solution = Array.from({ length: size }, (_, index) => (mask >> index) & 1);
    const value = evaluate(matrix, solution);

    if (value < bestValue) {
      bestValue = value;
      bestSolution = solution;
    }
  }

  return {
    solution: bestSolution,
    objectiveValue: bestValue,
  };
}

app.post("/optimize/qubo", (request, response) => {
  const problem = validateQuboProblem(request.body.problem);
  const paymentSignature = request.header("PAYMENT-SIGNATURE");

  if (!paymentSignature) {
    const paymentRequired = {
      x402Version: 2,
      resource: {
        url: RESOURCE,
        description: "Pay-per-solve QUBO optimization",
        mimeType: "application/json",
      },
      accepts: [
        {
          scheme: "exact",
          network: NETWORK,
          amount: PRICE,
          asset: ASSET,
          payTo: PAY_TO,
          resource: RESOURCE,
        },
      ],
    };

    response.status(402).set("PAYMENT-REQUIRED", encodeBase64Json(paymentRequired)).json({
      error: "Payment required",
    });
    return;
  }

  // Offline demonstration only:
  // this does not verify or settle a real blockchain payment.
  if (paymentSignature !== "demo-payment-signature") {
    response.status(402).json({
      error: "Invalid demonstration payment signature",
    });
    return;
  }

  const reference = solveReference(problem.matrix);
  const problemHash = createHash("sha256").update(JSON.stringify(problem)).digest("hex");

  response
    .status(200)
    .set(
      "PAYMENT-RESPONSE",
      encodeBase64Json({
        success: true,
        transaction: "offline-demo",
        network: NETWORK,
        problemHash,
      }),
    )
    .json({
      jobId: randomUUID(),
      status: "completed",
      solution: reference.solution,
      objectiveValue: reference.objectiveValue,
      classicalObjective: reference.objectiveValue,
      optimalityGap: 0,
      backend: "offline-qopt-demo",
      backendType: "mock-quantum-simulator",
    });
});

app.listen(PORT, () => {
  console.log(`QOpt x402 demonstration server: http://localhost:${PORT}`);
});
