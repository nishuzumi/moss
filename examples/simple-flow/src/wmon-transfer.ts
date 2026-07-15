/**
 * 典型的 Moss 组合流，在 Monad 主网上跨 Plan 进行代币包装与转账的示例。
 * 
 * 流程包含：
 *   Plan A：将 1.0 MON 包装为 1.0 WMON（使用 wmon 协议的 wrap 方法）
 *   Plan B：将得到的 1.0 WMON 转移给接收账号（使用 erc20 协议的 transfer 方法）
 *
 * 这两个 Plan 将作为一个链条同时在本地的模拟器中进行回放和对账。
 *
 * 运行命令：pnpm --filter @themoss/example-simple-flow transfer
 */
import { type Plan, Registry } from "@themoss/core";
import { ercManifest } from "@themoss/erc";
import { createTraceSimulator } from "@themoss/simulator";
import { monadRuntime, systemManifest } from "@themoss/system";

// 使用默认的测试账号与随机接收地址
const ACCOUNT = (process.env.MOSS_ACCOUNT ??
  "0xCcCccCCCcCCcccCcCccccCcCCCCcccccCcCCcCcC") as `0x${string}`;
const RECIPIENT = "0x0000000000000000000000000000000000000001" as `0x${string}`;

const runtime = monadRuntime({ rpcUrl: process.env.MOSS_RPC_URL });
const registry = new Registry(runtime);

// 注册系统能力与通用的 ERC20 模块
for (const manifest of [systemManifest, ercManifest]) {
  registry.use(manifest);
}

const simulator = createTraceSimulator(runtime);

async function main() {
  console.log("正在初始化 Moss 包装与转账组合流...");

  // 1. 构建 Plan A：包装 1.0 MON 为 WMON
  console.log("\n1. 构建 Plan A (包装 MON)...");
  const wrapPlan = (await registry.action("wmon", "wrap", ACCOUNT, {
    amount: "1.0",
  })) as Plan;
  console.log("   意图:", wrapPlan.intent);
  console.log("   期望流出:", JSON.stringify(wrapPlan.expects.out));
  console.log("   期望流入:", JSON.stringify(wrapPlan.expects.in));

  // 2. 构建 Plan B：将 1.0 WMON 转移到接收账号
  console.log("\n2. 构建 Plan B (转移 WMON)...");
  const transferPlan = (await registry.action("erc20", "transfer", ACCOUNT, {
    token: "WMON",
    to: RECIPIENT,
    amount: "1.0",
  })) as Plan;
  console.log("   意图:", transferPlan.intent);
  console.log("   期望流出:", JSON.stringify(transferPlan.expects.out));

  // 3. 将两个 Plan 作为一条链合并模拟
  //    因为 Plan B 消费的 WMON 直到 Plan A 运行后才会存在，
  //    模拟器会在整个状态转移中自动维护这一级联依赖。
  console.log("\n3. 在模拟器中串联运行 Plan A + Plan B...");
  const { results, halted } = await simulator.simulate([wrapPlan, transferPlan]);

  if (halted) {
    console.error(`\n✗ 模拟被中断，原因: ${halted.reason}`);
    process.exitCode = 1;
    return;
  }

  // 4. 打印每一个 Plan 的实际模拟效果 (effects) 与潜在警告 (warnings)
  for (const [index, result] of results.entries()) {
    console.log(`\n   Plan ${index === 0 ? "A (Wrap)" : "B (Transfer)"} 执行结果:`);
    console.log("   真实 effects:", JSON.stringify(result.effects, null, 2));
    console.log("   警告信息:", result.warnings);
  }

  // 5. 校验两个 Plan 是否均无警告
  const clean = results.every((r) => r.warnings.length === 0);
  if (clean) {
    console.log("\n✓ 所有模拟均校验无警告！这些未签名交易可以安全交付至钱包进行签名。");
  } else {
    console.log("\n✗ 模拟发现警告或对账失败！请立即终止交易。");
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("执行时发生错误:", err);
  process.exitCode = 1;
});
