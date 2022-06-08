import {config} from './config/config.js';
import Web3 from "web3";
import * as database from './database.js';

// init web3
let web3List = [];
let networkIDList = [];
let erc20TokenList = [];
let dexRouterList = [];
let swapContracts = [];
let checkErc20BlockNumber = [];

const initNetworkIDList = async(newNetworkIDList) =>
{
    var idx;
    networkIDList = [];
    web3List = [];
    checkErc20BlockNumber = [];
    
    console.log("Trying to initialize web3 object for each network... \n");

    try{
        for(idx = 0; idx < newNetworkIDList.length; idx++)
        {
            networkIDList.push(newNetworkIDList[idx].id);
            web3List[newNetworkIDList[idx].id] = new Web3(new Web3.providers.HttpProvider(newNetworkIDList[idx].rpc_url)); 
            checkErc20BlockNumber[newNetworkIDList[idx].id] = 0;
        }
    } catch(e){
        console.log("Web3 init error! Try again every 1 second. \n", e);
        setTimeout(initNetworkIDList, 1000);
    }; 

    console.log("Succeed in initializing web3 object for each network. \n");
}

const initERC20TokenList = async(newErc20TokenList) =>
{
    erc20TokenList = [];
    erc20TokenList = newErc20TokenList.slice();
}

const initDexRouterList = async(newDexRouterList) =>
{
    dexRouterList = [];
    dexRouterList = newDexRouterList.slice();
}

const initSwapContracts = async() =>
{
    var idx;

    console.log("Trying to initialize SwapContract Object... \n");

    try {
        for( idx = 0; idx < networkIDList.length; idx++)
        {
            console.log(networkIDList[idx]);
            // console.log(web3List[networkIDList[idx]]);
            swapContracts[networkIDList[idx]] = new web3List[networkIDList[idx]].eth.Contract(config[networkIDList[idx]].abi, config[networkIDList[idx]].address);
        }
    } catch(e){
        console.log("SwapContract init error! Try again every 1 second. \n", e);
        setTimeout(initSwapContracts, 1000);
    };   

    console.log("Succeed in initializing SwapContract Object... \n");
}

//init variables and constant
export { initNetworkIDList, initERC20TokenList, initDexRouterList, initSwapContracts};

const getBalancesOfAccount = async(account) =>
{   
    var idx;
    var tokenBalances = [];

    console.log("Trying to get all token balance of specific account...\n");

    try{
        for(idx = 0; idx < networkIDList.length; idx++)
        {        
            var tokenList = erc20TokenList[networkIDList[idx]]["token_address"];
            tokenBalances[networkIDList[idx]] = await swapContracts[networkIDList[idx]].methods.getBalance(account, tokenList).call();
        }
    } catch(e){
        console.log("Getting token balance error!", e);
    }

    console.log("Succeed in getting all token balance of specific account...\n");

    return tokenBalances;
}

const getTokenPrice = async() =>
{
    var idx;
    var tokenPrices = [];

    console.log("Trying to get all token price...\n");

    try{
        for(idx = 0; idx < networkIDList.length; idx++)
        {
            var tokenList = erc20TokenList[networkIDList[idx]]["token_address"];
            var routerList = dexRouterList[networkIDList[idx]]["router_address"];
            tokenPrices[networkIDList[idx]] = await swapContracts[networkIDList[idx]].methods.getTokenPrice(tokenList, routerList).call();
        }
    } catch(e){
        console.log("Getting token price error!", e);
    }
    
    console.log("Succeed in getting all token price.\n");
    
    return tokenPrices;
}

//catch info from web3
export { getBalancesOfAccount, getTokenPrice };


const catchNewERC20TokenPerNetwork = async(networkID) =>
{    
    var currentBlockNumber = await web3List[networkID].eth.getBlockNumber();
    var fromBlockNumber, toBlockNumber;
    var idx;
    var result, checkingResult;
    var newAddressList = [], newTokenList = [];
    var dbSuccess;

    // checkErc20BlockNumber[networkID] = 10494812 - 2000;

    if( checkErc20BlockNumber[networkID] < currentBlockNumber )
    {
        fromBlockNumber = checkErc20BlockNumber[networkID];
        toBlockNumber = checkErc20BlockNumber[networkID] + 2000 > currentBlockNumber ? currentBlockNumber : checkErc20BlockNumber[networkID] + 2000;
          
        console.log("Trying to fetch new erc20 token address.", fromBlockNumber, toBlockNumber);
        try{
            result = await web3List[networkID].eth.getPastLogs({
                fromBlock: fromBlockNumber,
                toBlock: toBlockNumber,
                topics:[
                    "0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0",
                    "0x0000000000000000000000000000000000000000000000000000000000000000"
                ]
            });

            console.log("Fetched new token address.", result.length);
        } catch(e){    
            console.log("Failed to fetch token address.\n");
            setTimeout(catchNewERC20TokenPerNetwork(networkID), 1000);
        }

        newAddressList = [];

        for(idx = 0; idx < result.length; idx++){
            if( result[idx].data == '0x' ){
                newAddressList.push( result[idx].address );
            }
        }

        console.log("Trying to check contract is ERC20...\n");

        try{
            checkingResult = await swapContracts[networkID].methods.checkERC20(newAddressList).call();
        } catch(e){
            console.log("Failed in checking contract address.", e);
            setTimeout(catchNewERC20TokenPerNetwork(networkID), 1000);
        }

        // console.log("checkingResult\n", checkingResult);

        newTokenList = [];        

        for( idx = 0; idx < checkingResult.length; idx++ )
        {
            var check = checkingResult[idx].isERC20 == true ? 1:0;
            if( check == 1)
            {                
                var tokenItem = [];
                tokenItem["network_id"] = networkID;
                tokenItem["token_address"] = newAddressList[idx];
                tokenItem["token_name"] = checkingResult[idx].name;
                tokenItem["token_symbol"] = checkingResult[idx].symbol;
                tokenItem["token_decimal"] = checkingResult[idx].decimals;
                tokenItem["token_logo"] = "";
                tokenItem["token_type"] = 2;
                newTokenList.push(tokenItem);
            }
        }

        dbSuccess = false;

        if( newTokenList.length > 0 )
        {
            dbSuccess = await database.insertNewERC20Tokens(newTokenList);
        }

        if( dbSuccess == true ){
            checkErc20BlockNumber[networkID] += 2000;
        }
        setTimeout(catchNewERC20TokenPerNetwork, 10, networkID);
    } else{
        setTimeout(catchNewERC20TokenPerNetwork, 1000, networkID);
    }
}

const catchNewERC20Token = async() =>
{
    var idx;

    for(idx = 0; idx < networkIDList.length; idx++)
    {
        catchNewERC20TokenPerNetwork(networkIDList[idx]);        
    }    
}

export { catchNewERC20Token };

