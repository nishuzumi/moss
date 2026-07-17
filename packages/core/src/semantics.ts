import { isAddress, type Address as ViemAddress } from "viem";
import { z } from "zod/v4";
import { type JsonSafeValue, NATIVE, type TokenRef } from "./types.js";

export type Address = ViemAddress;

export interface ParameterDeclaration<T extends z.ZodType = z.ZodType> {
  type: T;
  description: string;
}

export type ParamsSpec = Record<string, ParameterDeclaration>;

export type InferParams<S extends ParamsSpec> = {
  [K in keyof S]: z.output<S[K]["type"]>;
};

export class ParameterError extends Error {
  constructor(message: string) {
    super(`invalid parameters: ${message}`);
    this.name = "ParameterError";
  }
}

export class BindingError extends Error {
  constructor(message: string) {
    super(`invalid binding: ${message}`);
    this.name = "BindingError";
  }
}

export const Address = z
  .string()
  .refine((value) => isAddress(value, { strict: false }), "Expected a 20-byte 0x address.")
  .describe(
    "A 20-byte EVM address encoded as a 0x-prefixed hexadecimal string.",
  ) as z.ZodType<ViemAddress>;

export const TokenReference = z
  .union([Address, z.literal(NATIVE)])
  .describe('An EVM token address or the literal "native" for native MON.') as z.ZodType<TokenRef>;

export const PositiveDecimalString = z
  .string()
  .regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/, "Expected a decimal string.")
  .refine((value) => /[1-9]/.test(value), "Expected a positive value.")
  .describe('A positive base-10 decimal string, such as "1" or "1.5".');

export const UnsignedIntegerString = z
  .string()
  .regex(/^(?:0|[1-9]\d*)$/, "Expected a non-negative integer string.")
  .describe('A non-negative base-10 integer string, such as "0" or "42".');

export const BasisPoints = z
  .number()
  .int()
  .min(0)
  .max(10_000)
  .describe("An integer basis-point count from 0 through 10000; 1 bps equals 0.01%.");

export async function parseParams<S extends ParamsSpec>(
  spec: S,
  raw: Record<string, unknown>,
): Promise<InferParams<S>> {
  const schema = z
    .object(Object.fromEntries(Object.entries(spec).map(([name, field]) => [name, field.type])))
    .strict();
  const result = await schema.safeParseAsync(raw);
  if (!result.success) {
    throw new ParameterError(z.prettifyError(result.error));
  }
  return result.data as InferParams<S>;
}

/**
 * Parse Protocol identity synchronously before any Protocol is constructed.
 * Async refinements are intentionally unsupported: binding validation must be
 * externally pure and cannot depend on RPC or other asynchronous state.
 */
export function parseBinding<S extends ParamsSpec>(
  spec: S,
  raw: Record<string, unknown>,
): InferParams<S> {
  const schema = z
    .object(Object.fromEntries(Object.entries(spec).map(([name, field]) => [name, field.type])))
    .strict();
  let result: z.ZodSafeParseResult<Record<string, unknown>>;
  try {
    result = schema.safeParse(raw);
  } catch (error) {
    throw new BindingError(
      error instanceof Error && error.message.includes("Encountered Promise")
        ? "binding schemas must be synchronous"
        : error instanceof Error
          ? error.message
          : String(error),
    );
  }
  if (!result.success) {
    throw new BindingError(z.prettifyError(result.error));
  }
  return result.data as InferParams<S>;
}

export function describeParams(
  spec: ParamsSpec,
): Record<string, { type: JsonSafeValue; description: string }> {
  return Object.fromEntries(
    Object.entries(spec).map(([name, field]) => [
      name,
      {
        type: z.toJSONSchema(field.type) as JsonSafeValue,
        description: field.description,
      },
    ]),
  );
}

export function parameterTypeDescription(type: z.ZodType): string | undefined {
  const description = z.toJSONSchema(type).description;
  return typeof description === "string" ? description : undefined;
}
