import type { AddressValue } from "@themoss/core";
import type { NadNameService } from "../src/index.js";

const validAddress: AddressValue = "0xcccccccccccccccccccccccccccccccccccccccc";
const adapter = null as unknown as NadNameService;

adapter.primaryName({ address: validAddress });
adapter.profile({ address: validAddress });

// @ts-expect-error Query parameters must contain a 20-byte hexadecimal address.
adapter.primaryName({ address: "not-an-address" });
