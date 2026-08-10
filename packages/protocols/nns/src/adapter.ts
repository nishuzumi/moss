import {
  Address,
  type AddressValue,
  type Handle,
  type InferParams,
  type ParamsSpec,
  Protocol,
  Query,
} from "@themoss/core";
import { getAddress } from "viem";
import { NadNameServiceAbi } from "./abis/nad-name-service.js";

// Nad Name Service on Monad mainnet.
// Canonical address source:
// https://github.com/monad-crypto/protocols/blob/main/mainnet/nad_name_service.jsonc
export const NAD_NAME_SERVICE_ADDRESS: AddressValue = "0xcc7a1bff8845573dbf0b3b96e25b9b549d4a2ec7";

const addressParams = {
  address: {
    type: Address,
    description: "Address whose Nad Name Service identity is queried.",
  },
} satisfies ParamsSpec;

export interface NadNameServicePrimaryName {
  address: AddressValue;
  primaryName: string;
}

export interface NadNameServiceProfile extends NadNameServicePrimaryName {
  avatar: string;
}

@Protocol({
  name: "nns",
  category: "token",
  description: "Nad Name Service identity lookups on Monad mainnet.",
  contracts: {
    nns: {
      abi: NadNameServiceAbi,
      addr: NAD_NAME_SERVICE_ADDRESS,
    },
  },
})
export class NadNameService {
  declare nns: Handle<typeof NadNameServiceAbi>;

  @Query({
    intent: "Read the primary Nad Name Service name for an address",
    params: addressParams,
    tags: ["identity", "name-service"],
  })
  async primaryName(params: InferParams<typeof addressParams>): Promise<NadNameServicePrimaryName> {
    const primaryName = await this.nns.read.getPrimaryNameForAddress([params.address]);
    return { address: params.address, primaryName };
  }

  @Query({
    intent: "Read a Nad Name Service profile for an address",
    params: addressParams,
    tags: ["identity", "name-service"],
  })
  async profile(params: InferParams<typeof addressParams>): Promise<NadNameServiceProfile> {
    const profile = await this.nns.read.getProfileForAddress([params.address]);
    const returnedAddress = Array.isArray(profile) ? profile[0] : profile.addr;
    if (getAddress(returnedAddress) !== getAddress(params.address)) {
      throw new Error(
        `NNS profile returned address ${returnedAddress} for requested address ${params.address}`,
      );
    }
    const primaryName = Array.isArray(profile) ? profile[1] : profile.primaryName;
    const avatar = Array.isArray(profile) ? profile[2] : profile.avatar;
    return { address: params.address, primaryName, avatar };
  }
}
