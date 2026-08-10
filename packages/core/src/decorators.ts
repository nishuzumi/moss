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
  Receipt as ParsedReceipt,
  ProtocolRef,
  ReceiptResult,
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
  /**
   * Human explanations for custom errors declared by any of this Protocol's contract ABIs, keyed by
   * error name. `{argName}` reads that argument's decoded value; since the rendered identity already
   * lists every argument, prefer framing a value over restating it.
   *
   * Scoped by name only: two deployments declaring the same error name share one explanation even
   * where their signatures differ.
   */
  customErrorMessages?: Readonly<Record<string, string>>;
  /**
   * Human explanations for `require(cond, "...")` reverts, keyed by the exact message emitted.
   * Protocols that compile those down to a few characters — Uniswap V3's `LOK`, `AS`, `T` — are the
   * reason this exists, since the message is all that identifies which check failed.
   *
   * Unlike a custom error name, a payload appears in no ABI, so Registry can only require it to be
   * text. A Protocol declaring one owns a test proving the literal appears in its pinned vendored
   * source.
   */
  stringRevertMessages?: Readonly<Record<string, string>>;
  labels?: Record<string, Address>;
  protocols?: Dependencies;
}

type ReceiptNames<This> = {
  [K in keyof This]: This[K] extends (changes: readonly Change[]) => infer Result
    ? Result extends ParsedReceipt<JsonSafeValue>
      ? never
      : Result extends ReceiptResult<JsonSafeValue>
        ? K
        : never
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

/** Injected by core on every Protocol instance; a Protocol may only declare it. */
export const SELF_KEY = "self";

/**
 * Rejects a Protocol that initialized `self` itself. `super()` runs the base
 * class field initializers, so without this the injected reference would
 * silently replace the field. An erased `declare self` leaves no own property
 * and stays valid.
 */
export function requireUnclaimedSelf(instance: object, protocol: string): void {
  if (Object.hasOwn(instance, SELF_KEY)) {
    throw new Error(
      `protocol "${protocol}" must leave "${SELF_KEY}" to core; declare it as "declare self", not an initialized field`,
    );
  }
}

export function Protocol<Dependencies extends ProtocolDependencies = Record<never, never>>(
  config: ProtocolConfig<Dependencies>,
) {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(config.name)) {
    throw new Error(`protocol name "${config.name}" must be a lowercase slug`);
  }
  for (const [group, keys] of [
    ["contract", Object.keys(config.contracts ?? {})],
    ["dependency", Object.keys(config.protocols ?? {})],
  ] as const) {
    if (keys.includes(SELF_KEY)) {
      throw new Error(
        `protocol "${config.name}" cannot declare a ${group} named "${SELF_KEY}"; core injects it as the Protocol's own Capability reference`,
      );
    }
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
        const [runtime, account, dependencies = {}, self] = args as [
          MossRuntime,
          Address,
          Record<string, object>?,
          object?,
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
        requireUnclaimedSelf(this, config.name);
        if (self) Object.defineProperty(this, SELF_KEY, { value: self, writable: false });
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
    method: Method & (ReturnType<Method> extends ParsedReceipt<JsonSafeValue> ? never : unknown),
    context: ClassMethodDecoratorContext<This, Method>,
  ): void => {
    if (context.kind !== "method" || context.static) {
      throw new Error("@Receipt decorates instance methods");
    }
    Object.defineProperty(method, RECEIPT_META, { value: true });
  };
}

/** Core-identified Receipt returned by Registry and injected Receipt dependencies. */
export type Receipt<TOutcome extends JsonSafeValue = JsonSafeValue> = ParsedReceipt<TOutcome>;
