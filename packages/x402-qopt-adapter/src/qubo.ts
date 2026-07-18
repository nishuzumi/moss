import { type QuboProblem, quboProblemSchema } from "./types.js";

export function validateQuboProblem(input: unknown): QuboProblem {
  const problem = quboProblemSchema.parse(input);
  const size = problem.matrix.length;

  for (const row of problem.matrix) {
    if (row.length !== size) {
      throw new Error("QUBO matrix must be square");
    }
  }

  return problem;
}
