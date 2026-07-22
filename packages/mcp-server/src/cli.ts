#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { monadRuntime } from "@themoss/system";
import { defaultProtocolModules } from "./composition.js";
import { createMossServer } from "./server.js";

const rpcUrl = process.env.MOSS_RPC_URL;
const runtime = await monadRuntime({ ...(rpcUrl ? { rpcUrl } : {}) });
const { server, registry } = createMossServer({
  runtime,
  protocols: defaultProtocolModules,
});
const catalog = registry.discover();
console.error(
  `moss-mcp: ${catalog.length} operations across ${new Set(catalog.map(({ protocol }) => protocol)).size} Protocols on Monad mainnet (${registry.runtime.rpcUrl})`,
);
await server.connect(new StdioServerTransport());
