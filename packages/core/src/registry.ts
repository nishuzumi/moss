import { decodeEventLog } from "viem";
import {
  METHOD_META,
  type MethodMeta,
  PROTOCOL_META,
  type ProtocolConfig,
  type ProtocolCtor,
} from "./decorators.js";
import type { ProtocolPackage } from "./manifest.js";
import {
  type DealerFn,
  type DecodedEvent,
  EVENT_META,
  type EventMeta,
  type ObserveCtx,
  type ObserverHook,
  type PlanObservation,
} from "./observe.js";
import { finalizePlan, type PlanDraft } from "./plan.js";
import type { MossRuntime } from "./runtime.js";
import { decodeParams } from "./semantics.js";
import type { TokenSource } from "./token.js";
import { TokenTable } from "./tokens.js";
import type { Address, Category, Plan, RiskLabel, Verb } from "./types.js";

/** Second argument to every capability/query method: the caller's identity. */
export interface ActionCtx {
  /** The account `action` was called for — the sender of every plan tx. */
  account: Address;
}

/** A discover result: where a capability/query lives and how to filter it. */
export interface Coordinate {
  protocol: string;
  method: string;
  kind: "capability" | "query";
  verb?: Verb;
  category: Category;
  tags: string[];
  summary: string;
}

/** A load result: everything an agent needs to call `action` correctly. */
export interface Stub {
  protocol: string;
  method: string;
  kind: "capability" | "query";
  intent: string;
  verb?: Verb;
  category: Category;
  risk: RiskLabel[];
  tags: string[];
  params: Record<string, string>;
}

export interface QueryResult {
  kind: "query";
  protocol: string;
  method: string;
  data: unknown;
}

interface Registered {
  ctor: ProtocolCtor;
  config: ProtocolConfig;
  methods: Record<string, MethodMeta>;
  events: Record<string, EventMeta>;
}

function jsonSafe(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v)));
}

function fillTemplate(template: string, raw: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, name) =>
    raw[name] === undefined ? `{${name}}` : String(raw[name]),
  );
}

/**
 * The protocol catalog behind the four MCP tools. Registration validates the
 * decorator metadata; instances are created lazily, one per protocol, with
 * Handles bound to this registry's runtime.
 */
export interface RegistryOptions {
  /**
   * Resolves token ADDRESSES outside the table (symbols never fall through).
   * Wire @themoss/erc's erc20MetadataSource(client) here; without it,
   * unknown addresses fail loudly with guidance — core reads no contracts.
   */
  tokenFallback?: TokenSource;
}

export class Registry {
  #protocols = new Map<string, Registered>();
  #instances = new Map<string, object>();
  #table = new TokenTable();
  #tokens: TokenSource;
  readonly runtime: MossRuntime;

  /**
   * A new Registry is EMPTY — no protocols, no tokens. Assemble it from
   * protocol packages with use(); nothing registers itself by import
   * side effects (ADR 0006). The Monad defaults ship in @themoss/system's
   * `systemManifest`.
   */
  constructor(runtime: MossRuntime, opts: RegistryOptions = {}) {
    this.runtime = runtime;
    this.#tokens = this.#table.source(opts.tokenFallback);
  }

  /** Register one protocol package: its tokens (collision-checked) and protocols. */
  use(pkg: ProtocolPackage): void {
    if (pkg?.kind !== "moss-package") {
      throw new Error("use() takes a ProtocolPackage (see defineProtocolPackage)");
    }
    for (const token of pkg.tokens) this.#table.add(token, pkg.name);
    for (const protocol of pkg.protocols) this.register(protocol);
  }

  register(ctor: ProtocolCtor): void {
    const config = (ctor as unknown as Record<symbol, ProtocolConfig | undefined>)[PROTOCOL_META];
    if (!config) {
      throw new Error(`${ctor.name} is not decorated with @Protocol`);
    }
    if (this.#protocols.has(config.name)) {
      throw new Error(`protocol "${config.name}" is already registered`);
    }
    // Collect @Capability/@Query methods by their marker property, walking the
    // prototype chain (the @Protocol wrapper subclasses the author's class).
    const methods: Record<string, MethodMeta> = {};
    const events: Record<string, EventMeta> = {};
    for (
      let proto = ctor.prototype;
      proto && proto !== Object.prototype;
      proto = Object.getPrototypeOf(proto)
    ) {
      for (const name of Object.getOwnPropertyNames(proto)) {
        if (name === "constructor") continue;
        const fn = Object.getOwnPropertyDescriptor(proto, name)?.value;
        if (typeof fn !== "function") continue;
        const markers = fn as unknown as Record<symbol, unknown>;
        const meta = markers[METHOD_META] as MethodMeta | undefined;
        if (meta && !Object.hasOwn(methods, name)) methods[name] = meta;
        const eventMeta = markers[EVENT_META] as EventMeta | undefined;
        if (eventMeta && !Object.hasOwn(events, name)) events[name] = eventMeta;
      }
    }
    if (Object.keys(methods).length === 0) {
      throw new Error(`protocol "${config.name}" declares no @Capability or @Query methods`);
    }
    for (const [name, meta] of Object.entries(methods)) {
      if (meta.kind === "capability" && meta.spec.risk.length === 0) {
        throw new Error(
          `protocol "${config.name}": capability "${name}" must declare at least one risk label`,
        );
      }
      if (meta.kind === "capability") {
        for (const confirmed of meta.spec.confirms ?? []) {
          if (!Object.hasOwn(events, confirmed)) {
            throw new Error(
              `protocol "${config.name}": capability "${name}" confirms "${confirmed}", which is not an @Event method`,
            );
          }
        }
      }
    }
    // @Event declarations: contract keys must exist, event names must exist
    // in that contract's (origin-verified) ABI, dealer names must resolve.
    for (const [name, { spec }] of Object.entries(events)) {
      for (const [contractKey, names] of Object.entries(spec.events)) {
        const contract = config.contracts[contractKey];
        if (!contract) {
          throw new Error(
            `protocol "${config.name}": @Event "${name}" subscribes to unknown contract "${contractKey}"`,
          );
        }
        const abiEvents = new Set(
          contract.abi.filter((e) => e.type === "event").map((e) => e.name),
        );
        for (const eventName of names ?? []) {
          if (!abiEvents.has(eventName)) {
            throw new Error(
              `protocol "${config.name}": @Event "${name}" subscribes to "${eventName}", absent from "${contractKey}"'s ABI`,
            );
          }
        }
      }
      if (typeof spec.dealer === "string" && typeof ctor.prototype[spec.dealer] !== "function") {
        throw new Error(
          `protocol "${config.name}": @Event "${name}" names dealer "${spec.dealer}", which is not a method`,
        );
      }
    }
    this.#protocols.set(config.name, { ctor, config, methods, events });
  }

  discover(filter: { verb?: Verb; category?: Category; protocol?: string } = {}): Coordinate[] {
    const results: Coordinate[] = [];
    for (const { config, methods } of this.#protocols.values()) {
      if (filter.protocol && config.name !== filter.protocol) continue;
      if (filter.category && config.category !== filter.category) continue;
      for (const [method, meta] of Object.entries(methods)) {
        const verb = meta.kind === "capability" ? meta.spec.verb : undefined;
        if (filter.verb && verb !== filter.verb) continue;
        results.push({
          protocol: config.name,
          method,
          kind: meta.kind,
          verb,
          category: config.category,
          tags: meta.spec.tags ?? [],
          summary: meta.spec.intent,
        });
      }
    }
    return results;
  }

  load(coords: { protocol: string; method: string }[]): Stub[] {
    return coords.map(({ protocol, method }) => {
      const { config, methods } = this.#get(protocol);
      const meta = methods[method];
      if (!meta) throw new Error(`protocol "${protocol}" has no method "${method}"`);
      return {
        protocol,
        method,
        kind: meta.kind,
        intent: meta.spec.intent,
        verb: meta.kind === "capability" ? meta.spec.verb : undefined,
        category: config.category,
        risk: meta.kind === "capability" ? meta.spec.risk : [],
        tags: meta.spec.tags ?? [],
        params: Object.fromEntries(
          Object.entries(meta.spec.params).map(([name, type]) => [name, type.describe]),
        ),
      };
    });
  }

  /**
   * Execute a query (returns data) or build a capability's Plan (returns
   * unsigned transactions). Assembles only — never signs, never sends.
   */
  async action(
    protocol: string,
    method: string,
    account: Address,
    rawParams: Record<string, unknown>,
  ): Promise<QueryResult | Plan> {
    const { methods } = this.#get(protocol);
    const meta = methods[method];
    if (!meta) throw new Error(`protocol "${protocol}" has no method "${method}"`);

    const decoded = await decodeParams(meta.spec.params, rawParams, {
      account,
      token: this.#tokens,
    });

    const instance = this.#instantiate(protocol);
    // Methods needing the caller inside calldata (ERC-721 transferFrom) read
    // it from the second argument; everyone else just ignores it.
    const ctx: ActionCtx = { account };
    // biome-ignore lint/suspicious/noExplicitAny: dynamic dispatch to the decorated method
    const result = await (instance as any)[method](decoded, ctx);

    if (meta.kind === "query") {
      return { kind: "query", protocol, method, data: jsonSafe(result) };
    }

    const draft = result as PlanDraft;
    if (draft?.kind !== "planDraft") {
      throw new Error(
        `capability "${protocol}.${method}" must return plan(...); got ${typeof result}`,
      );
    }
    // Fill the intent template from what the agent sent; parameters that fell
    // back to defaults are missing from raw, so backfill with decoded values
    // when they are human-readable primitives (e.g. slippage bps).
    const readableDefaults = Object.fromEntries(
      Object.entries(decoded).filter(
        ([, v]) => typeof v === "string" || typeof v === "number" || typeof v === "boolean",
      ),
    );
    return finalizePlan(draft, {
      protocol,
      method,
      verb: meta.spec.verb,
      chainId: this.runtime.chainId,
      account,
      intent: fillTemplate(meta.spec.intent, { ...readableDefaults, ...rawParams }),
      declaredRisk: meta.spec.risk,
      confirms: meta.spec.confirms ?? [],
    });
  }

  #get(protocol: string): Registered {
    const entry = this.#protocols.get(protocol);
    if (!entry) {
      const known = [...this.#protocols.keys()].join(", ");
      throw new Error(`unknown protocol "${protocol}" (registered: ${known})`);
    }
    return entry;
  }

  #instantiate(protocol: string): object {
    let instance = this.#instances.get(protocol);
    if (!instance) {
      instance = new (this.#get(protocol).ctor)(this.runtime);
      this.#instances.set(protocol, instance);
    }
    return instance;
  }

  /**
   * The observation hook for the simulator (SimulatorOptions.observer):
   * decodes each plan's logs through the registered protocols' own
   * origin-verified ABIs and runs their @Event pipelines
   * (dealer → handler → intent render). Narrative only — observations never
   * feed reconciliation (ADR 0008).
   */
  observer(): ObserverHook {
    return async (plan, logs) => {
      const observations: PlanObservation[] = [];
      for (const [protocolName, reg] of this.#protocols) {
        const declarations = Object.entries(reg.events);
        if (declarations.length === 0) continue;
        const addressKey = new Map<string, string>();
        for (const [key, contract] of Object.entries(reg.config.contracts)) {
          addressKey.set(contract.addr.toLowerCase(), key);
        }
        // Decode this protocol's logs via its own ABI; foreign logs skip.
        const decoded: DecodedEvent[] = [];
        for (const log of logs) {
          const key = addressKey.get(log.address.toLowerCase());
          const contract = key ? reg.config.contracts[key] : undefined;
          if (!key || !contract) continue;
          try {
            const parsed = decodeEventLog({
              abi: contract.abi,
              // biome-ignore lint/suspicious/noExplicitAny: raw log topics
              topics: log.topics as any,
              data: log.data,
            });
            if (!parsed.eventName) continue;
            decoded.push({
              contract: key,
              address: log.address,
              name: parsed.eventName,
              args: (parsed.args ?? {}) as Record<string, unknown>,
            });
          } catch {
            // not an event of this ABI — irrelevant to observations
          }
        }
        if (decoded.length === 0) continue;
        const instance = this.#instantiate(protocolName);
        // One ctx per plan × protocol: dealer seeds it, handlers consume it.
        const ctx: ObserveCtx = { plan, account: plan.account, token: this.#tokens, shared: {} };
        for (const [name, { spec }] of declarations) {
          let matched = decoded.filter((e) => (spec.events[e.contract] ?? []).includes(e.name));
          if (matched.length === 0) continue;
          const dealer =
            typeof spec.dealer === "string"
              ? // biome-ignore lint/suspicious/noExplicitAny: registration-validated method name
                ((instance as any)[spec.dealer] as DealerFn).bind(instance)
              : spec.dealer;
          if (dealer) matched = ((await dealer(matched, ctx)) ?? matched) as DecodedEvent[];
          // biome-ignore lint/suspicious/noExplicitAny: dynamic dispatch to the decorated method
          const content = await (instance as any)[name](matched, ctx);
          if (!content) continue;
          const data = jsonSafe(content) as Record<string, unknown>;
          // Strict render: a placeholder the handler didn't supply is a bug.
          const intent = spec.intent.replace(/\{(\w+)\}/g, (_, key: string) => {
            if (data[key] === undefined) {
              throw new Error(
                `@Event "${protocolName}.${name}": intent placeholder {${key}} missing from handler result`,
              );
            }
            return String(data[key]);
          });
          observations.push({ protocol: protocolName, name, intent, data });
        }
      }
      return observations;
    };
  }
}
