import {config} from './config/config.js';
import Web3 from "web3";
import * as database from './database.js';

// init web3
let web3List;
let networkIDList;
let erc20TokenList;
let dexRouterList;
let swapContracts;
let checkErc20BlockNumber;

const initNetworkIDList = async(newNetworkIDList) =>
{
    var idx;

    networkIDList = [];
    web3List = [];
    checkErc20BlockNumber = [];    
    
    console.log("Trying to initialize web3 object for each network... \n", newNetworkIDList);

    try{
        for(idx = 0; idx < newNetworkIDList.length; idx++)
        {
            console.log(newNetworkIDList[idx].rpc_url);

            networkIDList.push(newNetworkIDList[idx].id);
            web3List[newNetworkIDList[idx].id] = new Web3(new Web3.providers.HttpProvider(newNetworkIDList[idx].rpc_url)); 

            checkErc20BlockNumber[newNetworkIDList[idx].id] = newNetworkIDList[idx].scanned_block_num;

        }
    } catch(e){
        console.log("Web3 init error! Try again every 1 second. \n", e);
        setTimeout(initNetworkIDList, 1000);
        return;
    }; 

    // console.log("web3List", web3List);

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

    swapContracts = [];

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
        return;
    };   

    console.log("Succeed in initializing SwapContract Object... \n");
}

//init variables and constant
export { initNetworkIDList, initERC20TokenList, initDexRouterList, initSwapContracts};

const getBalancesOfAccount = async(account) =>
{   
    var idx;
    var tokenBalances = new Object();
    var watchedTokenList = [];
    var numberOfGroup = 1500;

    console.log("Trying to get all token balance of specific account...\n");

    for(idx = 0; idx < networkIDList.length; idx++)
    {        
        tokenBalances[networkIDList[idx]] = [];
        watchedTokenList = [];
        watchedTokenList["address"] = [];
        watchedTokenList["balance"] = [];

        var tokenList = erc20TokenList[networkIDList[idx]]["token_address"];
        // tokenBalances[networkIDList[idx]] = await swapContracts[networkIDList[idx]].methods.getBalance(account, tokenList).call();

        // Getting balances of all tokens in database for this account
        // And fetching tokens whoose balance of this account isn't zero.
        var startSlice = 0, endSlice = 0;
        var slicedTokenList;
        const promise = [];

        while(endSlice < 5000)
        {
            
            endSlice = startSlice + numberOfGroup > tokenList.length ? tokenList.length : startSlice + numberOfGroup;

            if( startSlice == endSlice )
                break;

            slicedTokenList = tokenList.slice(startSlice, endSlice);
            startSlice = endSlice;

            console.log("endslice", endSlice);

            promise.push(swapContracts[networkIDList[idx]].methods.getBalance(account, slicedTokenList).call());
            break;
        }

        await Promise.all(promise).then((result)=>{
            var idxResult, idxItem;

            for(idxResult = 0; idxResult < result.length; idxResult++)
            {
                for(idxItem = 0; idxItem < result[idxResult].length; idxItem++)
                {
                    if( result[idxResult][idxItem] != '0' )
                    {
                        watchedTokenList["address"].push(tokenList[idxResult * numberOfGroup + idxItem]);
                        watchedTokenList["balance"].push(result[idxResult][idxItem]);
                        watchedTokenList.push(erc20TokenList[networkIDList[idx]][idxResult * numberOfGroup + idxItem]);
                    }                    
                }
            }
        }).catch((e)=>{
            console.log("error occured!", e);
        });

        // Now we should get token prices
        var routerList = dexRouterList[networkIDList[idx]]["router_address"];
        // tokenPrices[networkIDList[idx]] = await swapContracts[networkIDList[idx]].methods.getTokenPrice(tokenList, routerList).call();
        await swapContracts[networkIDList[idx]].methods.getTokenPrice(watchedTokenList["address"], routerList).call().then((result)=>{
            
            var idxToken;

            for( idxToken = 0; idxToken < watchedTokenList["address"].length; idxToken++ )
            {
                var newTokenItem = new Object();
                newTokenItem["address"] = watchedTokenList["address"][idxToken];
                newTokenItem["balance"] = watchedTokenList["balance"][idxToken];
                newTokenItem["decimals"] = watchedTokenList[idxToken]["token_decimal"];
                newTokenItem["image"] = watchedTokenList[idxToken]["token_logo"];
                newTokenItem["string"] = "";
                newTokenItem["symbol"] = watchedTokenList[idxToken]["token_symbol"];
                newTokenItem["usdPrice"] = "";//?????
                newTokenItem["name"] = watchedTokenList[idxToken]["token_name"];
                newTokenItem["chainId"] = networkIDList[idx];
                tokenBalances[networkIDList[idx]].push(newTokenItem);
            }

        }).catch((e)=>{
            console.log("Getting token price error!", e);
        });

    }

    console.log("Succeed in getting all token balance of specific account...\n");

    return tokenBalances;
}

const getTokenPrice = async() =>
{
    var idx;
    var tokenPrices = [];

    console.log("Trying to get all token price...\n");

    for(idx = 0; idx < networkIDList.length; idx++)
    {
        var tokenList = erc20TokenList[networkIDList[idx]]["token_address"];
        var routerList = dexRouterList[networkIDList[idx]]["router_address"];
        // tokenPrices[networkIDList[idx]] = await swapContracts[networkIDList[idx]].methods.getTokenPrice(tokenList, routerList).call();
        await swapContracts[networkIDList[idx]].methods.getTokenPrice(tokenList, routerList).call().then((result)=>{
            tokenPrices[networkIDList[idx]] = result;
        }).catch((e)=>{
            console.log("Getting token price error!", e);
        });
    }
    
    console.log("Succeed in getting all token price.\n");
    
    return tokenPrices;
}

//catch info from web3
export { getBalancesOfAccount, getTokenPrice };

const catchNewSemiERC20TokenPerNetwork = async(networkID, currentBlockNumber) =>
{    
    var fromBlockNumber, toBlockNumber;
    var idx;
    var newTokenFetchResult = [];
    var newERC20TokenList = [];

    fromBlockNumber = checkErc20BlockNumber[networkID];
    toBlockNumber = checkErc20BlockNumber[networkID] + 2000 > currentBlockNumber ? currentBlockNumber : checkErc20BlockNumber[networkID] + 2000;
    
    web3List[networkID].eth.getPastLogs({
        fromBlock: fromBlockNumber,
        toBlock: toBlockNumber,
        topics:[
            "0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0",
            "0x0000000000000000000000000000000000000000000000000000000000000000"
        ]
    }).then((res)=>{
        newTokenFetchResult = res;
        console.log("Trying to fetch new erc20 token address.", networkID, fromBlockNumber, toBlockNumber);
        console.log("Fetched new token address.",networkID, newTokenFetchResult.length);

        checkErc20BlockNumber[networkID] = toBlockNumber;
        
        console.log("Starting to check token is ERC20...\n", networkID, newTokenFetchResult.length);
    
        for(idx = 0; idx < newTokenFetchResult.length; idx++){
            
            if( newTokenFetchResult[idx].data != '0x' )
                continue;
            
            swapContracts[networkID].methods.checkERC20(newTokenFetchResult[idx].address).call().then((result)=>{
                
                var tokenItem = [];
                newERC20TokenList = [];
    
                if( result.name == "" || result.symbol == "" )
                {
                    console.log("Found error ERC20...");
                    return;
                }
    
                tokenItem["network_id"] = networkID;
                tokenItem["token_address"] = newTokenFetchResult[idx].address;
                tokenItem["token_name"] = result.name;
                tokenItem["token_symbol"] = result.symbol;
                tokenItem["token_decimal"] = result.decimals;
                tokenItem["token_logo"] = "";
                tokenItem["token_type"] = 2;
    
                newERC20TokenList.push(tokenItem);

                console.log("Fetched ERC20 address", networkID, tokenItem["token_address"]);

                database.insertNewERC20Tokens(newERC20TokenList);

                // if( idx == newTokenFetchResult.length - 1 )
                // {                    
                //     database.updateScannedBlockNum(networkID, checkErc20BlockNumber[networkID]);
                // }
 
            }).catch((e)=>{
                console.log(e);
    
            });  
        }
        database.updateScannedBlockNum(networkID, checkErc20BlockNumber[networkID]);
        setTimeout(catchNewERC20TokenPerNetwork, 1000, networkID);
        
    }).catch((e)=>{
        console.log("Failed to fetch token address.\n", e);
        setTimeout(catchNewERC20TokenPerNetwork, 1000, networkID);
    });
}

const catchNewERC20TokenPerNetwork = async(networkID) =>
{    
    var currentBlockNumber = checkErc20BlockNumber[networkID];

    web3List[networkID].eth.getBlockNumber().then((result)=>{
        currentBlockNumber = result;

        console.log("catchNewERC20TokenPerNetwork", networkID, checkErc20BlockNumber[networkID], currentBlockNumber);

        if( checkErc20BlockNumber[networkID] < currentBlockNumber )
        {
            catchNewSemiERC20TokenPerNetwork(networkID, currentBlockNumber);
        }

    }).catch((e)=>{
        // console.log("Error in getBlockNumber", e);
        setTimeout(catchNewERC20TokenPerNetwork, 1000, networkID);
    });

}

const catchNewERC20Token = async() =>
{
    var idx;

    for(idx = 0; idx < networkIDList.length; idx++)
    {
        console.log("catchNewERC20Token", networkIDList[idx]);
        catchNewERC20TokenPerNetwork(networkIDList[idx]); 
    }    
}

export { catchNewERC20Token };

