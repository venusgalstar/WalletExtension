import * as web3_catch from './web3_catch.js';
import * as database from './database.js';

let network_id = 43113;

let network_info = await database.getNetworkInfo(network_id);

console.log( network_info );

await web3_catch.initCheckContract(network_info);

web3_catch.catchNewERC20Token();
