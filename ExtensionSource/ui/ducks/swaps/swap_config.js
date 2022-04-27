import {
    MAINNET_CHAIN_ID,
    BSC_CHAIN_ID,
    POLYGON_CHAIN_ID,
    RINKEBY_CHAIN_ID,
    AVALANCHE_CHAIN_ID,
    ROPSTEN_RPC_URL,
    RINKEBY_RPC_URL,
    MAINNET_RPC_URL,    
} from "../../../shared/constants/network";

import { phoenixSwapOnAvalancheAbi } from "./abis/phoenixSwapOnAvalancheAbi";
import { phoenixSwapOnBinanceAbi } from "./abis/phoenixSwapOnBinance";
import { phoenixSwapOnPolygonAbi } from "./abis/phoenixSwapOnPolygon";

export const AVALANCHE_FUJI_CHAIN_ID = '0xa869';

export const SWAP_CONTRACT_SWAP_METHOD_IDS = {
    [MAINNET_CHAIN_ID]: "",
    [BSC_CHAIN_ID]: "0xfe029156",
    [AVALANCHE_CHAIN_ID]: "0xfe029156",
    [RINKEBY_CHAIN_ID]: "",
    [POLYGON_CHAIN_ID]: "0xfe029156",
}

export const SWAP_CONTRACT_SWAP_AVAX_FOR_TOKENS_METHOD_IDS = {    
    [MAINNET_CHAIN_ID]: "",
    [BSC_CHAIN_ID]: "0x3a1c339f",
    [AVALANCHE_CHAIN_ID]: "0x378a4d29",
    [RINKEBY_CHAIN_ID]: "",
    [POLYGON_CHAIN_ID]: "0xb79c48e5",
}

export const SWAP_CONTRACT_SWAP_TOKENS_FOR_AVAX_METHOD_IDS = {    
    [MAINNET_CHAIN_ID]: "",
    [BSC_CHAIN_ID]: "0x5e72a62b",
    [AVALANCHE_CHAIN_ID]: "0x6f2917eb",
    [RINKEBY_CHAIN_ID]: "",
    [POLYGON_CHAIN_ID]: "0xb0413694",
}

export const SWAP_CONTRACT_ADDRESSES = {
    [MAINNET_CHAIN_ID]: "",
    [BSC_CHAIN_ID]: "0xB524A30aB68D7DcF431963e1a527c894Fc4D23d4",
    [AVALANCHE_CHAIN_ID]: "0x2A9bDDA378194c3c2cE53bD90Ec5A33f6597d1f7",
    [RINKEBY_CHAIN_ID]: "",
    [POLYGON_CHAIN_ID]: "0xdc532412cfE1D2A08A1DC23ABdf5dc45a4CE35AF",
}

export const SWAP_CONTRACT_ABIS = {
    [MAINNET_CHAIN_ID]: "",
    [BSC_CHAIN_ID]: phoenixSwapOnBinanceAbi,
    [AVALANCHE_CHAIN_ID]: phoenixSwapOnAvalancheAbi,
    [RINKEBY_CHAIN_ID]: "",
    [POLYGON_CHAIN_ID]: phoenixSwapOnPolygonAbi,
}

export const HTTP_PROVIDERS = {
    [AVALANCHE_CHAIN_ID]: "https://api.avax.network/ext/bc/C/rpc",
    [AVALANCHE_FUJI_CHAIN_ID]: "https://api.avax-test.network/ext/bc/C/rpc",
    [RINKEBY_CHAIN_ID]: RINKEBY_RPC_URL,
    [MAINNET_CHAIN_ID]: MAINNET_RPC_URL,
    [BSC_CHAIN_ID]: "https://bsc-dataseed1.binance.org/",
    [POLYGON_CHAIN_ID]: "https://polygon-rpc.com/"
}
