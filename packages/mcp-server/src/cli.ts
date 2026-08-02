#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createRuntime } from "@themoss/core";

import { defaultProtocolModules } from "./composition.js";
import { createMossServer } from "./server.js";

// createRuntime resolves MOSS_RPC_URL itself; the endpoint it settled on is
// printed below.
const runtime = await createRuntime();
const { server, registry } = createMossServer({
  runtime,
  protocols: defaultProtocolModules,
});
const catalog = registry.discover();
console.error(
  `moss-mcp: ${catalog.length} operations across ${new Set(catalog.map(({ protocol }) => protocol)).size} Protocols on Monad mainnet (${registry.runtime.rpcUrl})`,
);
await server.connect(new StdioServerTransport());
