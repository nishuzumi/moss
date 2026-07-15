interface Args {
  amount?: string;
  tokenIn?: string;
  tokenOut?: string;
  account?: string;
}

const kebabToCamel = (str: string): string => {
  return str.replace(/-(\w)/g, (_, c) => (c ? c.toUpperCase() : ""));
};

export const parseArgs = (): Args => {
  const args: Args = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg && arg.startsWith("--")) {
      const key = kebabToCamel(arg.slice(2));
      const value = argv[i + 1];
      if (value && !value.startsWith("--")) {
        args[key as keyof Args] = value;
        i++;
      } else {
        args[key as keyof Args] = "true";
      }
    }
  }
  return args;
};

export const getAmount = (args: Args, defaultValue: string = "1.5"): string => {
  return args.amount ?? defaultValue;
};

export const getTokenIn = (args: Args, defaultValue: string = "MON"): string => {
  return (args.tokenIn ?? defaultValue).toUpperCase();
};

export const getTokenOut = (args: Args, defaultValue: string = "USDC"): string => {
  return (args.tokenOut ?? defaultValue).toUpperCase();
};

export const getAccount = (
  args: Args,
  defaultValue: string = "0xCcCccCCCcCCcccCcCccccCcCCCCcccccCcCCcCcC",
): string => {
  return args.account ?? defaultValue;
};
