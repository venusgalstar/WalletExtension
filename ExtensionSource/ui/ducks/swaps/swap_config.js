import {
    MAINNET_CHAIN_ID,
    BSC_CHAIN_ID,
    POLYGON_CHAIN_ID,
    RINKEBY_CHAIN_ID,
    AVALANCHE_CHAIN_ID,
    ROPSTEN_RPC_URL,
    RINKEBY_RPC_URL,
    MAINNET_RPC_URL,
    KOVAN_CHAIN_ID,
    FANTOM_CHAIN_ID,
    AVALANCHE_NETWORK_ID,
    MAINNET_NETWORK_ID,
    BSC_NETWORK_ID,
    POLYGON_NETWORK_ID,    
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

export const DEPOSITE_METHOD_ID_OF_WRAPPED_CURRENCY = "0xd0e30db0";
export const WITHDRAW_METHOD_ID_OF_WRAPPED_CURRENCY = "0x2e1a7d4d";

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
    [BSC_CHAIN_ID]: "0x8D2499cA00e1e67a788452b5CB06DcB7f430AeA9",
    [AVALANCHE_CHAIN_ID]: "0x664d87c3CE571Ae0bc63377c6A0254d64B30f1F1",
    [RINKEBY_CHAIN_ID]: "",
    [POLYGON_CHAIN_ID]: "0xB524A30aB68D7DcF431963e1a527c894Fc4D23d4",
}

export const SWAP_CONTRACT_ABIS = {
    [MAINNET_CHAIN_ID]: "",
    [BSC_CHAIN_ID]: phoenixSwapOnBinanceAbi,
    [AVALANCHE_CHAIN_ID]: phoenixSwapOnAvalancheAbi,
    [RINKEBY_CHAIN_ID]: "",
    [POLYGON_CHAIN_ID]: phoenixSwapOnPolygonAbi,
    [FANTOM_CHAIN_ID]: "",
}

export const HTTP_PROVIDERS = {
    [AVALANCHE_CHAIN_ID]: "https://speedy-nodes-nyc.moralis.io/e463de41b2b5a141ba47e9dd/avalanche/mainnet", //"https://api.avax.network/ext/bc/C/rpc",
    [AVALANCHE_FUJI_CHAIN_ID]: "https://speedy-nodes-nyc.moralis.io/e463de41b2b5a141ba47e9dd/avalanche/testnet",//"https://api.avax-test.network/ext/bc/C/rpc",
    [RINKEBY_CHAIN_ID]: "https://speedy-nodes-nyc.moralis.io/e463de41b2b5a141ba47e9dd/eth/rinkeby", //RINKEBY_RPC_URL,
    [MAINNET_CHAIN_ID]: "https://speedy-nodes-nyc.moralis.io/e463de41b2b5a141ba47e9dd/eth/mainnet",//MAINNET_RPC_URL,
    [BSC_CHAIN_ID]: "https://speedy-nodes-nyc.moralis.io/e463de41b2b5a141ba47e9dd/bsc/mainnet", //"https://bsc-dataseed1.binance.org/",
    [POLYGON_CHAIN_ID]: "https://speedy-nodes-nyc.moralis.io/e463de41b2b5a141ba47e9dd/polygon/mainnet", //"https://polygon-rpc.com/"
    [FANTOM_CHAIN_ID]: "https://speedy-nodes-nyc.moralis.io/e463de41b2b5a141ba47e9dd/fantom/mainnet",
}

export const WRAPPED_CURRENCY_ADDRESSES = {
    [AVALANCHE_CHAIN_ID]: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    [MAINNET_CHAIN_ID]: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    [BSC_CHAIN_ID]: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    [POLYGON_CHAIN_ID]: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    [FANTOM_CHAIN_ID]: "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83"
}

export const URLS_FOR_FETCHING_GAS_OF_NETWORK = {
    [AVALANCHE_CHAIN_ID]: 'https://api.debank.com/chain/gas_price_dict_v2?chain=avax',
    [MAINNET_CHAIN_ID]: `https://gas-api.metaswap.codefi.network/networks/${MAINNET_NETWORK_ID}/gasPrices`,
    [BSC_CHAIN_ID]: `https://gas-api.metaswap.codefi.network/networks/${BSC_NETWORK_ID}/gasPrices`,
    [POLYGON_CHAIN_ID]: `https://gas-api.metaswap.codefi.network/networks/${POLYGON_NETWORK_ID}/gasPrices`,
    [FANTOM_CHAIN_ID]: 'https://api.debank.com/chain/gas_price_dict_v2?chain=ftm'
}

export const COINGEKCO_NETWORK_ID = {
    [AVALANCHE_CHAIN_ID]: "avalanche",
    [MAINNET_CHAIN_ID]: "ethereum",
    [BSC_CHAIN_ID]: "binance-smart-chain",
    [POLYGON_CHAIN_ID]: "polygon-pos",
    [FANTOM_CHAIN_ID]: "fantom"
}
