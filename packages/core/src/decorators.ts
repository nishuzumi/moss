import type { Abi } from "viem";
import { createHandle } from "./handle.js";
import type { MossRuntime } from "./runtime.js";
import type { InferParams, ParamsSpec } from "./semantics.js";
import type {
  Address,
  CapabilityResult,
  Category,
  Change,
  JsonSafeValue,
  ProtocolRef,
  Receipt as ReceiptResult,
  RiskLabel,
  Verb,
} from "./types.js";

export interface ContractConfig {
  abi: Abi;
  addr: Address;
}

export type ProtocolCtor = new () => object;
export type ProtocolDependencies = Record<string, ProtocolCtor>;
type InjectedProtocols<Dependencies extends ProtocolDependencies> = {
  [K in keyof Dependencies]: ProtocolRef<InstanceType<Dependencies[K]>>;
};

export interface ProtocolConfig<Dependencies extends ProtocolDependencies = Record<never, never>> {
  name: string;
  category: Category;
  description: string;
  contracts: Record<string, ContractConfig>;
  labels?: Record<string, Address>;
  protocols?: Dependencies;
}

type ReceiptNames<This> = {
  [K in keyof This]: This[K] extends (changes: readonly Change[]) => ReceiptResult<JsonSafeValue>
    ? K
    : never;
}[keyof This] &
  string;

export interface CapabilitySpec<This, Params extends ParamsSpec = ParamsSpec> {
  intent: string;
  verb: Verb;
  params: Params;
  receipt: ReceiptNames<This>;
  risk: RiskLabel[];
  tags?: string[];
}

export interface QuerySpec<Params extends ParamsSpec = ParamsSpec> {
  intent: string;
  params: Params;
  tags?: string[];
}

export type MethodMeta =
  | { kind: "capability"; spec: CapabilitySpec<object> }
  | { kind: "query"; spec: QuerySpec };

export const PROTOCOL_META = Symbol.for("moss.protocol");
export const PROTOCOL_TARGET = Symbol.for("moss.protocol.target");
export const METHOD_META = Symbol.for("moss.method");
export const RECEIPT_META = Symbol.for("moss.receipt");

export function Protocol<Dependencies extends ProtocolDependencies = Record<never, never>>(
  config: ProtocolConfig<Dependencies>,
) {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(config.name)) {
    throw new Error(`protocol name "${config.name}" must be a lowercase slug`);
  }
  return <T extends new () => object & InjectedProtocols<Dependencies>>(
    target: T,
    context: ClassDecoratorContext<T>,
  ): T => {
    if (context.kind !== "class") throw new Error("@Protocol decorates classes");
    const Base = target as new () => object;
    const injected = class extends Base {
      constructor(...args: unknown[]) {
        super();
        const [runtime, account, dependencies = {}] = args as [
          MossRuntime,
          Address,
          Record<string, object>?,
        ];
        if (!runtime?.client || !account) {
          throw new Error(`protocol "${config.name}" must be constructed by Registry`);
        }
        for (const [key, contract] of Object.entries(config.contracts)) {
          Object.defineProperty(this, key, {
            value: createHandle(contract.abi, contract.addr, runtime.client, account),
            writable: false,
          });
        }
        Object.defineProperty(this, "runtime", { value: runtime, writable: false });
        for (const key of Object.keys(config.protocols ?? {})) {
          const dependency = dependencies[key];
          if (!dependency) {
            throw new Error(`protocol "${config.name}" dependency "${key}" was not injected`);
          }
          Object.defineProperty(this, key, { value: dependency, writable: false });
        }
      }
    };
    Object.defineProperty(injected, "name", { value: target.name });
    Object.defineProperty(injected, PROTOCOL_META, { value: config });
    Object.defineProperty(injected, PROTOCOL_TARGET, { value: target });
    return injected as unknown as T;
  };
}

function recordMethod(
  method: (...args: never[]) => unknown,
  context: ClassMethodDecoratorContext,
  kind: MethodMeta["kind"],
  spec: CapabilitySpec<object> | QuerySpec,
): void {
  if (context.kind !== "method" || context.static) {
    throw new Error(`@${kind === "capability" ? "Capability" : "Query"} decorates methods`);
  }
  Object.defineProperty(method, METHOD_META, { value: { kind, spec } as MethodMeta });
}

type CapabilityMethod<Params extends ParamsSpec> = (
  params: InferParams<Params>,
  context: { account: Address },
) => CapabilityResult | Promise<CapabilityResult>;

type QueryMethod<Params extends ParamsSpec> = (
  params: InferParams<Params>,
  context: { account: Address },
) => unknown;

export function Capability<This, Params extends ParamsSpec>(spec: CapabilitySpec<This, Params>) {
  return <Method extends CapabilityMethod<Params>>(
    method: Method,
    context: ClassMethodDecoratorContext<This, Method>,
  ): void => {
    recordMethod(
      method,
      context as ClassMethodDecoratorContext,
      "capability",
      spec as unknown as CapabilitySpec<object>,
    );
  };
}

export function Query<Params extends ParamsSpec>(spec: QuerySpec<Params>) {
  return <This, Method extends QueryMethod<Params>>(
    method: Method,
    context: ClassMethodDecoratorContext<This, Method>,
  ): void => {
    recordMethod(method, context as ClassMethodDecoratorContext, "query", spec);
  };
}

export function Receipt() {
  return <This, Method extends (changes: readonly Change[]) => ReceiptResult<JsonSafeValue>>(
    method: Method,
    context: ClassMethodDecoratorContext<This, Method>,
  ): void => {
    if (context.kind !== "method" || context.static) {
      throw new Error("@Receipt decorates instance methods");
    }
    Object.defineProperty(method, RECEIPT_META, { value: true });
  };
}

/** Result type returned by a method decorated with `@Receipt()`. */
export type Receipt<TOutcome extends JsonSafeValue = JsonSafeValue> = ReceiptResult<TOutcome>;
