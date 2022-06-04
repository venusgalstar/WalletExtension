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
        ? tokenWithBalances.filter((token) => Number(token.balance) > 0)
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

    const fetchTokens = async (chainId) => {
      
      setChainId(chainId);
      let netWorth = 0;

      try {
        let usdRate = 0;    
        let wAddr = "";
        switch(chainId)
        {
          case MAINNET_CHAIN_ID:
            wAddr = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; 
            break;
          case AVALANCHE_CHAIN_ID:
            wAddr = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7"; 
            break;
          case BSC_CHAIN_ID:
            wAddr = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"; 
            break;
          case POLYGON_CHAIN_ID:
            wAddr = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"; 
            break;
          case FANTOM_CHAIN_ID:
            wAddr = "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83";
            break;
          default: 
            break;
        }

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

          tokens.forEach((token) => {
            let tokenAmount = Number(calcTokenAmount(token.balance, token.decimals).toString());
            axios.get(`https://deep-index.moralis.io/api/v2/erc20/${token.address}/price?chain=${chainId}`, {
              headers: {
                'X-API-Key': 'E6R13cn5GmpRzCNwefYdeHPAbZlV69kIk9vp0rfhhajligQES1WwpWAKxqr7X2J3'
              }
            }).then(res => {
              token.usdPrice = (Number(res.data.usdPrice) * tokenAmount).toFixed(2);
              netWorth += Number(res.data.usdPrice) * tokenAmount;       
              totalNetworth += Number(res.data.usdPrice) * tokenAmount;
              dispatch(updateTotalNetWorths(totalNetworth));
              dispatch(updateNetWorthOnUSD(chainId, netWorth));
              allTokens = allTokens.concat(token); 
              dispatch(updateERC20TokenLists(chainId, tokens));
              setTokensWithBalances(allTokens);
            }).catch(error => {
              token.usdPrice = 0;   
              allTokens = allTokens.concat(token); 
              dispatch(updateERC20TokenLists(chainId, tokens));
              setTokensWithBalances(allTokens);
              console.log("[useTokenTracker.js] catching token price error: ", error);
            });
          });
          
          setError(null);
          setLoading(false);

        }
      } catch (error) {
        console.log("[useTokenTracker.js] fetchTokens error: ", error);
      }
    }

    function timer(time, chainId) { 
      return new Promise((resolve, reject) => setTimeout(() => resolve(fetchTokens(chainId)), time), null);
    }

    if (!userAddress || chainId === undefined || !global.ethereumProvider) {
      // If we do not have enough information to build a TokenTracker, we exit early
      // When the values above change, the effect will be restarted. We also teardown
      // tracker because inevitably this effect will run again momentarily.
      teardownTracker();
      return;
    }
    
    // async function doTasks()
    // {
    //   const list = [
    //     fetchTokens(MAINNET_CHAIN_ID), 
    //     fetchTokens(AVALANCHE_CHAIN_ID),
    //     fetchTokens(BSC_CHAIN_ID),
    //     fetchTokens(POLYGON_CHAIN_ID),
    //     fetchTokens(FANTOM_CHAIN_ID)
    //   ];
    //   for (const fn of list) {
    //     await fn() // call function to get returned Promise
    //   }
    // }

    if (userAddress && userAddress !== previousUserAddress)
    {
        // timer(100, MAINNET_CHAIN_ID);
        
        timer(10, AVALANCHE_CHAIN_ID);
                
        timer(20, POLYGON_CHAIN_ID);

        timer(30, BSC_CHAIN_ID);
        
        // timer(8000, FANTOM_CHAIN_ID);

        //doTasks();       
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
