import { defineProtocolPackage } from "@themoss/core";
import { FastLane } from "./adapter.js";
import { FASTLANE_TOKENS } from "./tokens.js";

export { FastLane } from "./adapter.js";
export { FASTLANE_TOKENS } from "./tokens.js";
export { SHMON_PROXY_ADDRESS } from "./adapter.js";

export const fastlaneManifest = defineProtocolPackage({
  name: "fastlane",
  protocols: [FastLane],
  tokens: FASTLANE_TOKENS,
});
