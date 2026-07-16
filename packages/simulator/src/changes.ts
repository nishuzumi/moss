import type { Change } from "@themoss/core";
import type { CallFrame, TraceLog } from "./trace.js";

export class ChangeOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChangeOrderError";
  }
}

const VALUE_MOVING_FRAMES = new Set(["CALL", "CREATE", "CREATE2", "SELFDESTRUCT"]);

function event(log: TraceLog): Change {
  return Object.freeze({
    kind: "event" as const,
    address: log.address,
    topics: Object.freeze([...log.topics]),
    data: log.data,
  });
}

function traceNumber(value: number | `0x${string}` | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const number = typeof value === "number" ? value : Number(BigInt(value));
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new ChangeOrderError(`callTracer returned invalid ordering value ${value}`);
  }
  return number;
}

function frameChanges(frame: CallFrame): Change[] {
  if (frame.error) return [];
  const changes: Change[] = [];
  const value = BigInt(frame.value ?? "0x0");
  if (value > 0n && VALUE_MOVING_FRAMES.has(frame.type.toUpperCase())) {
    if (!frame.to) {
      throw new ChangeOrderError(`${frame.type} moved native value without a recipient`);
    }
    changes.push(
      Object.freeze({
        kind: "nativeTransfer" as const,
        from: frame.from,
        to: frame.to,
        value: value.toString(),
      }),
    );
  }

  const calls = frame.calls ?? [];
  const logs = frame.logs ?? [];
  if (calls.length === 0) {
    changes.push(
      ...logs
        .map((log, order) => ({ log, order }))
        .sort((a, b) => traceNumber(a.log.index, a.order) - traceNumber(b.log.index, b.order))
        .map(({ log }) => event(log)),
    );
    return changes;
  }

  if (logs.some((log) => log.position === undefined)) {
    throw new ChangeOrderError("callTracer omitted log positions needed to order child calls");
  }
  const byPosition = new Map<number, TraceLog[]>();
  for (const log of logs) {
    const position = traceNumber(log.position, -1);
    if (position > calls.length) {
      throw new ChangeOrderError(`callTracer returned invalid log position ${position}`);
    }
    const positioned = byPosition.get(position) ?? [];
    positioned.push(log);
    byPosition.set(position, positioned);
  }
  for (let position = 0; position <= calls.length; position += 1) {
    changes.push(
      ...(byPosition.get(position) ?? [])
        .sort((a, b) => traceNumber(a.index, 0) - traceNumber(b.index, 0))
        .map(event),
    );
    const child = calls[position];
    if (child) changes.push(...frameChanges(child));
  }
  return changes;
}

export function extractChanges(frame: CallFrame): readonly Change[] {
  return Object.freeze(frameChanges(frame));
}
