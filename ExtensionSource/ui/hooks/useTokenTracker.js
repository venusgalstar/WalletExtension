import { useState, useEffect, useRef, useCallback } from 'react';
import TokenTracker from '@metamask/eth-token-tracker';
import axios from 'axios';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { getSelectedAddress } from '../selectors';
import { SECOND } from '../../shared/constants/time';
import { isEqualCaseInsensitive } from '../helpers/utils/util';
import { useEqualityCheck } from './useEqualityCheck';
import { calcTokenAmount } from '../helpers/utils/token-util';
import { updateERC20TokenLists, updateNativeBalance, updateNativeCurrencyUSDRate, updateNetWorthOnUSD, updateTotalNetWorths } from '../store/actions';
import { usePrevious } from './usePrevious';
import { AVALANCHE_CHAIN_ID, BSC_CHAIN_ID, FANTOM_CHAIN_ID, MAINNET_CHAIN_ID, POLYGON_CHAIN_ID,  } from '../../shared/constants/network';
import { COINGEKCO_NETWORK_ID, WRAPPED_CURRENCY_ADDRESSES } from '../ducks/swaps/swap_config';

export function useTokenTracker(
  tokens,
  includeFailedTokens = false,
  hideZeroBalanceTokens = true,
) {
  const [chainId, setChainId] = useState("0x01");
  const userAddress = useSelector(getSelectedAddress, shallowEqual);
  const previousUserAddress = usePrevious(userAddress);
  const [loading, setLoading] = useState(() => tokens?.length >= 0);
  const [tokensWithBalances, setTokensWithBalances] = useState([]);
  const [error, setError] = useState(null);
  const tokenTracker = useRef(null);
  const memoizedTokens = useEqualityCheck(tokens);
  const dispatch = useDispatch();

  const updateBalances = useCallback(
    (tokenWithBalances) => {

      const matchingTokens = hideZeroBalanceTokens
        ? tokenWithBalances.length>0? tokenWithBalances.filter((token) => Number(token.balance) > 0) : []
        : tokenWithBalances;
      // TODO: improve this pattern for adding this field when we improve support for
      // EIP721 tokens.
      const matchingTokensWithIsERC721Flag = matchingTokens.map((token) => {
        const additionalTokenData = memoizedTokens.find((t) =>
          isEqualCaseInsensitive(t.address, token.address),
        );
        return {
          ...token,
          isERC721: additionalTokenData?.isERC721,
          image: additionalTokenData?.image,
        };
      });

      setTokensWithBalances(matchingTokensWithIsERC721Flag);
      setLoading(false);
      setError(null);
    },
    [hideZeroBalanceTokens, memoizedTokens],
  );

  const showError = useCallback((err) => {
    setError(err);
    setLoading(false);
  }, []);

  const teardownTracker = useCallback(() => {
    if (tokenTracker.current) {
      tokenTracker.current.stop();
      tokenTracker.current.removeAllListeners('update');
      tokenTracker.current.removeAllListeners('error');
      tokenTracker.current = null;
    }
  }, []);

  const buildTracker = useCallback(
    (address, tokenList) => {
      // clear out previous tracker, if it exists.
      teardownTracker();
      tokenTracker.current = new TokenTracker({
        userAddress: address,
        provider: global.ethereumProvider,
        tokens: tokenList,
        includeFailedTokens,
        pollingInterval: SECOND * 8,
        balanceDecimals: 5,
      });

      tokenTracker.current.on('update', updateBalances);
      tokenTracker.current.on('error', showError);
      tokenTracker.current.updateBalances();
    },
    [updateBalances, includeFailedTokens, showError, teardownTracker],
  );

  // Effect to remove the tracker when the component is removed from DOM
  // Do not overload this effect with additional dependencies. teardownTracker
  // is the only dependency here, which itself has no dependencies and will
  // never update. The lack of dependencies that change is what confirms
  // that this effect only runs on mount/unmount
  useEffect(() => {
    return teardownTracker;
  }, [teardownTracker]);
  
  // Effect to set loading state and initialize tracker when values change
  useEffect(() => {
    // This effect will only run initially and when:
    // 1. chainId is updated,
    // 2. userAddress is changed,
    // 3. token list is updated and not equal to previous list
    // in any of these scenarios, we should indicate to the user that their token
    // values are in the process of updating by setting loading state.

    // console.log("[useTokenTracker.js] previousUserAddress = ", previousUserAddress);
    // console.log("[useTokenTracker.js] userAddress = ", userAddress);

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
      
      let chainId = AVALANCHE_CHAIN_ID;
      let netWorth = 0;

      try {
        let usdRate = 0;    
        let wAddr = WRAPPED_CURRENCY_ADDRESSES[chainId];

        var { data } = await axios.get(`https://deep-index.moralis.io/api/v2/erc20/${wAddr}/price?chain=${chainId}`, {
          headers: {
            'X-API-Key': 'E6R13cn5GmpRzCNwefYdeHPAbZlV69kIk9vp0rfhhajligQES1WwpWAKxqr7X2J3'
          }
        });
        if (data && data.usdPrice) {
          usdRate = data.usdPrice;
          // console.log("[useTokenTracker.js] nativeCurrencyUSDRate  = ", data.usdPrice);
          dispatch(updateNativeCurrencyUSDRate(chainId, data.usdPrice));
        }

        var { data } = await axios.get(`https://deep-index.moralis.io/api/v2/${userAddress}/balance?chain=${chainId}`, {
          headers: {
            'X-API-Key': 'E6R13cn5GmpRzCNwefYdeHPAbZlV69kIk9vp0rfhhajligQES1WwpWAKxqr7X2J3'
          }
        });
        if (data && data.balance) {
          // console.log("[useTokenTracker.js] balance  = ", data.balance);
          netWorth = Number(usdRate) * Number(calcTokenAmount(Number(data.balance), 18).toString());    
          totalNetworth += netWorth;
          dispatch(updateNativeBalance(chainId, Number(calcTokenAmount(Number(data.balance), 18))));
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
        console.log("[useTokenTracker.js] fetchTokens error: ", error);
      }
      
      netWorth = 0;
      chainId = BSC_CHAIN_ID;
      
      try {
        let usdRate = 0;    
        let wAddr = WRAPPED_CURRENCY_ADDRESSES[chainId];

        var { data } = await axios.get(`https://deep-index.moralis.io/api/v2/erc20/${wAddr}/price?chain=${chainId}`, {
          headers: {
            'X-API-Key': 'E6R13cn5GmpRzCNwefYdeHPAbZlV69kIk9vp0rfhhajligQES1WwpWAKxqr7X2J3'
          }
        });
        if (data && data.usdPrice) {
          usdRate = data.usdPrice;
          // console.log("[useTokenTracker.js] nativeCurrencyUSDRate  = ", data.usdPrice);
          dispatch(updateNativeCurrencyUSDRate(chainId, data.usdPrice));
        }

        var { data } = await axios.get(`https://deep-index.moralis.io/api/v2/${userAddress}/balance?chain=${chainId}`, {
          headers: {
            'X-API-Key': 'E6R13cn5GmpRzCNwefYdeHPAbZlV69kIk9vp0rfhhajligQES1WwpWAKxqr7X2J3'
          }
        });
        if (data && data.balance) {
          // console.log("[useTokenTracker.js] balance  = ", data.balance);
          netWorth = Number(usdRate) * Number(calcTokenAmount(Number(data.balance), 18).toString());    
          totalNetworth += netWorth;
          dispatch(updateNativeBalance(chainId, Number(calcTokenAmount(Number(data.balance), 18))));
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
        console.log("[useTokenTracker.js] fetchTokens error: ", error);
      }
      
      netWorth = 0;
      chainId = POLYGON_CHAIN_ID;

      try {
        let usdRate = 0;    
        let wAddr = WRAPPED_CURRENCY_ADDRESSES[chainId];

        var { data } = await axios.get(`https://deep-index.moralis.io/api/v2/erc20/${wAddr}/price?chain=${chainId}`, {
          headers: {
            'X-API-Key': 'E6R13cn5GmpRzCNwefYdeHPAbZlV69kIk9vp0rfhhajligQES1WwpWAKxqr7X2J3'
          }
        });
        if (data && data.usdPrice) {
          usdRate = data.usdPrice;
          // console.log("[useTokenTracker.js] nativeCurrencyUSDRate  = ", data.usdPrice);
          dispatch(updateNativeCurrencyUSDRate(chainId, data.usdPrice));
        }

        var { data } = await axios.get(`https://deep-index.moralis.io/api/v2/${userAddress}/balance?chain=${chainId}`, {
          headers: {
            'X-API-Key': 'E6R13cn5GmpRzCNwefYdeHPAbZlV69kIk9vp0rfhhajligQES1WwpWAKxqr7X2J3'
          }
        });
        if (data && data.balance) {
          // console.log("[useTokenTracker.js] balance  = ", data.balance);
          netWorth = Number(usdRate) * Number(calcTokenAmount(Number(data.balance), 18).toString());    
          totalNetworth += netWorth;
          dispatch(updateNativeBalance(chainId, Number(calcTokenAmount(Number(data.balance), 18))));
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
        console.log("[useTokenTracker.js] fetchTokens error: ", error);
      }
      
      netWorth = 0;
      chainId = FANTOM_CHAIN_ID;

      try {
        let usdRate = 0;    
        let wAddr = WRAPPED_CURRENCY_ADDRESSES[chainId];

        var { data } = await axios.get(`https://deep-index.moralis.io/api/v2/erc20/${wAddr}/price?chain=${chainId}`, {
          headers: {
            'X-API-Key': 'E6R13cn5GmpRzCNwefYdeHPAbZlV69kIk9vp0rfhhajligQES1WwpWAKxqr7X2J3'
          }
        });
        if (data && data.usdPrice) {
          usdRate = data.usdPrice;
          // console.log("[useTokenTracker.js] nativeCurrencyUSDRate  = ", data.usdPrice);
          dispatch(updateNativeCurrencyUSDRate(chainId, data.usdPrice));
        }

        var { data } = await axios.get(`https://deep-index.moralis.io/api/v2/${userAddress}/balance?chain=${chainId}`, {
          headers: {
            'X-API-Key': 'E6R13cn5GmpRzCNwefYdeHPAbZlV69kIk9vp0rfhhajligQES1WwpWAKxqr7X2J3'
          }
        });
        if (data && data.balance) {
          // console.log("[useTokenTracker.js] balance  = ", data.balance);
          netWorth = Number(usdRate) * Number(calcTokenAmount(Number(data.balance), 18).toString());    
          totalNetworth += netWorth;
          dispatch(updateNativeBalance(chainId, Number(calcTokenAmount(Number(data.balance), 18))));
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
        console.log("[useTokenTracker.js] fetchTokens error: ", error);
      }
    }

    function timer(time) { 
      return new Promise((resolve, reject) => setTimeout(() => resolve(fetchTokens()), time), null);
    }

    if (!userAddress || chainId === undefined || !global.ethereumProvider) {
      // If we do not have enough information to build a TokenTracker, we exit early
      // When the values above change, the effect will be restarted. We also teardown
      // tracker because inevitably this effect will run again momentarily.
      teardownTracker();
      return;
    }

    if (userAddress && userAddress !== previousUserAddress)
    {        
        timer(10);
    }

    if (memoizedTokens.length === 0) {
      updateBalances([]);
    }
    buildTracker(userAddress, memoizedTokens);

  }, [
    userAddress,
    teardownTracker,
    // chainId,
    memoizedTokens,
    updateBalances,
    buildTracker,
  ]);

  return { loading, tokensWithBalances, error };
}
