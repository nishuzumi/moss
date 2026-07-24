import { ethers } from "ethers";
import { registerAdapter } from "../adapter-registry";

// 固定可直接使用的公共RPC + Sepolia Aave‑V3官方Pool合约地址
const RPC_URL = "https://rpc.sepolia.org";
const PROVIDER = new ethers.JsonRpcProvider(RPC_URL);
const AAVE_V3_POOL_ADDRESS = "0x69850D0c9ad21244D46a4f78eE1e27634a2Dc812";

// 精简ABI，仅保留4个需要的借贷方法
const AAVE_POOL_ABI = [
  "function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)",
  "function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf)",
  "function repay(address asset, uint256 amount, uint256 interestRateMode, address onBehalfOf)",
  "function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)"
];
const poolContract = new ethers.Contract(AAVE_V3_POOL_ADDRESS, AAVE_POOL_ABI, PROVIDER);

/**存款 supply*/
export async function supplyAsset(wallet: ethers.Wallet, asset: string, amount: bigint) {
  const contract = poolContract.connect(wallet);
  const tx = await contract.supply(asset, amount, wallet.address, 0);
  return await tx.wait();
}

/**借款 borrow*/
export async function borrowAsset(wallet: ethers.Wallet, asset: string, amount: bigint) {
  const contract = poolContract.connect(wallet);
  // 2代表固定利率模式
  const tx = await contract.borrow(asset, amount, 2, 0, wallet.address);
  return await tx.wait();
}

/**还款 repay*/
export async function repayAsset(wallet: ethers.Wallet, asset: string, amount: bigint) {
  const contract = poolContract.connect(wallet);
  const tx = await contract.repay(asset, amount, 2, wallet.address);
  return await tx.wait();
}

/**查询用户借贷持仓、健康因子（本地优先用来测试，只读调用，必可跑通）*/
export async function getUserPosition(userAddr: string) {
  const data = await poolContract.getUserAccountData(userAddr);
  return {
    totalCollateralBase: data.totalCollateralBase.toString(),
    totalDebtBase: data.totalDebtBase.toString(),
    healthFactor: data.healthFactor.toString()
  };
}

// Moss系统注册适配器（必填，否则系统识别不到）
registerAdapter({
  id: "aave‑v3",
  name: "Aave V3 Lending (Sepolia‑Testnet)",
  description: "支持Sepolia测试网Aave V3存款、借款、还款、用户借贷仓位查询",
  methods: {
    supplyAsset,
    borrowAsset,
    repayAsset,
    getUserPosition
  }
});
