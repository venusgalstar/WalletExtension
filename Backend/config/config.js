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
        "address": "0x0F735097B18C39Af7668fBf620f7EBa583baF80b"
    }    
}

export {config};
