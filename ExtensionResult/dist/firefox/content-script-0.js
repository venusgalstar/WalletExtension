LavaPack.loadBundle([[155,{},function(){with(this)return function(){"use strict";return function(e,n,t){let o=chrome.runtime.connect({name:"trezor-connect"});o.onMessage.addListener((e=>{window.postMessage(e,window.location.origin)})),o.onDisconnect.addListener((e=>{o=null})),window.addEventListener("message",(e=>{o&&e.source===window&&e.data&&o.postMessage({data:e.data})}))}}},{package:"<root>",file:"/mnt/d/02_developing/Wallet Developing/ExtensionSource/app/vendor/trezor/content-script.js"}]],[155],{});