import {
  METHOD_META,
  type MethodMeta,
  PROTOCOL_META,
  PROTOCOL_TARGET,
  type ProtocolConfig,
  type ProtocolCtor,
  type ProtocolDependencies,
  type ProtocolDependency,
  RECEIPT_META,
} from "./decorators.js";
import { flattenCapabilityTree, toJsonSafe, verifyReceiptCoverage } from "./framework.js";
import type { MossRuntime } from "./runtime.js";
import {
  describeParams,
  type ParamsSpec,
  parameterTypeDescription,
  parseBinding,
  parseParams,
} from "./semantics.js";
import type {
  Address,
  CapabilityNode,
  CapabilityResult,
  Category,
  Change,
  JsonSafeValue,
  Receipt,
  RiskLabel,
  Verb,
} from "./types.js";
import {
  CATEGORIES,
  PROTOCOL_FACTORY_TARGET,
  type ProtocolFactorySource,
  RISK_LABELS,
  VERBS,
} from "./types.js";

export interface ActionCtx {
  account: Address;
}

export interface Coordinate {
  protocol: string;
  method: string;
  kind: "capability" | "query";
  verb?: Verb;
  category: Category;
  tags: string[];
  summary: string;
}

export interface LoadedParameter {
  type: JsonSafeValue;
  description: string;
}

export interface Stub {
  protocol: string;
  method: string;
  kind: "capability" | "query";
  intent: string;
  verb?: Verb;
  category: Category;
  risk: RiskLabel[];
  tags: string[];
  binding?: Record<string, LoadedParameter>;
  params: Record<string, LoadedParameter>;
}

export interface QueryResult {
  kind: "query";
  protocol: string;
  method: string;
  data: JsonSafeValue;
}

interface Registered {
  ctor: ProtocolCtor;
  receiptCtor: ProtocolCtor;
  config: ProtocolConfig<ProtocolDependencies>;
  methods: Record<string, MethodMeta>;
  receipts: Set<string>;
}

type CapabilityMethodMeta = Extract<MethodMeta, { kind: "capability" }>;

export type ProtocolSource = ProtocolCtor | Record<string, unknown>;

function configOf(value: unknown): ProtocolConfig<ProtocolDependencies> | undefined {
  if (typeof value !== "function") return undefined;
  if (!Object.hasOwn(value, PROTOCOL_META)) return undefined;
  return (value as unknown as Record<symbol, ProtocolConfig<ProtocolDependencies> | undefined>)[
    PROTOCOL_META
  ];
}

function isFactorySource(value: ProtocolDependency): value is ProtocolFactorySource {
  return typeof value === "object" && Object.hasOwn(value, PROTOCOL_FACTORY_TARGET);
}

function dependencyCtor(value: ProtocolDependency): ProtocolCtor {
  return isFactorySource(value) ? value[PROTOCOL_FACTORY_TARGET] : value;
}

function requireMetadataText(value: unknown, path: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${path} must be a non-empty string`);
  }
}

function validateParams(spec: ParamsSpec, path: string): void {
  for (const [param, field] of Object.entries(spec)) {
    requireMetadataText(field.description, `${path}.${param} description`);
    if (!field.type || typeof field.type.safeParseAsync !== "function") {
      throw new Error(`${path}.${param} has an invalid type`);
    }
    requireMetadataText(parameterTypeDescription(field.type), `${path}.${param} type description`);
  }
}

export class Registry {
  #protocols = new Map<string, Registered>();
  readonly runtime: MossRuntime;

  constructor(runtime: MossRuntime) {
    this.runtime = runtime;
  }

  use(...sources: ProtocolSource[]): this {
    for (const source of sources) {
      if (configOf(source)) {
        this.register(source as ProtocolCtor);
        continue;
      }
      if (!source || typeof source !== "object") {
        throw new Error("Registry.use() expects a decorated Protocol class or module namespace");
      }
      const protocols = [...new Set(Object.values(source).filter((value) => configOf(value)))];
      if (protocols.length === 0) {
        throw new Error("module namespace exports no decorated Protocol classes");
      }
      for (const protocol of protocols) this.register(protocol as ProtocolCtor);
    }
    return this;
  }

  register(ctor: ProtocolCtor, stack: string[] = []): void {
    const config = configOf(ctor);
    if (!config) throw new Error(`${ctor.name} is not decorated with @Protocol`);
    const target = (ctor as unknown as Record<symbol, ProtocolCtor | undefined>)[PROTOCOL_TARGET];
    for (let ancestor = target && Object.getPrototypeOf(target); ancestor; ) {
      if (configOf(ancestor)) {
        throw new Error(
          `protocol "${config.name}" cannot extend another decorated Protocol; declare it as a dependency`,
        );
      }
      ancestor = Object.getPrototypeOf(ancestor);
    }
    requireMetadataText(config.description, `protocol "${config.name}" description`);
    if (!CATEGORIES.includes(config.category)) {
      throw new Error(`protocol "${config.name}" has an invalid category`);
    }
    const existing = this.#protocols.get(config.name);
    if (existing?.ctor === ctor) return;
    if (existing) throw new Error(`protocol "${config.name}" is already registered`);
    if (stack.includes(config.name)) {
      throw new Error(`Protocol dependency cycle: ${[...stack, config.name].join(" -> ")}`);
    }
    if (config.binding) {
      validateParams(config.binding.params, `binding "${config.name}"`);
      if (typeof config.binding.contracts !== "function") {
        throw new Error(`protocol "${config.name}" binding contracts must be a function`);
      }
    }
    for (const dependency of Object.values(config.protocols ?? {})) {
      const dependencyConfig = configOf(dependencyCtor(dependency));
      if (!isFactorySource(dependency) && dependencyConfig?.binding) {
        throw new Error(
          `parameterized protocol "${dependencyConfig.name}" must be declared with protocolFactory()`,
        );
      }
      if (isFactorySource(dependency) && dependencyConfig && !dependencyConfig.binding) {
        throw new Error(`protocol "${dependencyConfig.name}" does not declare a binding`);
      }
      this.register(dependencyCtor(dependency), [...stack, config.name]);
    }

    const methods: Record<string, MethodMeta> = {};
    const receipts = new Set<string>();
    const seenNames = new Set<string>();
    for (
      let prototype = ctor.prototype;
      prototype && prototype !== Object.prototype;
      prototype = Object.getPrototypeOf(prototype)
    ) {
      for (const name of Object.getOwnPropertyNames(prototype)) {
        if (name === "constructor") continue;
        if (seenNames.has(name)) continue;
        seenNames.add(name);
        const method = Object.getOwnPropertyDescriptor(prototype, name)?.value;
        if (typeof method !== "function") continue;
        const markers = method as unknown as Record<symbol, unknown>;
        const meta = markers[METHOD_META] as MethodMeta | undefined;
        if (meta && !Object.hasOwn(methods, name)) methods[name] = meta;
        if (markers[RECEIPT_META]) receipts.add(name);
      }
    }
    if (Object.keys(methods).length === 0) {
      throw new Error(`protocol "${config.name}" declares no @Capability or @Query methods`);
    }
    for (const [name, meta] of Object.entries(methods)) {
      requireMetadataText(meta.spec.intent, `method "${config.name}.${name}" intent`);
      if (meta.spec.tags?.some((tag) => typeof tag !== "string" || tag.trim().length === 0)) {
        throw new Error(`method "${config.name}.${name}" has an invalid tag`);
      }
      validateParams(meta.spec.params, `parameter "${config.name}.${name}"`);
      if (meta.kind !== "capability") continue;
      if (!VERBS.includes(meta.spec.verb)) {
        throw new Error(`capability "${config.name}.${name}" has an invalid verb`);
      }
      if (meta.spec.risk.length === 0) {
        throw new Error(`capability "${config.name}.${name}" must declare a risk label`);
      }
      if (meta.spec.risk.some((risk) => !RISK_LABELS.includes(risk))) {
        throw new Error(`capability "${config.name}.${name}" has an invalid risk label`);
      }
      if (!receipts.has(meta.spec.receipt)) {
        throw new Error(
          `capability "${config.name}.${name}" names "${meta.spec.receipt}", which is not an @Receipt method`,
        );
      }
    }
    const receiptCtor =
      (ctor as unknown as Record<symbol, ProtocolCtor | undefined>)[PROTOCOL_TARGET] ?? ctor;
    this.#protocols.set(config.name, { ctor, receiptCtor, config, methods, receipts });
  }

  discover(filter: { verb?: Verb; category?: Category; protocol?: string } = {}): Coordinate[] {
    const found: Coordinate[] = [];
    for (const { config, methods } of this.#protocols.values()) {
      if (filter.protocol && filter.protocol !== config.name) continue;
      if (filter.category && filter.category !== config.category) continue;
      for (const [method, meta] of Object.entries(methods)) {
        const verb = meta.kind === "capability" ? meta.spec.verb : undefined;
        if (filter.verb && filter.verb !== verb) continue;
        found.push({
          protocol: config.name,
          method,
          kind: meta.kind,
          ...(verb === undefined ? {} : { verb }),
          category: config.category,
          tags: meta.spec.tags ?? [],
          summary: meta.spec.intent,
        });
      }
    }
    return found;
  }

  load(coords: readonly { protocol: string; method: string }[]): Stub[] {
    return coords.map(({ protocol, method }) => {
      const registered = this.#get(protocol);
      const meta = registered.methods[method];
      if (!meta) throw new Error(`protocol "${protocol}" has no method "${method}"`);
      return {
        protocol,
        method,
        kind: meta.kind,
        intent: meta.spec.intent,
        ...(meta.kind === "capability" ? { verb: meta.spec.verb } : {}),
        category: registered.config.category,
        risk: meta.kind === "capability" ? meta.spec.risk : [],
        tags: meta.spec.tags ?? [],
        ...(registered.config.binding
          ? { binding: describeParams(registered.config.binding.params) }
          : {}),
        params: describeParams(meta.spec.params),
      };
    });
  }

  async action(
    protocol: string,
    method: string,
    account: Address,
    rawParams: Record<string, unknown>,
    rawBinding?: Record<string, unknown>,
  ): Promise<QueryResult | CapabilityNode> {
    const meta = this.#get(protocol).methods[method];
    if (!meta) throw new Error(`protocol "${protocol}" has no method "${method}"`);
    if (meta.kind === "query") {
      return {
        kind: "query",
        protocol,
        method,
        data: await this.#runQuery(protocol, method, account, rawParams, rawBinding),
      };
    }
    return this.#buildCapability(protocol, method, account, rawParams, rawBinding);
  }

  parseReceipt(node: CapabilityNode, changes: readonly Change[]): Receipt {
    flattenCapabilityTree(node);
    const meta = this.#capabilityMeta(node.protocol, node.method);
    return this.#runReceipt(node.protocol, meta.spec.receipt, changes);
  }

  validateCapabilityTree(root: CapabilityNode): void {
    for (const { capability } of flattenCapabilityTree(root)) {
      this.#capabilityMeta(capability.protocol, capability.method);
    }
  }

  async #buildCapability(
    protocol: string,
    method: string,
    account: Address,
    rawParams: Record<string, unknown>,
    rawBinding?: Record<string, unknown>,
  ): Promise<CapabilityNode> {
    const registered = this.#get(protocol);
    const meta = registered.methods[method];
    if (meta?.kind !== "capability") {
      throw new Error(`"${protocol}.${method}" is not a Capability`);
    }
    const binding = this.#parseBinding(protocol, rawBinding);
    const params = await parseParams(meta.spec.params, rawParams);
    const instance = this.#instantiate(protocol, account, binding);
    return this.#invokeCapability(protocol, method, account, params, instance, binding);
  }

  async #invokeCapability(
    protocol: string,
    method: string,
    account: Address,
    params: Record<string, unknown>,
    instance: object,
    binding?: Record<string, unknown>,
  ): Promise<CapabilityNode> {
    // biome-ignore lint/suspicious/noExplicitAny: metadata validates dynamic method dispatch
    const result = (await (instance as any)[method](params, { account } satisfies ActionCtx)) as
      | CapabilityResult
      | undefined;
    const children = Array.isArray(result) ? result : result ? [result] : [];
    const node: CapabilityNode = {
      kind: "capability",
      protocol,
      method,
      ...(binding === undefined ? {} : { binding: toJsonSafe(binding) }),
      params: toJsonSafe(params),
      children,
    };
    flattenCapabilityTree(node);
    return node;
  }

  async #runQuery(
    protocol: string,
    method: string,
    account: Address,
    rawParams: Record<string, unknown>,
    rawBinding?: Record<string, unknown>,
  ): Promise<JsonSafeValue> {
    const registered = this.#get(protocol);
    const meta = registered.methods[method];
    if (meta?.kind !== "query") throw new Error(`"${protocol}.${method}" is not a Query`);
    const binding = this.#parseBinding(protocol, rawBinding);
    const params = await parseParams(meta.spec.params, rawParams);
    const instance = this.#instantiate(protocol, account, binding);
    return this.#invokeQuery(method, account, params, instance);
  }

  async #invokeQuery(
    method: string,
    account: Address,
    params: Record<string, unknown>,
    instance: object,
  ): Promise<JsonSafeValue> {
    // biome-ignore lint/suspicious/noExplicitAny: metadata validates dynamic method dispatch
    return toJsonSafe(await (instance as any)[method](params, { account } satisfies ActionCtx));
  }

  #parseBinding(
    protocol: string,
    rawBinding?: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    const binding = this.#get(protocol).config.binding;
    if (!binding) {
      if (rawBinding !== undefined) {
        throw new TypeError(`invalid binding: protocol "${protocol}" does not accept one`);
      }
      return undefined;
    }
    if (rawBinding === undefined) {
      throw new TypeError(`invalid binding: protocol "${protocol}" requires one`);
    }
    return parseBinding(binding.params, rawBinding);
  }

  #runReceipt(protocol: string, receiptName: string, changes: readonly Change[]): Receipt {
    const registered = this.#get(protocol);
    if (!registered.receipts.has(receiptName)) {
      throw new Error(`protocol "${protocol}" has no Receipt "${receiptName}"`);
    }
    const instance = this.#instantiateReceipt(protocol);
    // biome-ignore lint/suspicious/noExplicitAny: registration validates Receipt dispatch
    const receipt = (instance as any)[receiptName](changes) as Receipt;
    verifyReceiptCoverage(changes, receipt);
    return receipt;
  }

  #instantiateReceipt(protocol: string): object {
    const registered = this.#get(protocol);
    const ReceiptCtor = registered.receiptCtor as unknown as new () => object;
    const instance = new ReceiptCtor();
    for (const [key, dependency] of Object.entries(registered.config.protocols ?? {})) {
      const name = configOf(dependencyCtor(dependency))?.name;
      if (!name) throw new Error(`protocol "${protocol}" has an undecorated dependency`);
      Object.defineProperty(instance, key, {
        value: isFactorySource(dependency)
          ? Object.freeze({ receipts: this.#receiptDependency(name) })
          : this.#receiptDependency(name),
        writable: false,
      });
    }
    return instance;
  }

  #instantiate(protocol: string, account: Address, binding?: Record<string, unknown>): object {
    const registered = this.#get(protocol);
    const dependencies = Object.fromEntries(
      Object.entries(registered.config.protocols ?? {}).map(([key, dependency]) => {
        const name = configOf(dependencyCtor(dependency))?.name;
        if (!name) throw new Error(`protocol "${protocol}" has an undecorated dependency`);
        return [
          key,
          isFactorySource(dependency)
            ? this.#factoryDependency(name, account)
            : this.#dependency(name, account),
        ];
      }),
    );
    const Ctor = registered.ctor as unknown as new (
      runtime: MossRuntime,
      account: Address,
      dependencies: Record<string, object>,
      binding?: Record<string, unknown>,
    ) => object;
    return new Ctor(this.runtime, account, dependencies, binding);
  }

  #dependency(protocol: string, account: Address): object {
    const registered = this.#get(protocol);
    const dependency: Record<string, unknown> = {};
    for (const [method, meta] of Object.entries(registered.methods)) {
      dependency[method] =
        meta.kind === "capability"
          ? (params: Record<string, unknown>) =>
              this.#buildCapability(protocol, method, account, params)
          : (params: Record<string, unknown>) => this.#runQuery(protocol, method, account, params);
    }
    for (const receipt of registered.receipts) {
      dependency[receipt] = (changes: readonly Change[]) =>
        this.#runReceipt(protocol, receipt, changes);
    }
    return Object.freeze(dependency);
  }

  #factoryDependency(protocol: string, account: Address): object {
    return Object.freeze({
      create: (rawBinding: Record<string, unknown>) => {
        const binding = this.#parseBinding(protocol, rawBinding);
        if (!binding) throw new Error(`protocol "${protocol}" does not declare a binding`);
        return this.#boundReference(protocol, account, binding);
      },
      receipts: this.#receiptDependency(protocol),
    });
  }

  #boundReference(protocol: string, account: Address, binding: Record<string, unknown>): object {
    const registered = this.#get(protocol);
    const instance = this.#instantiate(protocol, account, binding);
    const reference: Record<string, unknown> = {};
    for (const [method, meta] of Object.entries(registered.methods)) {
      reference[method] = async (rawParams: Record<string, unknown>) => {
        const params = await parseParams(meta.spec.params, rawParams);
        return meta.kind === "capability"
          ? this.#invokeCapability(protocol, method, account, params, instance, binding)
          : this.#invokeQuery(method, account, params, instance);
      };
    }
    return Object.freeze(reference);
  }

  #receiptDependency(protocol: string): object {
    const dependency: Record<string, unknown> = {};
    for (const receipt of this.#get(protocol).receipts) {
      dependency[receipt] = (changes: readonly Change[]) =>
        this.#runReceipt(protocol, receipt, changes);
    }
    return Object.freeze(dependency);
  }

  #capabilityMeta(protocol: string, method: string): CapabilityMethodMeta {
    const meta = this.#get(protocol).methods[method];
    if (meta?.kind !== "capability") {
      throw new Error(`unknown capability "${protocol}.${method}"`);
    }
    return meta;
  }

  #get(protocol: string): Registered {
    const registered = this.#protocols.get(protocol);
    if (!registered) {
      throw new Error(
        `unknown protocol "${protocol}" (registered: ${[...this.#protocols.keys()].join(", ")})`,
      );
    }
    return registered;
  }
}
