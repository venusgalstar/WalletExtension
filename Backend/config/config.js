// var swapOnAvalanche = require("./swapOnAvalanche.json");
import swapOnAvalanche from './swapOnAvalanche.json' assert {type: 'json'};

var config = {
    "HOST"     : "127.0.0.1",
    "USER"     : "root",
    "PASSWORD" : "",
    "DATABASE" : "wallet",
    "PORT": 9000,
    "PKEY": "644f579152f99037f56150bcac0420b69936dbf5b29b3267cbe9ce21601c3060",

    "43113" :     
    {
        "abi": swapOnAvalanche,
        "address": "0xCC66C5daA52427d212254C07D58825bF1BCF3548"
    }    
}

export {config};
