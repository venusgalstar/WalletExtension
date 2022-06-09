import {config} from './config/config.js';
import mysql from 'sync-mysql';

var DB;

var networkList = [];
var erc20TokenList = [];
var dexRouterList = [];

const getNetworkList = () =>
{
    console.log("Trying connect to database...\n");
    
    try {
        DB = new mysql({
            host: config.HOST,
            user: config.USER,
            password: config.PASSWORD,
            database: config.DATABASE
        });
    } catch(e){
        console.log("Failed to connect database! Trying again every 1 second. \n", e);
        setTimeout(getNetworkList, 1000);
    }
    
    console.log("Succeed in establishing connection to database.\n");

    console.log("Trying connect to database...\n");

    try{     
        var query = "SELECT * FROM network_list";
        var result = DB.query(query);
    
        if( result.length == 0 )
        {
            console.log("database isn't correct");
            result = null;
        }

    } catch(e){
        console.log("Web3 init error! Try again every 1 second. \n", e);
        setTimeout(initNetworkIDList, 1000);
    }; 
    
    console.log("Succeed in fetching network data...\n");

    networkList = result;
    
    return networkList;
}

const getERC20TokenList = () =>
{
    var idx, idx1;

    erc20TokenList = [];

    console.log("Trying to get erc20 token list from database... \n");

    try{

        for(idx = 0; idx < networkList.length; idx++)
        {
            var query = "SELECT * FROM erc20_list WHERE network_id = " + networkList[idx].id;
            var result = DB.query(query);

            erc20TokenList[networkList[idx].id] = result;
            erc20TokenList[networkList[idx].id]["token_address"] = [];

            for( idx1 = 0; idx1 < result.length; idx1++ )
            {
                erc20TokenList[networkList[idx].id]["token_address"][idx1] = result[idx1]["token_address"];
            }        
        }
    } catch(e)
    {
        console.log("Failed in fetching erc20 token list from database. Trying again every second\n", e);
        setTimeout(getERC20TokenList, 1000);
    }

    console.log("Succeed in fetching erc20 token list from database. \n");
    
    return erc20TokenList;    
}

const getDexRouterList = () =>
{
    var idx, idx1;
    
    dexRouterList = [];

    for(idx = 0; idx < networkList.length; idx++)
    {
        var query = "SELECT * FROM dex_list WHERE network_id = " + networkList[idx].id;
        var result = DB.query(query);

        
        dexRouterList[networkList[idx].id] = result;

        dexRouterList[networkList[idx].id]["router_address"] = [];

        for( idx1 = 0; idx1 < result.length; idx1++ )
        {
            dexRouterList[networkList[idx].id]["router_address"][idx1] = result[idx1]["router_address"];
        }       

    }

    return dexRouterList;    
}

export {getNetworkList, getERC20TokenList, getDexRouterList};

const insertNewERC20Tokens = async(newTokenList) =>
{
    var idx;
    var query;
    var result;

    if( newTokenList.length == 0 )
        return false;

    try{
        for( idx = 0; idx < newTokenList.length; idx ++)
        {
            query = `SELECT * FROM erc20_list WHERE token_address = '${newTokenList[idx].token_address}'`;
            result = DB.query(query);
    
            if( result.length > 0 )
                continue;
            
            query = "INSERT INTO erc20_list(network_id, token_address, token_name, token_symbol, token_decimal, token_logo, token_type) ";
            query += `VALUES ("${newTokenList[idx].network_id}","${newTokenList[idx].token_address}", "${newTokenList[idx].token_name}", "${newTokenList[idx].token_symbol}", "${newTokenList[idx].token_decimal}", "${newTokenList[idx].token_logo}", "${newTokenList[idx].token_type}")`;
    
            result = DB.query(query);
        }
    } catch(e){
        console.log("Error occurred in inserting erc20_list...\n", e);
        return false;
    }
    return true;
}

const updateScannedBlockNum = async(networkID, newBlockNum) =>
{
    var query = "SELECT scanned_block_num FROM network_list WHERE id = " + networkID;
    var queryResult = DB.query(query);
    var oldBlockNum = queryResult[0].scanned_block_num;

    if( oldBlockNum > newBlockNum )
    {
        console.log("oldBlockNum = , newBlockNum = ", oldBlockNum, newBlockNum);
        return;
    }

    query = `UPDATE network_list SET scanned_block_num = ${newBlockNum} WHERE id = ${networkID}`;
    DB.query(query);


}

export{ insertNewERC20Tokens, updateScannedBlockNum };