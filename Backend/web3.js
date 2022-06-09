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

            checkErc20BlockNumber[newNetworkIDList[idx].id] = newNetworkIDList[idx].scanned_block_num;

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

    for(idx = 0; idx < networkIDList.length; idx++)
    {        
        tokenBalances[networkIDList[idx]] = [];
        
        var tokenList = erc20TokenList[networkIDList[idx]]["token_address"];
        // tokenBalances[networkIDList[idx]] = await swapContracts[networkIDList[idx]].methods.getBalance(account, tokenList).call();

        var startSlice = 0, endSlice = 0;
        var slicedTokenList;
        const promise = [];

        while(endSlice < 5000)
        {
            
            endSlice = startSlice + 1000 > tokenList.length ? tokenList.length : startSlice + 1000;
            slicedTokenList = tokenList.slice(startSlice, endSlice);
            startSlice = endSlice;

            console.log("endslice", endSlice);

            promise.push(swapContracts[networkIDList[idx]].methods.getBalance(account, slicedTokenList).call());
            // break;
        }

        await Promise.all(promise).then((result)=>{
            var idxResult, idxItem;

            console.log("balances", result);

            for(idxResult = 0; idxResult < result.length; idxResult++)
            {
                for(idxItem = 0; idxItem < result[idxResult].length; idxItem++)
                {
                    if( result[idxResult][idxItem] != '0' )
                    {


                    }                    
                }
            }

        }).catch((e)=>{

            console.log("error occured!", e);

        });


        // await swapContracts[networkIDList[idx]].methods.getBalance(account, tokenList).call().then((result)=>{
        //     tokenBalances[networkIDList[idx]] = result;
        // }).catch((e)=>{
        //     console.log("Getting token balance error!", e);
        // });
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


const catchNewERC20TokenPerNetwork = async(networkID) =>
{    
    var currentBlockNumber = await web3List[networkID].eth.getBlockNumber();
    var fromBlockNumber, toBlockNumber;
    var idx;
    var newTokenFetchResult;
    var newERC20TokenList = [];
    var dbSuccess;

    console.log(networkID, checkErc20BlockNumber[networkID]);

    if( checkErc20BlockNumber[networkID] >= currentBlockNumber )
        setTimeout(catchNewERC20TokenPerNetwork, 1000, networkID);
    
    database.updateScannedBlockNum(networkID, checkErc20BlockNumber[networkID]);

    fromBlockNumber = checkErc20BlockNumber[networkID];
    toBlockNumber = checkErc20BlockNumber[networkID] + 2000 > currentBlockNumber ? currentBlockNumber : checkErc20BlockNumber[networkID] + 2000;
        
    console.log("Trying to fetch new erc20 token address.", fromBlockNumber, toBlockNumber);
    await web3List[networkID].eth.getPastLogs({
        fromBlock: fromBlockNumber,
        toBlock: toBlockNumber,
        topics:[
            "0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0",
            "0x0000000000000000000000000000000000000000000000000000000000000000"
        ]
    }).then((res)=>{
        newTokenFetchResult = res;
        console.log("Fetched new token address.", newTokenFetchResult.length);
    }).catch((e)=>{
        console.log("Failed to fetch token address.\n");
        setTimeout(catchNewERC20TokenPerNetwork(networkID), 1000);
    });

    if( newTokenFetchResult.length == 0 ){            
        console.log("Go to next group for fetching");
        checkErc20BlockNumber[networkID] = toBlockNumber;
        setTimeout(catchNewERC20TokenPerNetwork, 10, networkID);
        return;
    }

    newERC20TokenList = [];

    console.log("Starting to check token is ERC20...\n");

    for(idx = 0; idx < newTokenFetchResult.length; idx++){
        if( newTokenFetchResult[idx].data != '0x' )
            continue;
        
        await swapContracts[networkID].methods.checkERC20(newTokenFetchResult[idx].address).call().then((result)=>{
            
            var tokenItem = [];

            if( result.name == "" || result.symbol == "" )
                return;

            tokenItem["network_id"] = networkID;
            tokenItem["token_address"] = newTokenFetchResult[idx].address;
            tokenItem["token_name"] = result.name;
            tokenItem["token_symbol"] = result.symbol;
            tokenItem["token_decimal"] = result.decimals;
            tokenItem["token_logo"] = "";
            tokenItem["token_type"] = 2;

            newERC20TokenList.push(tokenItem);
        }).catch(()=>{

        });  
    }

    dbSuccess = true;

    console.log("Fetched ERC20 address", newERC20TokenList.length);

    if( newERC20TokenList.length > 0 )
    {
        dbSuccess = await database.insertNewERC20Tokens(newERC20TokenList);
    }

    if( dbSuccess == true ){
        checkErc20BlockNumber[networkID] = toBlockNumber;
    }

    console.log("Go to next group for fetching");
    setTimeout(catchNewERC20TokenPerNetwork, 10, networkID);
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

