import type { Handle, ProtocolRef } from "@themoss/core";
import type { Pyth, PythAbi, PythPrice } from "../src/index.js";
import { PYTH_FEEDS } from "../src/index.js";

declare const pyth: Pyth;

pyth.price({ feed: "MON_USD" });
pyth.price({ feed: "BTC_USD", maxAgeSeconds: 120 });

// @ts-expect-error Only feeds from the official Monad allowlist are accepted.
pyth.price({ feed: "UNKNOWN_USD" });

// @ts-expect-error maxAgeSeconds is a number, not a string.
pyth.price({ feed: "MON_USD", maxAgeSeconds: "120" });

// @ts-expect-error feed is required.
pyth.price({});

const result: PythPrice = {
  feed: "MON_USD",
  feedId: PYTH_FEEDS.MON_USD,
  price: "123456789",
  confidence: "10000",
  exponent: -8,
  publishTime: "1785312000",
};

// @ts-expect-error Query output is JSON-safe and never exposes bigint.
result.price = 123n;

const dependency = null as unknown as ProtocolRef<Pyth>;
void dependency.price({ feed: "ETH_USD" });

// @ts-expect-error Injected Protocol references expose methods, not Handles.
void dependency.priceFeed;

function handleFixture(handle: Handle<typeof PythAbi>) {
  handle.read.getPriceNoOlderThan([PYTH_FEEDS.MON_USD, 60n]);
  handle.read.getPriceUnsafe([PYTH_FEEDS.MON_USD]);

  // @ts-expect-error IPyth has no latestRoundData function.
  handle.read.latestRoundData();
}

void pyth;
void result;
void handleFixture;
