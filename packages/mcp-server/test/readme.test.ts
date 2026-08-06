import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultProtocolModules } from "../src/composition.js";

type Readme = {
  label: string;
  heading: string;
  source: string;
};

type TableRow = [protocol: string, packageName: string, capabilities: string, queries: string];

const readmes: Readme[] = [
  {
    label: "English",
    heading: "## Supported Protocols",
    source: readFileSync(new URL("../../../README.md", import.meta.url), "utf8"),
  },
  {
    label: "Chinese",
    heading: "## 已支持的 Protocol",
    source: readFileSync(new URL("../../../README.zh-CN.md", import.meta.url), "utf8"),
  },
];

function parseRow(readme: Readme, line: string): TableRow {
  const cells = line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
  const [protocol, packageName, capabilities, queries, extra] = cells;

  if (
    protocol === undefined ||
    packageName === undefined ||
    capabilities === undefined ||
    queries === undefined ||
    extra !== undefined
  ) {
    throw new Error(`${readme.label} Protocol table row must have exactly four columns: ${line}`);
  }

  return [protocol, packageName, capabilities, queries];
}

function protocolRows(readme: Readme): TableRow[] {
  const sectionStart = readme.source.indexOf(`${readme.heading}\n`);
  if (sectionStart === -1) throw new Error(`${readme.label} Protocol heading is missing`);

  const sectionEnd = readme.source.indexOf("\n## ", sectionStart + readme.heading.length);
  if (sectionEnd === -1) throw new Error(`${readme.label} Protocol section has no closing heading`);

  const lines = readme.source.slice(sectionStart, sectionEnd).split("\n");
  const tableStart = lines.findIndex((line) => line.startsWith("| Protocol | Package |"));
  if (tableStart === -1) throw new Error(`${readme.label} Protocol table is missing`);

  const tableLines: string[] = [];
  for (const line of lines.slice(tableStart)) {
    if (!line.startsWith("|")) break;
    tableLines.push(line);
  }

  const orphanedRows = lines
    .slice(tableStart + tableLines.length)
    .filter((line) => line.startsWith("|"));
  if (orphanedRows.length > 0) {
    throw new Error(`${readme.label} Protocol rows appear after the table ended`);
  }

  const parsed = tableLines.map((line) => parseRow(readme, line));
  const separator = parsed[1];
  if (!separator?.every((cell) => /^-+$/.test(cell))) {
    throw new Error(`${readme.label} Protocol table separator is invalid`);
  }

  return parsed.slice(2);
}

describe("root README Protocol tables", () => {
  it.each(readmes)("keeps $label Protocol rows in one contiguous table", (readme) => {
    const rows = protocolRows(readme);
    const labels = rows.map(([protocol]) => protocol);

    expect(new Set(labels).size).toBe(labels.length);
  });

  it("keeps bilingual package coverage aligned with the default composition", () => {
    const [english, chinese] = readmes.map(protocolRows);
    if (!english || !chinese) throw new Error("both README fixtures are required");

    const englishPackages = english.map(([, packageName]) => packageName);
    const chinesePackages = chinese.map(([, packageName]) => packageName);

    expect(chinesePackages).toEqual(englishPackages);
    expect(new Set(englishPackages).size).toBe(defaultProtocolModules.length);
  });
});
