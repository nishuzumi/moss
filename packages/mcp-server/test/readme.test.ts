import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultProtocolModules } from "../src/composition.js";

type Readme = {
  label: string;
  heading: string;
  source: string;
};

type TableRow = [protocol: string, packageName: string, capabilities: string, queries: string];

type PackageManifest = {
  dependencies?: Record<string, string>;
};

const expectedPackageOrder = [
  "@themoss/system",
  "@themoss/erc",
  "@themoss/erc",
  "@themoss/erc",
  "@themoss/protocol-aave",
  "@themoss/protocol-kintsu",
  "@themoss/protocol-kuru",
  "@themoss/protocol-clober",
  "@themoss/protocol-apriori",
  "@themoss/protocol-morpho",
  "@themoss/protocol-nadfun",
  "@themoss/protocol-nns",
  "@themoss/protocol-pancakeswap",
  "@themoss/protocol-monad-cards",
  "@themoss/protocol-pendle",
  "@themoss/protocol-uniswap",
] as const;

const packageManifest = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as PackageManifest;
const defaultPackageDependencies = Object.keys(packageManifest.dependencies ?? {})
  .filter(
    (packageName) =>
      packageName === "@themoss/erc" ||
      packageName === "@themoss/system" ||
      packageName.startsWith("@themoss/protocol-"),
  )
  .sort();

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

function packageNameFromRow([, packageCell]: TableRow): string {
  const match = /^`(@themoss\/[^`]+)`$/.exec(packageCell);
  if (!match?.[1])
    throw new Error(`Protocol package cell must contain one @themoss package: ${packageCell}`);
  return match[1];
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

  it("keeps bilingual package identities aligned with the default composition", () => {
    const [english, chinese] = readmes.map(protocolRows);
    if (!english || !chinese) throw new Error("both README fixtures are required");

    const englishPackages = english.map(packageNameFromRow);
    const chinesePackages = chinese.map(packageNameFromRow);
    const expectedUniquePackages = [...new Set(expectedPackageOrder)].sort();

    expect(englishPackages).toEqual(expectedPackageOrder);
    expect(chinesePackages).toEqual(expectedPackageOrder);
    expect(expectedUniquePackages).toEqual(defaultPackageDependencies);
    expect(expectedUniquePackages).toHaveLength(defaultProtocolModules.length);
  });

  it("keeps bilingual Capability and Query coverage aligned", () => {
    const [english, chinese] = readmes.map(protocolRows);
    if (!english || !chinese) throw new Error("both README fixtures are required");

    const operationCells = (rows: TableRow[]) =>
      rows.map(([, , capabilities, queries]) => [
        capabilities.replaceAll("、", ", "),
        queries.replaceAll("、", ", "),
      ]);

    expect(operationCells(chinese)).toEqual(operationCells(english));
  });

  it("uses Chinese separators in Capability and Query cells", () => {
    const chinese = readmes.find(({ label }) => label === "Chinese");
    if (!chinese) throw new Error("Chinese README fixture is missing");

    for (const [, , capabilities, queries] of protocolRows(chinese)) {
      expect(capabilities).not.toContain(",");
      expect(queries).not.toContain(",");
    }
  });
});
