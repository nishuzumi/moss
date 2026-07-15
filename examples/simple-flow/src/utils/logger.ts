import chalk from "chalk";

export const log = {
  info: (message: string) => console.log(chalk.blue("[INFO]"), message),
  success: (message: string) => console.log(chalk.green("[OK]"), message),
  warning: (message: string) => console.log(chalk.yellow("[WARN]"), message),
  error: (message: string) => console.log(chalk.red("[ERROR]"), message),
  step: (number: number, message: string) =>
    console.log(chalk.cyan(`[${number}]`), message),
  section: (title: string) => {
    console.log("");
    console.log(chalk.bold(chalk.magenta("═".repeat(60))));
    console.log(chalk.bold(chalk.magenta(` ${title} `)));
    console.log(chalk.bold(chalk.magenta("═".repeat(60))));
    console.log("");
  },
  table: (rows: { [key: string]: string | number | boolean }[]) => {
    if (rows.length === 0) return;
    const firstRow = rows[0] as { [key: string]: string | number | boolean };
    const headers = Object.keys(firstRow);
    const colWidths = headers.map((header) => {
      const headerLen = header.length;
      const maxRowLen = rows.reduce((max, row) => {
        const valLen = String(row[header]).length;
        return valLen > max ? valLen : max;
      }, 0);
      return Math.max(headerLen, maxRowLen);
    });
    const line = colWidths.map((w) => "-".repeat(w)).join(" | ");
    const headerLine = headers
      .map((h, i) => chalk.bold(h.padEnd(colWidths[i] as number)))
      .join(" | ");
    console.log(headerLine);
    console.log(line);
    for (const row of rows) {
      const rowLine = headers
        .map((h, i) => String(row[h]).padEnd(colWidths[i] as number))
        .join(" | ");
      console.log(rowLine);
    }
    console.log("");
  },
  json: (obj: unknown, indent = 2) =>
    console.log(JSON.stringify(obj, null, indent)),
  divider: () => console.log(chalk.gray("-".repeat(60))),
};

export const formatAmount = (amount: string, decimals = 18): string => {
  const num = BigInt(amount);
  const divisor = BigInt(10 ** decimals);
  const whole = num / divisor;
  const fractional = num % divisor;
  return `${whole}.${fractional.toString().padStart(decimals, "0").slice(0, 6)}`;
};

export const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatWarning = (warning: unknown): string => {
  if (typeof warning === "string") return warning;
  if (typeof warning === "object" && warning !== null) {
    return JSON.stringify(warning, null, 2);
  }
  return String(warning);
};
