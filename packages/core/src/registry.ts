import { isAddress } from "viem";
import {
  METHOD_META,
  type MethodMeta,
  PROTOCOL_META,
  PROTOCOL_TARGET,
  type ProtocolConfig,
  type ProtocolCtor,
  type ProtocolDependencies,
  RECEIPT_META,
} from "./decorators.js";
import { flattenCapabilityTree, toJsonSafe, verifyReceiptCoverage } from "./framework.js";
import type { MossRuntime } from "./runtime.js";
import { describeParams, parameterTypeDescription, parseParams } from "./semantics.js";
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
import { CATEGORIES, RISK_LABELS, VERBS } from "./types.js";

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
  params: Record<string, LoadedParameter>;
}

export interface QueryResult {
  kind: "query";
  protocol: string;
  method: string;
  data: JsonSafeValue;
}

export interface TrustedToken {
  address: Address;
  label: string;
}

export interface RegistryOptions {
  trustedTokens?: readonly TrustedToken[];
}

interface Registered {
  ctor: ProtocolCtor;
  receiptCtor: ProtocolCtor;
  config: ProtocolConfig<ProtocolDependencies>;
  methods: Record<string, MethodMeta>;
  receipts: Set<string>;
  packageLabels: ReadonlyMap<string, string>;
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

function requireMetadataText(value: unknown, path: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${path} must be a non-empty string`);
  }
}

const SAFE_LABEL = /^[A-Za-z0-9 ._-]{1,32}$/;
const ADDRESS_IN_TEXT = /(?<![0-9a-f])0x[0-9a-f]{40}(?![0-9a-f])/gi;

function collectLabels(
  entries: Iterable<readonly [name: string, address: Address]>,
  provenance: "Trusted" | "Package",
  owner: string,
  prefix = "",
): ReadonlyMap<string, string> {
  const labels = new Map<string, string>();
  for (const [name, address] of entries) {
    const effectiveName = `${prefix}${name}`;
    if (!SAFE_LABEL.test(effectiveName)) {
      throw new Error(`${owner} ${provenance} label must be a 1-32 character safe name`);
    }
    if (!isAddress(address, { strict: false })) {
      throw new Error(`${owner} ${provenance} label has an invalid address`);
    }
    const key = address.toLowerCase();
    if (labels.has(key)) {
      throw new Error(`${owner} assigns multiple ${provenance} names to address "${address}"`);
    }
    labels.set(key, effectiveName);
  }
  return labels;
}

function titleCaseSlug(slug: string): string {
  return slug
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function renderReceipt(receipt: Receipt, renderText: (text: string) => string): Receipt {
  return {
    ...receipt,
    text: renderText(receipt.text),
    changes: receipt.changes.map((child) =>
      child.kind === "receipt"
        ? renderReceipt(child, renderText)
        : { ...child, text: renderText(child.text) },
    ),
  };
}

export class Registry {
  #protocols = new Map<string, Registered>();
  #trustedLabels: ReadonlyMap<string, string>;
  readonly runtime: MossRuntime;

  constructor(runtime: MossRuntime, options: RegistryOptions = {}) {
    this.runtime = runtime;
    this.#trustedLabels = collectLabels(
      (options.trustedTokens ?? []).map(({ address, label }) => [label, address]),
      "Trusted",
      "trusted token catalog",
    );
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
    const packageLabels = collectLabels(
      Object.entries(config.labels ?? {}),
      "Package",
      `protocol "${config.name}"`,
      `${titleCaseSlug(config.name)} `,
    );
    for (const dependency of Object.values(config.protocols ?? {})) {
      this.register(dependency, [...stack, config.name]);
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
      for (const [param, field] of Object.entries(meta.spec.params)) {
        requireMetadataText(
          field.description,
          `parameter "${config.name}.${name}.${param}" description`,
        );
        if (!field.type || typeof field.type.safeParseAsync !== "function") {
          throw new Error(`parameter "${config.name}.${name}.${param}" has an invalid type`);
        }
        requireMetadataText(
          parameterTypeDescription(field.type),
          `parameter "${config.name}.${name}.${param}" type description`,
        );
      }
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
    this.#protocols.set(config.name, {
      ctor,
      receiptCtor,
      config,
      methods,
      receipts,
      packageLabels,
    });
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
        params: describeParams(meta.spec.params),
      };
    });
  }

  async action(
    protocol: string,
    method: string,
    account: Address,
    rawParams: Record<string, unknown>,
  ): Promise<QueryResult | CapabilityNode> {
    const meta = this.#get(protocol).methods[method];
    if (!meta) throw new Error(`protocol "${protocol}" has no method "${method}"`);
    if (meta.kind === "query") {
      return {
        kind: "query",
        protocol,
        method,
        data: await this.#runQuery(protocol, method, account, rawParams),
      };
    }
    return this.#buildCapability(protocol, method, account, rawParams);
  }

  parseReceipt(node: CapabilityNode, changes: readonly Change[]): Receipt {
    flattenCapabilityTree(node);
    const meta = this.#capabilityMeta(node.protocol, node.method);
    return renderReceipt(
      this.#runReceipt(node.protocol, meta.spec.receipt, changes),
      this.#createTextRenderer(node.protocol),
    );
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
  ): Promise<CapabilityNode> {
    const registered = this.#get(protocol);
    const meta = registered.methods[method];
    if (meta?.kind !== "capability") {
      throw new Error(`"${protocol}.${method}" is not a Capability`);
    }
    const params = await parseParams(meta.spec.params, rawParams);
    const instance = this.#instantiate(protocol, account);
    // biome-ignore lint/suspicious/noExplicitAny: metadata validates dynamic method dispatch
    const result = (await (instance as any)[method](params, { account } satisfies ActionCtx)) as
      | CapabilityResult
      | undefined;
    const children = Array.isArray(result) ? result : result ? [result] : [];
    const node: CapabilityNode = {
      kind: "capability",
      protocol,
      method,
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
  ): Promise<JsonSafeValue> {
    const registered = this.#get(protocol);
    const meta = registered.methods[method];
    if (meta?.kind !== "query") throw new Error(`"${protocol}.${method}" is not a Query`);
    const params = await parseParams(meta.spec.params, rawParams);
    const instance = this.#instantiate(protocol, account);
    // biome-ignore lint/suspicious/noExplicitAny: metadata validates dynamic method dispatch
    return toJsonSafe(await (instance as any)[method](params, { account } satisfies ActionCtx));
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
      const name = configOf(dependency)?.name;
      if (!name) throw new Error(`protocol "${protocol}" has an undecorated dependency`);
      Object.defineProperty(instance, key, {
        value: this.#receiptDependency(name),
        writable: false,
      });
    }
    return instance;
  }

  #instantiate(protocol: string, account: Address): object {
    const registered = this.#get(protocol);
    const dependencies = Object.fromEntries(
      Object.entries(registered.config.protocols ?? {}).map(([key, dependency]) => {
        const name = configOf(dependency)?.name;
        if (!name) throw new Error(`protocol "${protocol}" has an undecorated dependency`);
        return [key, this.#dependency(name, account)];
      }),
    );
    const Ctor = registered.ctor as unknown as new (
      runtime: MossRuntime,
      account: Address,
      dependencies: Record<string, object>,
    ) => object;
    return new Ctor(this.runtime, account, dependencies);
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

  #createTextRenderer(protocol: string): (text: string) => string {
    const root = this.#get(protocol);
    const dependencies = new Map<string, string | null>();
    const visited = new Set<string>();
    const visit = (registered: Registered): void => {
      for (const dependency of Object.values(registered.config.protocols ?? {})) {
        const name = configOf(dependency)?.name;
        if (!name || visited.has(name)) continue;
        visited.add(name);
        const visible = this.#get(name);
        for (const [address, label] of visible.packageLabels) {
          dependencies.set(address, dependencies.has(address) ? null : label);
        }
        visit(visible);
      }
    };
    visit(root);

    return (text) =>
      text.replace(ADDRESS_IN_TEXT, (address) => {
        const key = address.toLowerCase();
        return (
          this.#trustedLabels.get(key) ??
          root.packageLabels.get(key) ??
          dependencies.get(key) ??
          address
        );
      });
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
