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
  ProtocolFactory,
  ProtocolFactorySource,
  ProtocolRef,
  ReceiptNames,
  Receipt as ReceiptResult,
  RiskLabel,
  Verb,
} from "./types.js";
import { PROTOCOL_FACTORY_TARGET } from "./types.js";

export interface ContractConfig {
  abi: Abi;
  addr: Address;
}

export type ProtocolCtor = new () => object;
export type ProtocolDependency = ProtocolCtor | ProtocolFactorySource;
export type ProtocolDependencies = Record<string, ProtocolDependency>;
type InjectedProtocols<Dependencies extends ProtocolDependencies> = {
  [K in keyof Dependencies]: Dependencies[K] extends ProtocolCtor
    ? ProtocolRef<InstanceType<Dependencies[K]>>
    : Dependencies[K] extends ProtocolFactorySource
      ? ProtocolFactory<Dependencies[K]>
      : never;
};

export interface ProtocolBinding<Binding extends ParamsSpec = ParamsSpec> {
  params: Binding;
  contracts: (binding: InferParams<Binding>) => Record<string, ContractConfig>;
}

export interface ProtocolConfig<
  Dependencies extends ProtocolDependencies = Record<never, never>,
  Binding extends ParamsSpec = ParamsSpec,
> {
  name: string;
  category: Category;
  description: string;
  contracts: Record<string, ContractConfig>;
  binding?: ProtocolBinding<Binding>;
  protocols?: Dependencies;
}

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

export function Protocol<
  Dependencies extends ProtocolDependencies = Record<never, never>,
  Binding extends ParamsSpec = ParamsSpec,
>(config: ProtocolConfig<Dependencies, Binding>) {
  if (!/^[a-z][a-z0-9-]*$/.test(config.name)) {
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
        const [runtime, account, dependencies = {}, binding] = args as [
          MossRuntime,
          Address,
          Record<string, object>?,
          InferParams<Binding>?,
        ];
        if (!runtime?.client || !account) {
          throw new Error(`protocol "${config.name}" must be constructed by Registry`);
        }
        if (config.binding && binding === undefined) {
          throw new Error(`protocol "${config.name}" requires a binding`);
        }
        if (!config.binding && binding !== undefined) {
          throw new Error(`protocol "${config.name}" does not accept a binding`);
        }
        const dynamicContracts =
          config.binding && binding !== undefined ? config.binding.contracts(binding) : undefined;
        if (
          dynamicContracts !== undefined &&
          (typeof dynamicContracts !== "object" || dynamicContracts === null)
        ) {
          throw new Error(`protocol "${config.name}" binding contracts must return an object`);
        }
        if (typeof Reflect.get(dynamicContracts ?? {}, "then") === "function") {
          throw new Error(`protocol "${config.name}" binding contracts must be synchronous`);
        }
        for (const key of Object.keys(dynamicContracts ?? {})) {
          if (Object.hasOwn(config.contracts, key)) {
            throw new Error(`protocol "${config.name}" declares contract "${key}" twice`);
          }
        }
        for (const [key, contract] of Object.entries({
          ...config.contracts,
          ...dynamicContracts,
        })) {
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

export function protocolFactory<ProtocolInstance extends object, Binding extends ParamsSpec>(
  ctor: new () => ProtocolInstance,
  binding: Binding,
): ProtocolFactorySource<ProtocolInstance, InferParams<Binding>> {
  const config = (ctor as unknown as Record<symbol, ProtocolConfig | undefined>)[PROTOCOL_META];
  if (!config) throw new Error(`${ctor.name} is not decorated with @Protocol`);
  if (config.binding?.params !== binding) {
    throw new Error(`protocol "${config.name}" factory must use its declared binding schema`);
  }
  return Object.freeze({
    [PROTOCOL_FACTORY_TARGET]: ctor,
  });
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
