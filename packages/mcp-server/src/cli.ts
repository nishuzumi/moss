#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as erc from "@themoss/erc";
import * as kuru from "@themoss/protocol-kuru";
import * as pancakeswap from "@themoss/protocol-pancakeswap";
import * as system from "@themoss/system";
import { monadRuntime } from "@themoss/system";
import { createMossServer } from "./server.js";

const rpcUrl = process.env.MOSS_RPC_URL;
const runtime = await monadRuntime({ ...(rpcUrl ? { rpcUrl } : {}) });
const { server, registry } = createMossServer({
  runtime,
  protocols: [system, erc, kuru, pancakeswap],
});
const catalog = registry.discover();
console.error(
  `moss-mcp: ${catalog.length} operations across ${new Set(catalog.map(({ protocol }) => protocol)).size} Protocols on Monad mainnet (${registry.runtime.rpcUrl})`,
);
await server.connect(new StdioServerTransport());
