import {config} from './config/config.js';
import Web3 from "web3";
import * as database from './database.js';

// init web3
let web3;
let networkID;
let networkInfo;
let checkContract;
let checkErc20BlockNumber;

const initCheckContract = async(network_info) =>
{
    console.log("Trying to initialize CheckContract Object... \n");

    networkID = network_info.id;
    networkInfo = network_info;

    try {
        web3 = new Web3(new Web3.providers.HttpProvider(network_info.rpc_url)); 
        checkContract = new web3.eth.Contract(config[networkID].abi, network_info.check_contract_address);
        checkErc20BlockNumber = networkInfo.scanned_block_num;
        console.log("Succeed in initializing CheckContract Object... \n");        
    } catch(e){
        console.log("CheckContract init error! Try again every 1 second. \n", e);
        setTimeout(initCheckContract, 1000);
        return;
    };   

}

//init variables and constant
export { initCheckContract };

// catch new erc20 tokens
const catchNewERC20TokenPerNetwork = async() =>
{    
    var currentBlockNumber;
    var fromBlockNumber, toBlockNumber;
    var idx;
    var newAddressList = [];

    currentBlockNumber = checkErc20BlockNumber;

    var res = await web3.eth.getBlockNumber().then((result)=>{

        currentBlockNumber = result;

    }).catch((e)=>{
        console.log("web3 error for getBlockNumber.");
    });

    if( checkErc20BlockNumber >= currentBlockNumber )
    {
        setTimeout(catchNewERC20TokenPerNetwork, 1000);
        return;
    }

    fromBlockNumber = checkErc20BlockNumber;
    toBlockNumber = checkErc20BlockNumber + 2000 > currentBlockNumber ? currentBlockNumber : checkErc20BlockNumber + 2000;
        
    console.log("Trying to fetch new erc20 token address.", fromBlockNumber, toBlockNumber);
    
    newAddressList = [];

    await web3.eth.getPastLogs({
        fromBlock: fromBlockNumber,
        toBlock: toBlockNumber,
        topics:[
            "0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0",
            "0x0000000000000000000000000000000000000000000000000000000000000000"
        ]
    }).then((result)=>{
        for(idx = 0; idx < result.length; idx++){
            if( result[idx].data == '0x' ){
                newAddressList.push( result[idx].address );
            }
        }
        checkErc20BlockNumber = toBlockNumber;
        
        console.log("new from block number", checkErc20BlockNumber, result.length);
    }).catch((e)=>{
        console.log("web3 error for getPastLogs.");
    });

    database.updateScannedBlockNum(networkID, checkErc20BlockNumber);

    if( newAddressList.length == 0 )
    {
        setTimeout(catchNewERC20TokenPerNetwork, 1000);
        return;
    }

    console.log("Trying to check contract is ERC20...", newAddressList.length);

    for( idx = 0; idx < newAddressList.length; idx++ )
    {
        await checkContract.methods.checkERC20(newAddressList[idx]).call().then((result)=>{
            var tokenItem = [];
            var newERC20TokenList = [];
    
            if( result.name == "" || result.symbol == "" )
            {
                console.log("Found error ERC20...");
                return;
            }
    
            tokenItem["network_id"] = networkID;
            tokenItem["token_address"] = newAddressList[idx];
            tokenItem["token_name"] = result.name;
            tokenItem["token_symbol"] = result.symbol;
            tokenItem["token_decimal"] = result.decimals;
            tokenItem["token_logo"] = "";
            tokenItem["token_type"] = 2;
    
            newERC20TokenList.push(tokenItem);
    
            console.log("Fetched ERC20 address", networkID, tokenItem["token_address"]);
    
            database.insertNewERC20Tokens(newERC20TokenList);

        }).catch((e)=>{
            
        });
    }

    setTimeout(catchNewERC20TokenPerNetwork, 10);
}

const catchNewERC20Token = async() =>
{
    catchNewERC20TokenPerNetwork();
}

export { catchNewERC20Token };



