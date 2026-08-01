// GENERATED FILE — do not edit by hand.
//   regenerate offline from abis-src/:  pnpm gen:abis
//   re-vendor from upstream:            pnpm update:abis
// Deployment record origin: vendored (ADR 0007)
//   source:   @aave-dao/aave-address-book@4.61.2 (npm), dist/**.mjs — verbatim copies in ../../abis-src/
//   tarball:  sha256 c3947b04fef6f096faf881950462dadde17744481a7a1d80a858ba62e35b15be
//   vendored: 2026-08-01 (release-age guard: 7d)
//   upstream: dist/AaveV3Monad.ts, the Aave DAO's own registry of the Monad
//   market. The generator refuses to emit unless it reports CHAIN_ID 143, and the
//   live Monad suite verifies every address on chain: deployed bytecode, the
//   provider/Pool round trip, the ERC-1967 implementation slot, and each
//   reserve's aToken, debt token, symbol and decimals.

export const AAVE_V3_MONAD = {
  "POOL": "0x69a5F9AD4f96ebf0a0C792dD42a01cC5C0102fef",
  "POOL_ADDRESSES_PROVIDER": "0x34793Fb9935F7bB5E5aE920fb963F39063E7A615",
  "POOL_IMPL": "0x9539531EA4f6563A66421a7449506152609985be",
  "ORACLE": "0x0c02b2c2038066C10Eab8fe1D5Cdb73d5a78A1Bf",
  "AAVE_PROTOCOL_DATA_PROVIDER": "0xB65A68B98274ef7D9a60E0C0747dD1BEc3D32fad",
  "ASSETS": {
    "USDT0": {
      "decimals": 6,
      "UNDERLYING": "0xe7cd86e13AC4309349F30B3435a9d337750fC82D",
      "A_TOKEN": "0x9531E6bC99D7F7f0596ed7bA5b846Ba9Eb60468c",
      "V_TOKEN": "0x85812C8eEeB8723e3C60d0Dc78e697b4E7e5a35D"
    },
    "USDC": {
      "decimals": 6,
      "UNDERLYING": "0x754704Bc059F8C67012fEd69BC8A327a5aafb603",
      "A_TOKEN": "0x35a73BAcb179d3740395A3ceCc87FF2e581d6042",
      "V_TOKEN": "0x9F555aB84C4e0a531B50283f09Dba7A97134c4e4"
    },
    "USDe": {
      "decimals": 18,
      "UNDERLYING": "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34",
      "A_TOKEN": "0x37cAbe3eDD86165886877Cc8b6Be10269f21893d",
      "V_TOKEN": "0x3BE6c069b81423BccF758eb95004E0324Af2cDD8"
    },
    "mUSD": {
      "decimals": 6,
      "UNDERLYING": "0xacA92E438df0B2401fF60dA7E4337B687a2435DA",
      "A_TOKEN": "0xDBb2e1b6BC94328Df2662A1796AB6A23fCde3199",
      "V_TOKEN": "0x9837392b2b5b2Ce7C39A357E0eB6E07d9fFb76Cd"
    },
    "AUSD": {
      "decimals": 6,
      "UNDERLYING": "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a",
      "A_TOKEN": "0xdeBFeDF35faEd5d1664E553545e144C02227A2Ec",
      "V_TOKEN": "0x8F4c10B392ef10c811E4d4BAFC74Bfc1A2671C75"
    },
    "WETH": {
      "decimals": 18,
      "UNDERLYING": "0xEE8c0E9f1BFFb4Eb878d8f15f368A02a35481242",
      "A_TOKEN": "0x4377b53aAA8b8e3fF7AA2843832CAF004f5Cb8b6",
      "V_TOKEN": "0xd1f352c326731027f0d9a7f62a4742eBdf1EFc8c"
    },
    "cbBTC": {
      "decimals": 8,
      "UNDERLYING": "0xd18B7EC58Cdf4876f6AFebd3Ed1730e4Ce10414b",
      "A_TOKEN": "0x1F5e388861A32226c716e922CE748a6FEE5e8e57",
      "V_TOKEN": "0x551a5fc4a05efFC8F9A026F4DC28634D4693Af1F"
    },
    "wstETH": {
      "decimals": 18,
      "UNDERLYING": "0x10Aeaf63194db8d453d4D85a06E5eFE1dd0b5417",
      "A_TOKEN": "0xc31E3A273A93D238Ce49B053f801E8f385375df7",
      "V_TOKEN": "0xC4B1064b7377eF541d59B7e21C0B3F812C50d4Ec"
    },
    "weETH": {
      "decimals": 18,
      "UNDERLYING": "0xA3D68b74bF0528fdD07263c60d6488749044914b",
      "A_TOKEN": "0x4FAe5e2d191e012f503dE53023B0710f554FcFF0",
      "V_TOKEN": "0x78540eD62E3F6081c906F7841A7e1A6201cb898E"
    },
    "syrupUSDC": {
      "decimals": 6,
      "UNDERLYING": "0xaB6e5a0C3799d020c790D34F7B2C02639e238AF7",
      "A_TOKEN": "0xbc2A1FA0069e59e2552Ab40889520c7b0D413D9B",
      "V_TOKEN": "0xE84F9B29568747Cb58B2969071e38093A384E26f"
    },
    "sUSDe": {
      "decimals": 18,
      "UNDERLYING": "0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2",
      "A_TOKEN": "0xCD11405D4a15a825B46254c42F5b5Cd8c2EDAe09",
      "V_TOKEN": "0x4cc35bFad4713705295Fd71DAE11CD57cc366Ca8"
    },
    "GHO": {
      "decimals": 18,
      "UNDERLYING": "0xfc421aD3C883Bf9E7C4f42dE845C4e4405799e73",
      "A_TOKEN": "0x4586face17B0e3D4d51EcABb4B4EBC2354b61b0D",
      "V_TOKEN": "0x1dd98eDe37480c2E0827a107c68f442aA516E7fc"
    }
  }
} as const;
