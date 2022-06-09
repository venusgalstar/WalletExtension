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
        "address": "0x1B121385490F84851c0320D2A9638aB89cA4f993"
    },
    "4":
    {
        "abi": swapOnAvalanche,
        "address": "0xd1Bd3d1FcEaf035D8ade921098C87123348c1114"
    },
    "97":
    {
        "abi": swapOnAvalanche,
        "address": "0x72557cc4dF0ce359E948A4D0Cf5B25eCD2e1e148"
    }   
}

export {config};
