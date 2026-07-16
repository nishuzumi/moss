export const log = {
  info: (message: string) => console.log(`[INFO] ${message}`),
  success: (message: string) => console.log(`[OK] ${message}`),
  warning: (message: string) => console.warn(`[WARN] ${message}`),
  error: (message: string) => console.error(`[ERROR] ${message}`),
  step: (number: number, message: string) => console.log(`[${number}] ${message}`),
  section: (title: string) => {
    console.log("\n");
    console.log(`=== ${title} ===`);
  },
  table: (rows: Record<string, string | number | boolean>[]) => {
    if (rows.length === 0) return;
    console.log(JSON.stringify(rows, null, 2));
  },
  json: (obj: unknown, indent = 2) => console.log(JSON.stringify(obj, null, indent)),
  divider: () => console.log("---"),
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
