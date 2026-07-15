import { log } from "./logger.js";

export class MossError extends Error {
  constructor(public code: string, public message: string) {
    super(message);
    this.name = "MossError";
  }
}

export const handleError = (error: unknown, context: string): never => {
  log.error(`${context}:`);
  if (error instanceof MossError) {
    log.error(`  Code: ${error.code}`);
    log.error(`  Message: ${error.message}`);
  } else if (error instanceof Error) {
    log.error(`  Message: ${error.message}`);
    log.error(`  Stack: ${error.stack?.slice(0, 200)}`);
  } else {
    log.error(`  Unknown error: ${String(error)}`);
  }
  log.divider();
  process.exit(1);
};

export const validateAmount = (amount: string): void => {
  const num = parseFloat(amount);
  if (isNaN(num) || num <= 0) {
    throw new MossError("INVALID_AMOUNT", `Amount must be a positive number: ${amount}`);
  }
};

export const validateToken = (token: string): void => {
  const allowedTokens = ["MON", "USDC", "AUSD", "WMON"];
  if (!allowedTokens.includes(token.toUpperCase())) {
    throw new MossError(
      "INVALID_TOKEN",
      `Token must be one of: ${allowedTokens.join(", ")}. Got: ${token}`,
    );
  }
};

export const validateAddress = (address: string): void => {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new MossError("INVALID_ADDRESS", `Invalid address format: ${address}`);
  }
};
