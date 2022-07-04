import { useState, useEffect, useRef, useCallback } from 'react';
import TokenTracker from '@metamask/eth-token-tracker';
import axios from 'axios';
import Web3 from "web3";
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { getCurrentChainId, getNativeBalance, getSelectedAddress, getTotalNetworths } from '../selectors';
import { SECOND } from '../../shared/constants/time';
import { isEqualCaseInsensitive } from '../helpers/utils/util';
import { useEqualityCheck } from './useEqualityCheck';
import { calcTokenAmount } from '../helpers/utils/token-util';
import { updateERC20TokenLists, updateNativeBalance, updateNativeCurrencyUSDRate, updateNetWorthOnUSD, updateTotalNetWorths } from '../store/actions';
import { usePrevious } from './usePrevious';
import { AVALANCHE_CHAIN_ID, BSC_CHAIN_ID, FANTOM_CHAIN_ID, MAINNET_CHAIN_ID, POLYGON_CHAIN_ID,  } from '../../shared/constants/network';
import { COINGEKCO_NETWORK_ID, HTTP_PROVIDERS, WRAPPED_CURRENCY_ADDRESSES } from '../ducks/swaps/swap_config';

export function useTokenTracker(
  tokens,
  includeFailedTokens = false,
  hideZeroBalanceTokens = true,
) {
  const userAddress = useSelector(getSelectedAddress, shallowEqual);
  const previousUserAddress = usePrevious(userAddress);
  const [loading, setLoading] = useState(() => tokens?.length >= 0);
  const [tokensWithBalances, setTokensWithBalances] = useState([]);
  const [error, setError] = useState(null);
  const memoizedTokens = useEqualityCheck(tokens);
  const [seconds, setSeconds] = useState(0);
  const dispatch = useDispatch();    
  
  const avaxBalance = useSelector(state => state.metamask.nativeBalance[AVALANCHE_CHAIN_ID]);
  const previousAvaxBalance = usePrevious(avaxBalance);
  
  const bnbBalance = useSelector(state => state.metamask.nativeBalance[BSC_CHAIN_ID]);
  const previousBnbBalance = usePrevious(bnbBalance);
  
  const maticBalance = useSelector(state => state.metamask.nativeBalance[POLYGON_CHAIN_ID]);
  const previousMaticBalance = usePrevious(maticBalance);
  
  const fantomBalance = useSelector(state => state.metamask.nativeBalance[FANTOM_CHAIN_ID]);
  const previousFantomBalance = usePrevious(fantomBalance);

  const totalNetworth = useSelector(getTotalNetworths, shallowEqual);
  const previousTotalNetworth = usePrevious(totalNetworth);

  const useInterval = (callback, delay) => {
    const savedCallback = useRef();
  
    useEffect(() => {
      savedCallback.current = callback;
    }, [callback]);
  
    useEffect(() => {
      const tick = () => {
        savedCallback.current();
      }
      if (delay !== null) {
        let id = setInterval(tick, delay);
        return () => clearInterval(id);
      }
    }, [delay]);
  };
  
  const fetchNativeBalances  = async () =>{

    let chainId = AVALANCHE_CHAIN_ID;
    try{          
      let provider = new Web3.providers.HttpProvider(HTTP_PROVIDERS[chainId]);
      let web3 = new Web3(provider);
      let data = await web3.eth.getBalance(userAddress);
      let amount = Number(calcTokenAmount(Number(data), 18));

      if (amount !== previousAvaxBalance) 
      {     
        let usdRate = 0;    
        let wAddr = WRAPPED_CURRENCY_ADDRESSES[chainId];

        var tokenPriceData = await axios.get(`https://api.coingecko.com/api/v3/simple/token_price/${COINGEKCO_NETWORK_ID[chainId]}?contract_addresses=${wAddr}&vs_currencies=usd`, {});
        
        if(tokenPriceData.data[wAddr.toString().toLowerCase()].usd)
        {             
          usdRate = tokenPriceData.data[wAddr.toString().toLowerCase()].usd;
          dispatch(updateNativeCurrencyUSDRate(chainId, tokenPriceData.data[wAddr.toString().toLowerCase()].usd));
        }

        let previousNetworth = Number(usdRate) * previousAvaxBalance;
        let netWorth = Number(usdRate) * amount;    
        dispatch(updateTotalNetWorths(Number(totalNetworth) + Number(netWorth) - Number(previousNetworth)));
        dispatch(updateNativeBalance(chainId, amount));
      }
    }catch(e)
    {  
    }

    chainId = BSC_CHAIN_ID;
    try{          
      let provider = new Web3.providers.HttpProvider(HTTP_PROVIDERS[chainId]);
      let web3 = new Web3(provider);
      let data = await web3.eth.getBalance(userAddress);
      let amount = Number(calcTokenAmount(Number(data), 18));

      if (amount !== previousAvaxBalance) 
      {     
        console.log("[useTokenTracker.js] update bnb prices ");
        let usdRate = 0;    
        let wAddr = WRAPPED_CURRENCY_ADDRESSES[chainId];

        var tokenPriceData = await axios.get(`https://api.coingecko.com/api/v3/simple/token_price/${COINGEKCO_NETWORK_ID[chainId]}?contract_addresses=${wAddr}&vs_currencies=usd`, {});
        
        if(tokenPriceData.data[wAddr.toString().toLowerCase()].usd)
        {             
          usdRate = tokenPriceData.data[wAddr.toString().toLowerCase()].usd;
          dispatch(updateNativeCurrencyUSDRate(chainId, tokenPriceData.data[wAddr.toString().toLowerCase()].usd));
        }

        let previousNetworth = Number(usdRate) * previousAvaxBalance;
        let netWorth = Number(usdRate) * amount;    
        dispatch(updateTotalNetWorths(Number(totalNetworth) + Number(netWorth) - Number(previousNetworth)));
        dispatch(updateNativeBalance(chainId, amount));
      }
    }catch(e)
    {     
    }
    
    chainId = POLYGON_CHAIN_ID;
    try{          
      let provider = new Web3.providers.HttpProvider(HTTP_PROVIDERS[chainId]);
      let web3 = new Web3(provider);
      let data = await web3.eth.getBalance(userAddress);
      let amount = Number(calcTokenAmount(Number(data), 18));

      if (amount !== previousAvaxBalance) 
      {     
        console.log("[useTokenTracker.js] update bnb prices ");
        let usdRate = 0;    
        let wAddr = WRAPPED_CURRENCY_ADDRESSES[chainId];

        var tokenPriceData = await axios.get(`https://api.coingecko.com/api/v3/simple/token_price/${COINGEKCO_NETWORK_ID[chainId]}?contract_addresses=${wAddr}&vs_currencies=usd`, {});
        
        if(tokenPriceData.data[wAddr.toString().toLowerCase()].usd)
        {             
          usdRate = tokenPriceData.data[wAddr.toString().toLowerCase()].usd;
          dispatch(updateNativeCurrencyUSDRate(chainId, tokenPriceData.data[wAddr.toString().toLowerCase()].usd));
        }

        let previousNetworth = Number(usdRate) * previousAvaxBalance;
        let netWorth = Number(usdRate) * amount;    
        dispatch(updateTotalNetWorths(Number(totalNetworth) + Number(netWorth) - Number(previousNetworth)));
        dispatch(updateNativeBalance(chainId, amount));
      }
    }catch(e)
    {      
    }
    
    chainId = FANTOM_CHAIN_ID;
    try{          
      let provider = new Web3.providers.HttpProvider(HTTP_PROVIDERS[chainId]);
      let web3 = new Web3(provider);
      let data = await web3.eth.getBalance(userAddress);
      let amount = Number(calcTokenAmount(Number(data), 18));

      if (amount !== previousAvaxBalance) 
      {     
        let usdRate = 0;    
        let wAddr = WRAPPED_CURRENCY_ADDRESSES[chainId];

        var tokenPriceData = await axios.get(`https://api.coingecko.com/api/v3/simple/token_price/${COINGEKCO_NETWORK_ID[chainId]}?contract_addresses=${wAddr}&vs_currencies=usd`, {});
        
        if(tokenPriceData.data[wAddr.toString().toLowerCase()].usd)
        {             
          usdRate = tokenPriceData.data[wAddr.toString().toLowerCase()].usd;
          dispatch(updateNativeCurrencyUSDRate(chainId, tokenPriceData.data[wAddr.toString().toLowerCase()].usd));
        }

        let previousNetworth = Number(usdRate) * previousAvaxBalance;
        let netWorth = Number(usdRate) * amount;    
        dispatch(updateTotalNetWorths(Number(totalNetworth) + Number(netWorth) - Number(previousNetworth)));
        dispatch(updateNativeBalance(chainId, amount));
      }
    }catch(e)
    {       
    }
  }

  useInterval(() => {
    setSeconds(seconds + 1);
    console.log("[useTokenTracker.js] ", seconds+1);
        
    fetchNativeBalances();
  }, 5000);

  // Effect to set loading state and initialize tracker when values change
  useEffect(() => {
    // This effect will only run initially and when:
    // 1. chainId is updated,
    // 2. userAddress is changed,
    // 3. token list is updated and not equal to previous list
    // in any of these scenarios, we should indicate to the user that their token
    // values are in the process of updating by setting loading state.

    let totalNetworth = 0;
    let allTokens = [];

    if(previousUserAddress !== userAddress)
    {
      allTokens = [];
      totalNetworth = 0; 
      setTokensWithBalances([]);
    }

    setLoading(true);

    const cutUnderpointNumber = (valueStr, underpointDigit) => 
    {
      let strValue = valueStr;
      let pointIndex = strValue.indexOf(".");
      if(pointIndex === -1) return valueStr;
      else{
        let len = strValue.length;
        let m = len - pointIndex - 1;
        let upper = strValue.substring(0, pointIndex);
        let lower = strValue.substring(pointIndex+1, len);
        return upper+"."+lower.substring(0, underpointDigit);
      }      
    }

    const fetchTokens = async () => {
      
      let netWorth = 0;
      let chainId = AVALANCHE_CHAIN_ID;

      try {
        let usdRate = 0;    
        let wAddr = WRAPPED_CURRENCY_ADDRESSES[chainId];

        try{          
          let provider = new Web3.providers.HttpProvider(HTTP_PROVIDERS[chainId]);
          let web3 = new Web3(provider);
          let data = await web3.eth.getBalance(userAddress);
          
          if (data) {
            
            var tokenPriceData = await axios.get(`https://api.coingecko.com/api/v3/simple/token_price/${COINGEKCO_NETWORK_ID[chainId]}?contract_addresses=${wAddr}&vs_currencies=usd`, {});
            
            if(tokenPriceData.data[wAddr.toString().toLowerCase()].usd)
            {             
              usdRate = tokenPriceData.data[wAddr.toString().toLowerCase()].usd;
              dispatch(updateNativeCurrencyUSDRate(chainId, tokenPriceData.data[wAddr.toString().toLowerCase()].usd));
            }

            netWorth = Number(usdRate) * Number(calcTokenAmount(Number(data), 18).toString());    
            totalNetworth += netWorth;
            dispatch(updateNativeBalance(chainId, Number(calcTokenAmount(Number(data), 18))));
          }
        }catch(e)
        {
          console.log("[useTokenTracker.js] ", e);          
        }

        let tokens = [];  
        const response1 = await axios.get(`https://deep-index.moralis.io/api/v2/${userAddress}/erc20/?chain=${chainId}`, {
          headers: { "X-API-Key": "E6R13cn5GmpRzCNwefYdeHPAbZlV69kIk9vp0rfhhajligQES1WwpWAKxqr7X2J3" },
        });

        // console.log("[useTokenTracker.js] fetchTokens result : ", response1.data);

        if (response1.data && response1.data.length>0) 
        {
          response1.data.forEach((token) => {
            tokens.push({
              address: token.token_address,
              balance: token.balance,
              balanceError: null,
              decimals: token.decimals,
              image: token.logo || token.thumbnail,
              isERC721: false,
              string: cutUnderpointNumber(calcTokenAmount(token.balance, token.decimals).toString(), 2),
              symbol: token.symbol,
              usdPrice: 0,
              name: token.name,
              chainId: chainId
            });
          });

          dispatch(updateERC20TokenLists(chainId, tokens));
          
          for(let idx = 0; idx<tokens.length; idx++)
          {
            let tokenAmount = Number(calcTokenAmount(tokens[idx].balance, tokens[idx].decimals).toString());
            try{
              const tokenPriceData = await axios.get(`https://api.coingecko.com/api/v3/simple/token_price/${COINGEKCO_NETWORK_ID[chainId]}?contract_addresses=${tokens[idx].address}&vs_currencies=usd`, {});              
             
              console.log("[useTokenTracker.js] tokenPriceData.data = ", tokenPriceData.data);
              console.log("[useTokenTracker.js] tokenPriceData.data[tokens[idx].address].usd = ", tokenPriceData.data[tokens[idx].address].usd);
              if(tokenPriceData.data[tokens[idx].address].usd)
              { 
                tokens[idx].usdPrice = (Number(tokenPriceData.data[tokens[idx].address].usd) * tokenAmount).toFixed(2);
                netWorth += Number(tokenPriceData.data[tokens[idx].address].usd) * tokenAmount;       
                totalNetworth += Number(tokenPriceData.data[tokens[idx].address].usd) * tokenAmount;
                dispatch(updateTotalNetWorths(totalNetworth));
                dispatch(updateNetWorthOnUSD(chainId, netWorth));
              }else{
                tokens[idx].usdPrice = 0;
              }
              allTokens = allTokens.concat(tokens[idx]); 
              dispatch(updateERC20TokenLists(chainId, tokens));
              setTokensWithBalances(allTokens);
            }catch(error) {
              tokens[idx].usdPrice = 0;   
              allTokens = allTokens.concat(tokens[idx]); 
              dispatch(updateERC20TokenLists(chainId, tokens));
              setTokensWithBalances(allTokens);
              console.log("[useTokenTracker.js] catching token price error: ", error);
            }
          }
          
          setError(null);
          setLoading(false);

        }
      } catch (error) {
      }
      
      netWorth = 0;
      chainId = BSC_CHAIN_ID;
      
      try {
        let usdRate = 0;    
        let wAddr = WRAPPED_CURRENCY_ADDRESSES[chainId];

        try{          
          let provider = new Web3.providers.HttpProvider(HTTP_PROVIDERS[chainId]);
          let web3 = new Web3(provider);
          let data = await web3.eth.getBalance(userAddress);
          
          if (data) {
            
            var tokenPriceData = await axios.get(`https://api.coingecko.com/api/v3/simple/token_price/${COINGEKCO_NETWORK_ID[chainId]}?contract_addresses=${wAddr}&vs_currencies=usd`, {});
            
            if(tokenPriceData.data[wAddr.toString().toLowerCase()].usd)
            {             
              usdRate = tokenPriceData.data[wAddr.toString().toLowerCase()].usd;
              dispatch(updateNativeCurrencyUSDRate(chainId, tokenPriceData.data[wAddr.toString().toLowerCase()].usd));
            }

            netWorth = Number(usdRate) * Number(calcTokenAmount(Number(data), 18).toString());    
            totalNetworth += netWorth;
            dispatch(updateNativeBalance(chainId, Number(calcTokenAmount(Number(data), 18))));
          }
        }catch(e)
        {       
        }

        let tokens = [];  
        const response1 = await axios.get(`https://deep-index.moralis.io/api/v2/${userAddress}/erc20/?chain=${chainId}`, {
          headers: { "X-API-Key": "E6R13cn5GmpRzCNwefYdeHPAbZlV69kIk9vp0rfhhajligQES1WwpWAKxqr7X2J3" },
        });

        if (response1.data && response1.data.length>0) 
        {
          response1.data.forEach((token) => {
            tokens.push({
              address: token.token_address,
              balance: token.balance,
              balanceError: null,
              decimals: token.decimals,
              image: token.logo || token.thumbnail,
              isERC721: false,
              string: cutUnderpointNumber(calcTokenAmount(token.balance, token.decimals).toString(), 2),
              symbol: token.symbol,
              usdPrice: 0,
              name: token.name,
              chainId: chainId
            });
          });

          dispatch(updateERC20TokenLists(chainId, tokens));
         
          for(let idx = 0; idx<tokens.length; idx++)
          {
            let tokenAmount = Number(calcTokenAmount(tokens[idx].balance, tokens[idx].decimals).toString());
            try{
              const tokenPriceData = await axios.get(`https://api.coingecko.com/api/v3/simple/token_price/${COINGEKCO_NETWORK_ID[chainId]}?contract_addresses=${tokens[idx].address}&vs_currencies=usd`, {});              
              
              if(tokenPriceData.data[tokens[idx].address].usd)
              { 
                tokens[idx].usdPrice = (Number(tokenPriceData.data[tokens[idx].address].usd) * tokenAmount).toFixed(2);
                netWorth += Number(tokenPriceData.data[tokens[idx].address].usd) * tokenAmount;       
                totalNetworth += Number(tokenPriceData.data[tokens[idx].address].usd) * tokenAmount;
                dispatch(updateTotalNetWorths(totalNetworth));
                dispatch(updateNetWorthOnUSD(chainId, netWorth));
              }else{
                tokens[idx].usdPrice = 0;
              }
              allTokens = allTokens.concat(tokens[idx]); 
              dispatch(updateERC20TokenLists(chainId, tokens));
              setTokensWithBalances(allTokens);
            }catch(error) {
              tokens[idx].usdPrice = 0;   
              allTokens = allTokens.concat(tokens[idx]); 
              dispatch(updateERC20TokenLists(chainId, tokens));
              setTokensWithBalances(allTokens);
            }
          }
          
          setError(null);
          setLoading(false);

        }
      } catch (error) {
      }
      
      netWorth = 0;
      chainId = POLYGON_CHAIN_ID;

      try {
        let usdRate = 0;    
        let wAddr = WRAPPED_CURRENCY_ADDRESSES[chainId];

        try{          
          let provider = new Web3.providers.HttpProvider(HTTP_PROVIDERS[chainId]);
          let web3 = new Web3(provider);
          let data = await web3.eth.getBalance(userAddress);
          
          if (data) {
            
            var tokenPriceData = await axios.get(`https://api.coingecko.com/api/v3/simple/token_price/${COINGEKCO_NETWORK_ID[chainId]}?contract_addresses=${wAddr}&vs_currencies=usd`, {});
            
            if(tokenPriceData.data[wAddr.toString().toLowerCase()].usd)
            {             
              usdRate = tokenPriceData.data[wAddr.toString().toLowerCase()].usd;
              dispatch(updateNativeCurrencyUSDRate(chainId, tokenPriceData.data[wAddr.toString().toLowerCase()].usd));
            }

            netWorth = Number(usdRate) * Number(calcTokenAmount(Number(data), 18).toString());    
            totalNetworth += netWorth;
            dispatch(updateNativeBalance(chainId, Number(calcTokenAmount(Number(data), 18))));
          }
        }catch(e)
        {       
        }

        let tokens = [];  
        const response1 = await axios.get(`https://deep-index.moralis.io/api/v2/${userAddress}/erc20/?chain=${chainId}`, {
          headers: { "X-API-Key": "E6R13cn5GmpRzCNwefYdeHPAbZlV69kIk9vp0rfhhajligQES1WwpWAKxqr7X2J3" },
        });

        if (response1.data && response1.data.length>0) 
        {
          response1.data.forEach((token) => {
            tokens.push({
              address: token.token_address,
              balance: token.balance,
              balanceError: null,
              decimals: token.decimals,
              image: token.logo || token.thumbnail,
              isERC721: false,
              string: cutUnderpointNumber(calcTokenAmount(token.balance, token.decimals).toString(), 2),
              symbol: token.symbol,
              usdPrice: 0,
              name: token.name,
              chainId: chainId
            });
          });

          dispatch(updateERC20TokenLists(chainId, tokens));

          for(let idx = 0; idx<tokens.length; idx++)
          {
            let tokenAmount = Number(calcTokenAmount(tokens[idx].balance, tokens[idx].decimals).toString());
            try{
              const tokenPriceData = await axios.get(`https://api.coingecko.com/api/v3/simple/token_price/${COINGEKCO_NETWORK_ID[chainId]}?contract_addresses=${tokens[idx].address}&vs_currencies=usd`, {});              
   
              if(tokenPriceData.data[tokens[idx].address].usd)
              { 
                tokens[idx].usdPrice = (Number(tokenPriceData.data[tokens[idx].address].usd) * tokenAmount).toFixed(2);
                netWorth += Number(tokenPriceData.data[tokens[idx].address].usd) * tokenAmount;       
                totalNetworth += Number(tokenPriceData.data[tokens[idx].address].usd) * tokenAmount;
                dispatch(updateTotalNetWorths(totalNetworth));
                dispatch(updateNetWorthOnUSD(chainId, netWorth));
              }else{
                tokens[idx].usdPrice = 0;
              }
              allTokens = allTokens.concat(tokens[idx]); 
              dispatch(updateERC20TokenLists(chainId, tokens));
              setTokensWithBalances(allTokens);
            }catch(error) {
              tokens[idx].usdPrice = 0;   
              allTokens = allTokens.concat(tokens[idx]); 
              dispatch(updateERC20TokenLists(chainId, tokens));
              setTokensWithBalances(allTokens);
            }
          }
          
          setError(null);
          setLoading(false);

        }
      } catch (error) {
      }
      
      netWorth = 0;
      chainId = FANTOM_CHAIN_ID;

      try {
        let usdRate = 0;    
        let wAddr = WRAPPED_CURRENCY_ADDRESSES[chainId];

        try{          
          let provider = new Web3.providers.HttpProvider(HTTP_PROVIDERS[chainId]);
          let web3 = new Web3(provider);
          let data = await web3.eth.getBalance(userAddress);
          
          if (data) {
            
            var tokenPriceData = await axios.get(`https://api.coingecko.com/api/v3/simple/token_price/${COINGEKCO_NETWORK_ID[chainId]}?contract_addresses=${wAddr}&vs_currencies=usd`, {});
            
            if(tokenPriceData.data[wAddr.toString().toLowerCase()].usd)
            {             
              usdRate = tokenPriceData.data[wAddr.toString().toLowerCase()].usd;
              dispatch(updateNativeCurrencyUSDRate(chainId, tokenPriceData.data[wAddr.toString().toLowerCase()].usd));
            }

            netWorth = Number(usdRate) * Number(calcTokenAmount(Number(data), 18).toString());    
            totalNetworth += netWorth;
            dispatch(updateNativeBalance(chainId, Number(calcTokenAmount(Number(data), 18))));
          }
        }catch(e)
        { 
        }

        let tokens = [];  
        const response1 = await axios.get(`https://deep-index.moralis.io/api/v2/${userAddress}/erc20/?chain=${chainId}`, {
          headers: { "X-API-Key": "E6R13cn5GmpRzCNwefYdeHPAbZlV69kIk9vp0rfhhajligQES1WwpWAKxqr7X2J3" },
        });

        if (response1.data && response1.data.length>0) 
        {
          response1.data.forEach((token) => {
            tokens.push({
              address: token.token_address,
              balance: token.balance,
              balanceError: null,
              decimals: token.decimals,
              image: token.logo || token.thumbnail,
              isERC721: false,
              string: cutUnderpointNumber(calcTokenAmount(token.balance, token.decimals).toString(), 2),
              symbol: token.symbol,
              usdPrice: 0,
              name: token.name,
              chainId: chainId
            });
          });

          dispatch(updateERC20TokenLists(chainId, tokens));

          for(let idx = 0; idx<tokens.length; idx++)
          {
            let tokenAmount = Number(calcTokenAmount(tokens[idx].balance, tokens[idx].decimals).toString());
            try{
              const tokenPriceData = await axios.get(`https://api.coingecko.com/api/v3/simple/token_price/${COINGEKCO_NETWORK_ID[chainId]}?contract_addresses=${tokens[idx].address}&vs_currencies=usd`, {});              
   
              if(tokenPriceData.data[tokens[idx].address].usd)
              { 
                tokens[idx].usdPrice = (Number(tokenPriceData.data[tokens[idx].address].usd) * tokenAmount).toFixed(2);
                netWorth += Number(tokenPriceData.data[tokens[idx].address].usd) * tokenAmount;       
                totalNetworth += Number(tokenPriceData.data[tokens[idx].address].usd) * tokenAmount;
                dispatch(updateTotalNetWorths(totalNetworth));
                dispatch(updateNetWorthOnUSD(chainId, netWorth));
              }else{
                tokens[idx].usdPrice = 0;
              }
              allTokens = allTokens.concat(tokens[idx]); 
              dispatch(updateERC20TokenLists(chainId, tokens));
              setTokensWithBalances(allTokens);
            }catch(error) {
              tokens[idx].usdPrice = 0;   
              allTokens = allTokens.concat(tokens[idx]); 
              dispatch(updateERC20TokenLists(chainId, tokens));
              setTokensWithBalances(allTokens);
            }
          }
          
          setError(null);
          setLoading(false);

        }
      } catch (error) {
      }
    }

    function timer(time) { 
      return new Promise((resolve, reject) => setTimeout(() => resolve(fetchTokens()), time), null);
    }

    if (userAddress && userAddress !== previousUserAddress)
    {        
        timer(10);
    }

    // if (memoizedTokens.length === 0) {
    //   updateBalances([]);
    // }
    // buildTracker(userAddress, memoizedTokens);

  }, [
    userAddress,
    // teardownTracker,
    memoizedTokens,
    // updateBalances,
    // buildTracker,
  ]);

  return { loading, tokensWithBalances, error };
}
