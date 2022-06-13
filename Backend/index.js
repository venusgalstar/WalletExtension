// var {config} = require('./config/config.js');
import {config} from './config/config.js';
import * as web3 from './web3.js';
import * as database from './database.js';


import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
const router = express.Router();

// init web3 contracts
var networkList = database.getNetworkList();
await web3.initNetworkIDList(networkList);

var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors({ origin: "*" }));
app.use(express.json());

router.get('/get_balance', async (req, res) => {
    
    const { account } = req.query;
    var result;

    console.log(account);

    if( account.length != 42)
        result = { msg : "error"};
    else
    {
        // init token address
        var tokenList = database.getERC20TokenList();
        web3.initERC20TokenList(tokenList);

        // init dex list
        var dexRouterList = database.getDexRouterList();
        web3.initDexRouterList(dexRouterList);

        result = await web3.getBalancesOfAccount(account);
    }
        

    console.log(result);
    console.log(JSON.stringify(result));
    
    res.send(result);
});

app.use("/api", router);
app.listen(process.env.PORT || config.PORT, () => console.log(`Listening on port ${config.PORT}...`));
