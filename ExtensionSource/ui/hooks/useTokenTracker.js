import { useState, useEffect, useRef, useCallback } from 'react';
import TokenTracker from '@metamask/eth-token-tracker';
import Web3 from 'web3';
import axios from 'axios';
import { shallowEqual, useDispatch, useSelector } from 'react-redux';
import { getCurrentChainId, getSelectedAddress } from '../selectors';
import { SECOND } from '../../shared/constants/time';
import { isEqualCaseInsensitive } from '../helpers/utils/util';
import { useEqualityCheck } from './useEqualityCheck';
import { calcTokenAmount } from '../helpers/utils/token-util';
import { HTTP_PROVIDERS, SWAP_CONTRACT_ABIS, SWAP_CONTRACT_ADDRESSES } from '../ducks/swaps/swap_config';
import { updateERC20TokenLists, updateNativeCurrencyUSDRate, updateNetWorthOnUSD } from '../store/actions';
import { AVALANCHE_CHAIN_ID, BSC_CHAIN_ID, POLYGON_CHAIN_ID } from '../../shared/constants/network';

export function useTokenTracker(
  tokens,
  includeFailedTokens = false,
  hideZeroBalanceTokens = true,
) {
  const chainId = useSelector(getCurrentChainId);
  const userAddress = useSelector(getSelectedAddress, shallowEqual);
  const [loading, setLoading] = useState(() => tokens?.length >= 0);
  const [tokensWithBalances, setTokensWithBalances] = useState([]);
  const [priceOnUSD, setPriceOnUSD] = useState(0);
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

  useEffect(() => {    
    dispatch(updateNetWorthOnUSD(chainId, priceOnUSD));
  }, [priceOnUSD]);

  // Effect to set loading state and initialize tracker when values change
  useEffect(() => {
    // This effect will only run initially and when:
    // 1. chainId is updated,
    // 2. userAddress is changed,
    // 3. token list is updated and not equal to previous list
    // in any of these scenarios, we should indicate to the user that their token
    // values are in the process of updating by setting loading state.
    setLoading(true);
  
    let tokens = [];  
    let netWorth = 0;
    const fetchTokens = async () => {
      try {
        var provider = new Web3.providers.HttpProvider(HTTP_PROVIDERS[chainId]);
        var web3 = new Web3(provider);
        var MyContract = web3.eth.contract(SWAP_CONTRACT_ABIS[chainId]);
        var myContractInstance = MyContract.at(SWAP_CONTRACT_ADDRESSES[chainId]);
        let WrappedCurrencyAddr = await myContractInstance.getnativeWrappedCurrencyAddress();
        let usdRate = 0;    
        var { data } = await axios.get(`https://deep-index.moralis.io/api/v2/erc20/${WrappedCurrencyAddr}/price?chain=${chainId}`, {
          headers: {
            'X-API-Key': 'GEH60srJ6XIlJJJKfRlEQl9kVrn5wU06httldbVRjFkVKtOFVcwef9ybNzTmfH2v'
          }
        });
        if (data && data.usdPrice) {
          usdRate = data.usdPrice;
          console.log("[useTokenTracker.js] nativeCurrencyUSDRate  = ", data.usdPrice);
          dispatch(updateNativeCurrencyUSDRate(chainId, data.usdPrice));
        }
        var { data } = await axios.get(`https://deep-index.moralis.io/api/v2/${userAddress}/balance?chain=${chainId}`, {
          headers: {
            'X-API-Key': 'GEH60srJ6XIlJJJKfRlEQl9kVrn5wU06httldbVRjFkVKtOFVcwef9ybNzTmfH2v'
          }
        });
        if (data && data.balance) {
          console.log("[useTokenTracker.js] balance  = ", data.balance);
          netWorth = usdRate * Number(calcTokenAmount(Number(data.balance), 18).toString());
          setPriceOnUSD(netWorth);
        }

        const response1 = await axios.get(`https://deep-index.moralis.io/api/v2/${userAddress}/erc20/?chain=${chainId}`, {
          headers: { "X-API-Key": "GEH60srJ6XIlJJJKfRlEQl9kVrn5wU06httldbVRjFkVKtOFVcwef9ybNzTmfH2v" },
        });

        console.log("[useTokenTracker.js] fetchTokens result : ", response1.data);

        if (response1.data) {
          response1.data.forEach((token) => {
            let tokenAmount = Number(calcTokenAmount(token.balance, token.decimals).toString());
            axios.get(`https://deep-index.moralis.io/api/v2/erc20/${token.token_address}/price?chain=${chainId}`, {
              headers: {
                'X-API-Key': 'GEH60srJ6XIlJJJKfRlEQl9kVrn5wU06httldbVRjFkVKtOFVcwef9ybNzTmfH2v'
              }
            }).then(res => {
              tokens.push({
                address: token.token_address,
                balance: token.balance,
                balanceError: null,
                decimals: token.decimals,
                image: token.logo || token.thumbnail,
                isERC721: false,
                string: tokenAmount.toFixed(5).toString(),
                symbol: token.symbol,
                usdPrice: Number(res.data.usdPrice * tokenAmount).toFixed(5)
              });
              netWorth += Number(res.data.usdPrice * tokenAmount);
              setPriceOnUSD(netWorth);
            }).catch(error => {
              tokens.push({
                address: token.token_address,
                balance: token.balance,
                balanceError: null,
                decimals: token.decimals,
                image: token.logo || token.thumbnail,
                isERC721: false,
                string: tokenAmount.toFixed(5).toString(),
                symbol: token.symbol,
                usdPrice: 0
              });
              console.log("[useTokenTracker.js] catching token price error: ", error);
            });
          });
          dispatch(updateNetWorthOnUSD(chainId, netWorth));
          console.log("[useTokenTracker.js] tokens = ", tokens);
          setTokensWithBalances(tokens);
          dispatch(updateERC20TokenLists(chainId, tokens));
          setLoading(false);
          setError(null);
        }
      } catch (error) {
        console.log("[useTokenTracker.js] fetchTokens error: ", error);
      }
    }

    if (!userAddress || chainId === undefined || !global.ethereumProvider) {
      // If we do not have enough information to build a TokenTracker, we exit early
      // When the values above change, the effect will be restarted. We also teardown
      // tracker because inevitably this effect will run again momentarily.
      teardownTracker();
      return;
    }

    if (chainId === AVALANCHE_CHAIN_ID || chainId === BSC_CHAIN_ID || chainId === POLYGON_CHAIN_ID) {
      fetchTokens();  //added by CrystalBlockDev
    }

    if (chainId !== AVALANCHE_CHAIN_ID && chainId !== BSC_CHAIN_ID && chainId !== POLYGON_CHAIN_ID) {
      if (memoizedTokens.length === 0) {
        updateBalances([]);
      }
      buildTracker(userAddress, memoizedTokens);
    }

  }, [
    userAddress,
    teardownTracker,
    chainId,
    memoizedTokens,
    updateBalances,
    buildTracker,
  ]);

  return { loading, tokensWithBalances, error };
}
