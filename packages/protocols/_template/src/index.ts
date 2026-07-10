import { defineProtocolPackage } from "@themoss/core";
import { ExampleProtocol } from "./adapter.js";
import { TOKENS } from "./tokens.js";

export { EXAMPLE_VAULT_ADDRESS, ExampleProtocol } from "./adapter.js";
export { TOKENS } from "./tokens.js";

/** CHANGEME: rename, then list it in the mcp-server `use()` array. */
export const templateManifest = defineProtocolPackage({
  name: "template",
  protocols: [ExampleProtocol],
  tokens: TOKENS,
});
