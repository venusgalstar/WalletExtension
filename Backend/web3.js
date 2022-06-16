import {config} from './config/config.js';
import Web3 from "web3";
import * as database from './database.js';

// init web3
let web3List = [];
let networkIDList = [];
let swapContracts = []; //In this file, swapContract is balanceContract in databse.
let erc20TokenList;
let dexRouterList;

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const initNetworkIDList = async(newNetworkIDList) =>
{
    var idx;
    networkIDList = [];
    web3List = [];
    
    console.log("Trying to initialize web3 object for each network... \n");

    try{
        for(idx = 0; idx < newNetworkIDList.length; idx++)
        {
            networkIDList.push(newNetworkIDList[idx].id);
            web3List[newNetworkIDList[idx].id] = new Web3(new Web3.providers.HttpProvider(newNetworkIDList[idx].rpc_url)); 

            console.log("balance address", newNetworkIDList[idx].id, newNetworkIDList[idx].balance_contract_address);
            swapContracts[newNetworkIDList[idx].id] = new web3List[newNetworkIDList[idx].id].eth.Contract(config[newNetworkIDList[idx].id].abi, newNetworkIDList[idx].balance_contract_address);
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

//init variables and constant
export { initERC20TokenList, initDexRouterList, initNetworkIDList };

const getBalancesOfAccount = async(account) =>
{   
    var idx;
    var tokenBalances = new Object();
    var watchedTokenList = [];
    var numberOfGroup = 10;

    console.log("Trying to get all token balance of specific account...\n");

    for(idx = 0; idx < networkIDList.length; idx++)
    {        
        tokenBalances[networkIDList[idx]] = [];
        var tokenList = erc20TokenList[networkIDList[idx]]["token_address"];
        // tokenBalances[networkID] = await swapContracts[networkID].methods.getBalance(account, tokenList).call();

        // Getting balances of all tokens in database for this account
        // And fetching tokens whoose balance of this account isn't zero.
        var startSlice = 9130, endSlice = 0;
        var slicedTokenList;
        const promise = [];

        while(endSlice < 9140)
        {
            
            endSlice = startSlice + numberOfGroup > tokenList.length ? tokenList.length : startSlice + numberOfGroup;

            if( startSlice == endSlice )
                break;

            slicedTokenList = tokenList.slice(startSlice, endSlice);
            startSlice = endSlice;

            console.log("endslice", endSlice);

            console.log("slicedTokenList", slicedTokenList);

            promise.push(swapContracts[networkIDList[idx]].methods.getBalance(account, slicedTokenList).call());
        }

        var temp = 0;
        await Promise.all(promise).then((result)=>{
            var idxResult, idxItem;

            for(idxResult = 0; idxResult < result.length; idxResult++)
            {
                for(idxItem = 0; idxItem < result[idxResult].length; idxItem++)
                {
                    if( result[idxResult][idxItem] != '0' )
                    {
                        watchedTokenList.push(tokenList[idxResult * numberOfGroup + idxItem]);

                        var newTokenItem = new Object();
                        newTokenItem["address"] = erc20TokenList[networkIDList[idx]][idxResult * numberOfGroup + idxItem]["token_address"];
                        newTokenItem["balance"] = result[idxResult][idxItem];
                        newTokenItem["decimals"] = erc20TokenList[networkIDList[idx]][idxResult * numberOfGroup + idxItem]["token_decimal"];
                        newTokenItem["image"] = erc20TokenList[networkIDList[idx]][idxResult * numberOfGroup + idxItem]["token_logo"];
                        newTokenItem["string"] = "";
                        newTokenItem["symbol"] = erc20TokenList[networkIDList[idx]][idxResult * numberOfGroup + idxItem]["token_symbol"];
                        newTokenItem["usdPrice"] = "";//?????
                        newTokenItem["name"] = erc20TokenList[networkIDList[idx]][idxResult * numberOfGroup + idxItem]["token_name"];
                        newTokenItem["chainId"] = networkIDList[idx];
                        tokenBalances[networkIDList[idx]].push(newTokenItem);
                    }                    
                }
            }
        }).catch((e)=>{
            console.log("error occured!", networkIDList[idx], e);
        });

        // Now we should get token prices
        // var routerList = dexRouterList[networkIDList[idx]]["router_address"];
        // tokenPrices[networkID] = await swapContracts[networkID].methods.getTokenPrice(tokenList, routerList).call();
        // await swapContracts[networkIDList[idx]].methods.getTokenPrice(watchedTokenList["address"], routerList).call().then((result)=>{
            
        //     var idxToken;

        //     for( idxToken = 0; idxToken < watchedTokenList["address"].length; idxToken++ )
        //     {
        //         tokenBalances[networkIDList[idx]][watchedTokenList[idxToken]]["usdPrice"] = result[idxToken];//?????
        //         tokenBalances[networkIDList[idx]].push(newTokenItem);
        //     }

        // }).catch((e)=>{
        //     console.log("Getting token price error!", e);
        // });
        break;
    }

    console.log("Succeed in getting all token balance of specific account...\n");

    return tokenBalances;
}

const getBalancesOfAccount1 = async(account) =>
{   
    var idx;
    var tokenBalances = new Object();    

    console.log("Trying to get all token balance of specific account...\n");

    for(idx = 0; idx < networkIDList.length; idx++)
    {        
        web3List[networkIDList[idx]].eth.getPastLogs({
            fromBlock : 0,
            // toBlock : 2000,
            topics: [
                "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
                null,
                "0x0000000000000000000000000f4C9ca5c722Cd93D8FA1db2B632b31Aa8f30353",
            ]

        }).then(console.log);
        
    }
}

//catch info from web3
export { getBalancesOfAccount, getBalancesOfAccount1 };


