import type { Handle } from "@themoss/core";
import type { monadCardsAbi } from "../src/abis/monad-cards.js";
import type { MonadCards } from "../src/monad-cards.js";

function handleFixture(handle: Handle<typeof monadCardsAbi>) {
  handle.read.totalMinted();
  // @ts-expect-error totalMinted takes no ABI arguments.
  handle.read.totalMinted([]);
  // @ts-expect-error ABI-generic Handles reject unknown contract methods.
  handle.read.mintedSupply();
}

const protocol = null as unknown as MonadCards;
const result: Awaited<ReturnType<MonadCards["totalMinted"]>> = { totalMinted: "42" };
protocol.totalMinted();
// @ts-expect-error The Query accepts no parameters.
protocol.totalMinted({});
// @ts-expect-error The Query result is JSON-safe and never exposes bigint.
const invalidResult: Awaited<ReturnType<MonadCards["totalMinted"]>> = { totalMinted: 42n };

void handleFixture;
void result;
void invalidResult;
