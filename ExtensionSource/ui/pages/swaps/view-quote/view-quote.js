import React, { useState, useContext, useMemo, useEffect, useRef } from 'react';
import { shallowEqual, useSelector, useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import BigNumber from 'bignumber.js';
import { isEqual } from 'lodash';
import classnames from 'classnames';
import { I18nContext } from '../../../contexts/i18n';
import SelectQuotePopover from '../select-quote-popover';
import { useEthFiatAmount } from '../../../hooks/useEthFiatAmount';
import { useEqualityCheck } from '../../../hooks/useEqualityCheck';
import { useNewMetricEvent } from '../../../hooks/useMetricEvent';
import { usePrevious } from '../../../hooks/usePrevious';
import { useGasFeeInputs } from '../../../hooks/gasFeeInput/useGasFeeInputs';
import { MetaMetricsContext } from '../../../contexts/metametrics.new';
import FeeCard from '../fee-card';
import EditGasPopover from '../../../components/app/edit-gas-popover/edit-gas-popover.component';
import {
  FALLBACK_GAS_MULTIPLIER,
  getQuotes,
  getSelectedQuote,
  getApproveTxParams,
  getFetchParams,
  setBalanceError,
  getQuotesLastFetched,
  getBalanceError,
  getCustomSwapsGas, // Gas limit.
  getCustomMaxFeePerGas,
  getCustomMaxPriorityFeePerGas,
  getSwapsUserFeeLevel,
  getDestinationTokenInfo,
  getUsedSwapsGasPrice,
  getTopQuote,
  signAndSendTransactions,
  getBackgroundSwapRouteState,
  swapsQuoteSelected,
  getSwapsQuoteRefreshTime,
  getReviewSwapClickedTimestamp,
  getSmartTransactionsOptInStatus,
  signAndSendSwapsSmartTransaction,
  getSwapsRefreshStates,
  getSmartTransactionsEnabled,
  getCurrentSmartTransactionsError,
  getCurrentSmartTransactionsErrorMessageDismissed,
  getSwapsSTXLoading,
  estimateSwapsSmartTransactionsGas,
  getSmartTransactionEstimatedGas,
  getToToken,
  getFromToken,
  getFromTokenInputValue,
  getMaxSlippage,
  calculateEstimatedFee,
} from '../../../ducks/swaps/swaps';
import {
  conversionRateSelector,
  getSelectedAccount,
  getCurrentCurrency,
  getTokenExchangeRates,
  getSwapsDefaultToken,
  getCurrentChainId,
  isHardwareWallet,
  getHardwareWalletType,
  checkNetworkAndAccountSupports1559,
  getEIP1559V2Enabled,
} from '../../../selectors';
import { getNativeCurrency, getTokens } from '../../../ducks/metamask/metamask';

import {
  toPrecisionWithoutTrailingZeros,
  isEqualCaseInsensitive,
} from '../../../helpers/utils/util';

import {
  safeRefetchQuotes,
  setCustomApproveTxData,
  setSwapsErrorKey,
  showModal,
  setSwapsQuotesPollingLimitEnabled,
} from '../../../store/actions';
import {
  ASSET_ROUTE,
  BUILD_QUOTE_ROUTE,
  DEFAULT_ROUTE,
  SWAPS_ERROR_ROUTE,
  AWAITING_SWAP_ROUTE,
} from '../../../helpers/constants/routes';
import { getTransactionData } from '../../../helpers/utils/transactions.util';
import {
  calcTokenAmount,
  calcTokenValue,
  getTokenValueParam,
} from '../../../helpers/utils/token-util';
import {
  decimalToHex,
  hexToDecimal,
  getValueFromWeiHex,
  decGWEIToHexWEI,
  hexWEIToDecGWEI,
  addHexes,
} from '../../../helpers/utils/conversions.util';
import { GasFeeContextProvider } from '../../../contexts/gasFee';
import { TransactionModalContextProvider } from '../../../contexts/transaction-modal';
import AdvancedGasFeePopover from '../../../components/app/advanced-gas-fee-popover';
import EditGasFeePopover from '../../../components/app/edit-gas-fee-popover';
import MainQuoteSummary from '../main-quote-summary';
import { calcGasTotal } from '../../send/send.utils';
import { getCustomTxParamsData } from '../../confirm-approve/confirm-approve.util';
import ActionableMessage from '../../../components/ui/actionable-message/actionable-message';
import {
  quotesToRenderableData,
  getRenderableNetworkFeesForQuote,
  getFeeForSmartTransaction,
} from '../swaps.util';
import { useTokenTracker } from '../../../hooks/useTokenTracker';
import { QUOTES_EXPIRED_ERROR } from '../../../../shared/constants/swaps';
import {
  EDIT_GAS_MODES,
  GAS_RECOMMENDATIONS,
} from '../../../../shared/constants/gas';
import CountdownTimer from '../countdown-timer';
import SwapsFooter from '../swaps-footer';
import PulseLoader from '../../../components/ui/pulse-loader'; // TODO: Replace this with a different loading component.
import Box from '../../../components/ui/box';
import ViewQuotePriceDifference from './view-quote-price-difference';
import { HTTP_PROVIDERS, SWAP_CONTRACT_ABIS, SWAP_CONTRACT_ADDRESSES, SWAP_CONTRACT_SWAP_AVAX_FOR_TOKENS_METHOD_IDS, SWAP_CONTRACT_SWAP_METHOD_IDS, SWAP_CONTRACT_SWAP_TOKENS_FOR_AVAX_METHOD_IDS } from '../../../ducks/swaps/swap_config';
import Web3 from 'web3';
import { AVALANCHE_CHAIN_ID, BSC_CHAIN_ID, POLYGON_CHAIN_ID } from '../../../../shared/constants/network';

let intervalId, intervalId2;

export default function ViewQuote() {
  const history = useHistory();
  const dispatch = useDispatch();
  const t = useContext(I18nContext);
  const metaMetricsEvent = useContext(MetaMetricsContext);
  const eip1559V2Enabled = useSelector(getEIP1559V2Enabled);

  const [dispatchedSafeRefetch, setDispatchedSafeRefetch] = useState(false);
  const [submitClicked, setSubmitClicked] = useState(false);
  const [selectQuotePopoverShown, setSelectQuotePopoverShown] = useState(false);
  const [warningHidden, setWarningHidden] = useState(false);
  const [originalApproveAmount, setOriginalApproveAmount] = useState(null);
  const [showEditGasPopover, setShowEditGasPopover] = useState(false);
  // We need to have currentTimestamp in state, otherwise it would change with each rerender.
  const [currentTimestamp] = useState(Date.now());

  const [
    acknowledgedPriceDifference,
    setAcknowledgedPriceDifference,
  ] = useState(false);
  const priceDifferenceRiskyBuckets = [
    GAS_RECOMMENDATIONS.HIGH,
    GAS_RECOMMENDATIONS.MEDIUM,
  ];

  const routeState = useSelector(getBackgroundSwapRouteState);
  const quotes = useSelector(getQuotes, isEqual);
  useEffect(() => {
    if (!Object.values(quotes).length) {
      history.push(BUILD_QUOTE_ROUTE);
    } else if (routeState === 'awaiting') {
      history.push(AWAITING_SWAP_ROUTE);
    }
  }, [history, quotes, routeState]);

  const quotesLastFetched = useSelector(getQuotesLastFetched);

  // Select necessary data
  const gasPrice = useSelector(getUsedSwapsGasPrice);
  const customMaxGas = useSelector(getCustomSwapsGas);
  const customMaxFeePerGas = useSelector(getCustomMaxFeePerGas);
  const customMaxPriorityFeePerGas = useSelector(getCustomMaxPriorityFeePerGas);
  const swapsUserFeeLevel = useSelector(getSwapsUserFeeLevel);
  const tokenConversionRates = useSelector(getTokenExchangeRates, isEqual);
  const memoizedTokenConversionRates = useEqualityCheck(tokenConversionRates);
  const { balance: ethBalance } = useSelector(getSelectedAccount, shallowEqual);
  const conversionRate = useSelector(conversionRateSelector);
  const currentCurrency = useSelector(getCurrentCurrency);
  const swapsTokens = useSelector(getTokens, isEqual);
  const networkAndAccountSupports1559 = useSelector(
    checkNetworkAndAccountSupports1559,
  );
  const balanceError = useSelector(getBalanceError);
  const fetchParams = useSelector(getFetchParams, isEqual);
  const approveTxParams = useSelector(getApproveTxParams, shallowEqual);
  const selectedQuote = useSelector(getSelectedQuote, isEqual);
  const topQuote = useSelector(getTopQuote, isEqual);
  const usedQuote = selectedQuote || topQuote;
  const tradeValue = usedQuote?.trade?.value ?? '0x0';
  const swapsQuoteRefreshTime = useSelector(getSwapsQuoteRefreshTime);
  const defaultSwapsToken = useSelector(getSwapsDefaultToken, isEqual);
  const chainId = useSelector(getCurrentChainId);
  const nativeCurrencySymbol = useSelector(getNativeCurrency);
  const reviewSwapClickedTimestamp = useSelector(getReviewSwapClickedTimestamp);
  const smartTransactionsOptInStatus = useSelector(
    getSmartTransactionsOptInStatus,
  );
  const smartTransactionsEnabled = useSelector(getSmartTransactionsEnabled);
  const swapsSTXLoading = useSelector(getSwapsSTXLoading);
  const currentSmartTransactionsError = useSelector(
    getCurrentSmartTransactionsError,
  );
  const currentSmartTransactionsErrorMessageDismissed = useSelector(
    getCurrentSmartTransactionsErrorMessageDismissed,
  );
  const currentSmartTransactionsEnabled =
    smartTransactionsEnabled &&
    !(
      currentSmartTransactionsError &&
      (currentSmartTransactionsError !== 'not_enough_funds' ||
        currentSmartTransactionsErrorMessageDismissed)
    );
  const smartTransactionEstimatedGas = useSelector(
    getSmartTransactionEstimatedGas,
  );
  const swapsRefreshRates = useSelector(getSwapsRefreshStates);
  const unsignedTransaction = usedQuote.trade;

  //added by CrystalBlockDev
  const [estimateAmountOut, setEstimatedAmountOut] = useState(0);
  const [estimatedFee, setEstimatedFee] = useState(0);
  const [estimatedFeeInFiat, setEstimatedFeeInFiat] = useState(0);
  const [insufficientEthForSwap, setInsufficientWthForSwap] = useState(null);
  //end adding
  // console.log("[view-quote.js] unsignedTransaction = ", unsignedTransaction);

  useEffect(() => {
    console.log("[view-auote.js] currentSmartTransactionsEnabled && smartTransactionsOptInStatus = ", currentSmartTransactionsEnabled && smartTransactionsOptInStatus);

    if (currentSmartTransactionsEnabled && smartTransactionsOptInStatus) {
      const unsignedTx = {
        from: unsignedTransaction.from,
        to: unsignedTransaction.to,
        value: unsignedTransaction.value,
        data: unsignedTransaction.data,
        gas: unsignedTransaction.gas,
        chainId,
      };      

      intervalId = setInterval(() => {
        dispatch(
          estimateSwapsSmartTransactionsGas(unsignedTx, approveTxParams),
        );
      }, swapsRefreshRates.stxGetTransactionsRefreshTime);
      dispatch(estimateSwapsSmartTransactionsGas(unsignedTx, approveTxParams));
    } else if (intervalId) {
      clearInterval(intervalId);
    }
    return () => clearInterval(intervalId);
    // eslint-disable-next-line
  }, [
    dispatch,
    currentSmartTransactionsEnabled,
    smartTransactionsOptInStatus,
    unsignedTransaction.data,
    unsignedTransaction.from,
    unsignedTransaction.value,
    unsignedTransaction.gas,
    unsignedTransaction.to,
    chainId,
    swapsRefreshRates.stxGetTransactionsRefreshTime,
  ]);

  let gasFeeInputs;
  if (networkAndAccountSupports1559) {
    // For Swaps we want to get 'high' estimations by default.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    gasFeeInputs = useGasFeeInputs(GAS_RECOMMENDATIONS.HIGH, {
      userFeeLevel: swapsUserFeeLevel || GAS_RECOMMENDATIONS.HIGH,
    });
  }

  const { isBestQuote } = usedQuote;

  const fetchParamsSourceToken = fetchParams?.sourceToken;

  const usedGasLimit =
    usedQuote?.gasEstimateWithRefund ||
    `0x${decimalToHex(usedQuote?.averageGas || 0)}`;

  const gasLimitForMax = usedQuote?.gasEstimate || `0x0`;

  const usedGasLimitWithMultiplier = new BigNumber(gasLimitForMax, 16)
    .times(usedQuote?.gasMultiplier || FALLBACK_GAS_MULTIPLIER, 10)
    .round(0)
    .toString(16);

  const nonCustomMaxGasLimit = usedQuote?.gasEstimate
    ? usedGasLimitWithMultiplier
    : `0x${decimalToHex(usedQuote?.maxGas || 0)}`;
  let maxGasLimit = customMaxGas || nonCustomMaxGasLimit;

  let maxFeePerGas;
  let maxPriorityFeePerGas;
  let baseAndPriorityFeePerGas;

  // EIP-1559 gas fees.
  if (networkAndAccountSupports1559) {
    const {
      maxFeePerGas: suggestedMaxFeePerGas,
      maxPriorityFeePerGas: suggestedMaxPriorityFeePerGas,
      gasFeeEstimates: { estimatedBaseFee = '0' },
    } = gasFeeInputs;
    maxFeePerGas = customMaxFeePerGas || decGWEIToHexWEI(suggestedMaxFeePerGas);
    maxPriorityFeePerGas =
      customMaxPriorityFeePerGas ||
      decGWEIToHexWEI(suggestedMaxPriorityFeePerGas);
    baseAndPriorityFeePerGas = addHexes(
      decGWEIToHexWEI(estimatedBaseFee),
      maxPriorityFeePerGas,
    );
  }

  // Smart Transactions gas fees.
  if (
    currentSmartTransactionsEnabled &&
    smartTransactionsOptInStatus &&
    smartTransactionEstimatedGas?.txData
  ) {
    maxGasLimit = `0x${decimalToHex(
      smartTransactionEstimatedGas?.txData.gasLimit || 0,
    )}`;
  }

  const gasTotalInWeiHex = calcGasTotal(maxGasLimit, maxFeePerGas || gasPrice);

  const { tokensWithBalances } = useTokenTracker(swapsTokens, true);
  const balanceToken =
    fetchParamsSourceToken === defaultSwapsToken.address
      ? defaultSwapsToken
      : tokensWithBalances.find(({ address }) =>
        isEqualCaseInsensitive(address, fetchParamsSourceToken),
      );

  const selectedFromToken = balanceToken || usedQuote.sourceTokenInfo;
  const tokenBalance =
    tokensWithBalances?.length &&
    calcTokenAmount(
      selectedFromToken.balance || '0x0',
      selectedFromToken.decimals,
    ).toFixed(9);
  const tokenBalanceUnavailable =
    tokensWithBalances && balanceToken === undefined;

  const approveData = getTransactionData(approveTxParams?.data);
  const approveValue = approveData && getTokenValueParam(approveData);
  const approveAmount =
    approveValue &&
    selectedFromToken?.decimals !== undefined &&
    calcTokenAmount(approveValue, selectedFromToken.decimals).toFixed(9);
  const approveGas = approveTxParams?.gas;

  const renderablePopoverData = useMemo(() => {
    return quotesToRenderableData(
      quotes,
      networkAndAccountSupports1559 ? baseAndPriorityFeePerGas : gasPrice,
      conversionRate,
      currentCurrency,
      approveGas,
      memoizedTokenConversionRates,
      chainId,
      smartTransactionsEnabled &&
      smartTransactionsOptInStatus &&
      smartTransactionEstimatedGas?.txData,
      nativeCurrencySymbol,
    );
  }, [
    quotes,
    gasPrice,
    baseAndPriorityFeePerGas,
    networkAndAccountSupports1559,
    conversionRate,
    currentCurrency,
    approveGas,
    memoizedTokenConversionRates,
    chainId,
    smartTransactionEstimatedGas?.txData,
    nativeCurrencySymbol,
    smartTransactionsEnabled,
    smartTransactionsOptInStatus,
  ]);

  const renderableDataForUsedQuote = renderablePopoverData.find(
    (renderablePopoverDatum) =>
      renderablePopoverDatum.aggId === usedQuote.aggregator,
  );

  const {
    destinationTokenDecimals,
    destinationTokenSymbol,
    destinationTokenValue,
    destinationIconUrl,
    sourceTokenDecimals,
    sourceTokenSymbol,
    sourceTokenValue,
    sourceTokenIconUrl,
  } = renderableDataForUsedQuote;

  let { feeInFiat, feeInEth } = getRenderableNetworkFeesForQuote({
    tradeGas: usedGasLimit,
    approveGas,
    gasPrice: networkAndAccountSupports1559
      ? baseAndPriorityFeePerGas
      : gasPrice,
    currentCurrency,
    conversionRate,
    tradeValue,
    sourceSymbol: sourceTokenSymbol,
    sourceAmount: usedQuote.sourceAmount,
    chainId,
    nativeCurrencySymbol,
  });

  const renderableMaxFees = getRenderableNetworkFeesForQuote({
    tradeGas: maxGasLimit,
    approveGas,
    gasPrice: maxFeePerGas || gasPrice,
    currentCurrency,
    conversionRate,
    tradeValue,
    sourceSymbol: sourceTokenSymbol,
    sourceAmount: usedQuote.sourceAmount,
    chainId,
    nativeCurrencySymbol,
  });
  let { feeInFiat: maxFeeInFiat, feeInEth: maxFeeInEth } = renderableMaxFees;
  const { nonGasFee } = renderableMaxFees;

  if (
    currentSmartTransactionsEnabled &&
    smartTransactionsOptInStatus &&
    smartTransactionEstimatedGas?.txData
  ) {
    const stxEstimatedFeeInWeiDec =
      smartTransactionEstimatedGas.txData.feeEstimate +
      (smartTransactionEstimatedGas.approvalTxData?.feeEstimate || 0);
    const stxMaxFeeInWeiDec = stxEstimatedFeeInWeiDec * 2;
    ({ feeInFiat, feeInEth } = getFeeForSmartTransaction({
      chainId,
      currentCurrency,
      conversionRate,
      nativeCurrencySymbol,
      feeInWeiDec: stxEstimatedFeeInWeiDec,
    }));
    ({
      feeInFiat: maxFeeInFiat,
      feeInEth: maxFeeInEth,
    } = getFeeForSmartTransaction({
      chainId,
      currentCurrency,
      conversionRate,
      nativeCurrencySymbol,
      feeInWeiDec: stxMaxFeeInWeiDec,
    }));
  }

  const tokenCost = new BigNumber(usedQuote.sourceAmount);
  const ethCost = new BigNumber(usedQuote.trade.value || 0, 10).plus(
    new BigNumber(gasTotalInWeiHex, 16),
  );

  const insufficientTokens =
    (tokensWithBalances?.length || balanceError) &&
    tokenCost.gt(new BigNumber(selectedFromToken.balance || '0x0'));

  const insufficientEth = ethCost.gt(new BigNumber(ethBalance || '0x0'));

  const tokenBalanceNeeded = insufficientTokens
    ? toPrecisionWithoutTrailingZeros(
      calcTokenAmount(tokenCost, selectedFromToken.decimals)
        .minus(tokenBalance)
        .toString(10),
      6,
    )
    : null;

  const ethBalanceNeeded = insufficientEth
    ? toPrecisionWithoutTrailingZeros(
      ethCost
        .minus(ethBalance, 16)
        .div('1000000000000000000', 10)
        .toString(10),
      6,
    )
    : null;

  const destinationToken = useSelector(getDestinationTokenInfo, isEqual);

  useEffect(() => {
    if (insufficientTokens || insufficientEth || insufficientEthForSwap) {  //modified by CrystalBlockDev
      dispatch(setBalanceError(true));
    } else if (balanceError && !insufficientTokens && !insufficientEth && !insufficientEthForSwap) {   // modified by CrystalBlockDev
      dispatch(setBalanceError(false));
    }
  }, [insufficientTokens, insufficientEth, balanceError, dispatch]);

  useEffect(() => {
    const currentTime = Date.now();
    const timeSinceLastFetched = currentTime - quotesLastFetched;
    if (
      timeSinceLastFetched > swapsQuoteRefreshTime &&
      !dispatchedSafeRefetch
    ) {
      setDispatchedSafeRefetch(true);
      dispatch(safeRefetchQuotes());
    } else if (timeSinceLastFetched > swapsQuoteRefreshTime) {
      dispatch(setSwapsErrorKey(QUOTES_EXPIRED_ERROR));
      history.push(SWAPS_ERROR_ROUTE);
    }
  }, [
    quotesLastFetched,
    dispatchedSafeRefetch,
    dispatch,
    history,
    swapsQuoteRefreshTime,
  ]);

  useEffect(() => {
    if (!originalApproveAmount && approveAmount) {
      setOriginalApproveAmount(approveAmount);
    }
  }, [originalApproveAmount, approveAmount]);

  const showInsufficientWarning =
    (balanceError || tokenBalanceNeeded || ethBalanceNeeded || insufficientEthForSwap) && !warningHidden; //modified by CrystalBlockDev

  console.log("[view-quote.js] showInsufficientWarning = ", showInsufficientWarning);

  const hardwareWalletUsed = useSelector(isHardwareWallet);
  const hardwareWalletType = useSelector(getHardwareWalletType);

  const numberOfQuotes = Object.values(quotes).length;
  const bestQuoteReviewedEventSent = useRef();

  //added by CrystalBlockDev
  useEffect(() => {
    async function getPathIsExists() {
      try {
        if (chainId === AVALANCHE_CHAIN_ID || chainId === BSC_CHAIN_ID || chainId === POLYGON_CHAIN_ID) {
          //ask pair exists to Phoenix Contract        
          var provider = new Web3.providers.HttpProvider(HTTP_PROVIDERS[chainId]);
          var web3 = new Web3(provider);
          var MyContract = web3.eth.contract(SWAP_CONTRACT_ABIS[chainId]);
          var myContractInstance = MyContract.at(SWAP_CONTRACT_ADDRESSES[chainId]);

          const { sourceTokenInfo = {}, destinationTokenInfo = {} } =
            fetchParams?.metaData || {};

          console.log("[view-quote.js] sourceTokenInfo = ", sourceTokenInfo, " destinationTokenInfo = ", destinationTokenInfo);

          // let pathExists = await myContractInstance.isSwapPathExists(sourceTokenInfo.address, destinationTokenInfo.address);
          // console.log("[view-quote.js] pathExists = ", pathExists);

          let inputValue = calcTokenValue(
            sourceTokenValue,
            sourceTokenInfo.decimals);

          let WrappedCurrencyAddr = await myContractInstance.getnativeWrappedCurrencyAddress();
          let valueOut = 0;

          if (sourceTokenInfo.address === "0x0000000000000000000000000000000000000000") {
            valueOut = await myContractInstance.getAmountOut(WrappedCurrencyAddr, destinationTokenInfo.address, inputValue.toString());
          }
          else if (destinationTokenInfo.address === "0x0000000000000000000000000000000000000000") {
            valueOut = await myContractInstance.getAmountOut(sourceTokenInfo.address, WrappedCurrencyAddr,  inputValue.toString());
          }
          else {
            valueOut = await myContractInstance.getAmountOut(sourceTokenInfo.address, destinationTokenInfo.address,  inputValue.toString());
          }          
          let amoutOut = calcTokenAmount(valueOut.toString(), destinationTokenInfo.decimals);

          setEstimatedAmountOut(amoutOut.toString());

          console.log("[view-quote.js] 00  ");
          
          let estimatedSwapFee = 0;
          let inputValueStr = inputValue.toString(16).padStart(64, 0);
          if(sourceTokenInfo.address === "0x0000000000000000000000000000000000000000")
          {
            console.log("[view-quote.js] 11  ");

            let data = SWAP_CONTRACT_SWAP_AVAX_FOR_TOKENS_METHOD_IDS[chainId] + 
              destinationTokenInfo.address.substring(2, 42).padStart(64, 0) +
              fetchParams?.slippage.toString(16).padStart(64, 0) ;

            estimatedSwapFee = await web3.eth.estimateGas({
              to: SWAP_CONTRACT_ADDRESSES[chainId], 
              data: data,
              from: fetchParams?.fromAddress.toString(),
              value: "0x"+inputValueStr
            });

            if(estimatedSwapFee) estimatedSwapFee = parseInt(estimatedSwapFee.toString(), 16).toString(10);

          }
          else if(destinationTokenInfo.address === "0x0000000000000000000000000000000000000000")
          {
            console.log("[view-quote.js] 22  ");

            let data = SWAP_CONTRACT_SWAP_TOKENS_FOR_AVAX_METHOD_IDS[chainId] + 
              sourceTokenInfo.address.substring(2, 42).padStart(64, 0) +
              inputValueStr +
              fetchParams?.slippage.toString(16).padStart(64, 0) ;
            
            estimatedSwapFee = await web3.eth.estimateGas({
              to: SWAP_CONTRACT_ADDRESSES[chainId], 
              data: data,
              from: fetchParams?.fromAddress.toString(),
            });
          }else{
          console.log("[view-quote.js] 33  ");

            let data = SWAP_CONTRACT_SWAP_METHOD_IDS[chainId] + 
              sourceTokenInfo.address.substring(2, 42).padStart(64, 0) +
              destinationTokenInfo.address.substring(2, 42).padStart(64, 0) +
              inputValueStr +
              fetchParams?.slippage.toString(16).padStart(64, 0) ;

            estimatedSwapFee = await web3.eth.estimateGas({
              to: SWAP_CONTRACT_ADDRESSES[chainId],  
              data: data,
              from: fetchParams?.fromAddress.toString()
            });          
          }
          console.log("[view-quote.js] 44  ");

          var esf = 0;
          if(estimatedSwapFee) 
          {
          console.log("[view-quote.js] 55  ");

            esf = web3.fromWei((new BigNumber(estimatedSwapFee)).times(10*parseInt(gasPrice, 16)).toString(10), 'ether');
          }
          console.log('[view-quote.js] esf = ', esf, "ether");
          let indexOfFeeinEth = feeInEth.search(nativeCurrencySymbol);
          let numberOfFeeinEth = Number(feeInEth.substring(0, indexOfFeeinEth));

          console.log("[view-quote.js] numberOfFeeinEth = ", numberOfFeeinEth);

          let numberOfFeeinFiat = Number(feeInFiat.substring(1, feeInFiat.length));

          console.log("[view-quote.js] numberOfFeeinFiat = ", numberOfFeeinFiat);

          let delta = 0;
          if(esf>0 && !isNaN(esf)) 
          {
            setEstimatedFee(Number(esf.toString()).toFixed(4) + nativeCurrencySymbol);     
            setEstimatedFeeInFiat("$" + Number(esf.toString() * numberOfFeeinFiat / numberOfFeeinEth).toFixed(4));  
            delta = esf - web3.fromWei(parseInt(ethBalance, 16).toString(), 'ether');
          }else{            
            setEstimatedFee((numberOfFeeinEth* 10).toFixed(4) + nativeCurrencySymbol);     
            setEstimatedFeeInFiat("$" + (numberOfFeeinFiat * 10).toFixed(4));  
            delta = numberOfFeeinEth* 10 - web3.fromWei(parseInt(ethBalance, 16).toString(), 'ether');
          }
          console.log("[view-quote.js] delta = ", delta);
          let isfp = delta > 0 ? delta.toString() : null;
          console.log("[view-quote.js] isfp = ", isfp);
          if(isfp && !isNaN(isfp)) 
          {
            setInsufficientWthForSwap(Number(isfp).toFixed(4).toString());
            dispatch(setBalanceError(true));
          }
          else 
          {
            setInsufficientWthForSwap(null);
            dispatch(setBalanceError(false));
          }

        }
      } catch (error) {
        console.log("Error in checking existance. ", error);
      }
    }
    getPathIsExists();

    if (intervalId2 > 0) { }
    else {
      intervalId2 = setInterval(() => {
        getPathIsExists();
      }, swapsRefreshRates.stxGetTransactionsRefreshTime);
    }

  }, [fetchParams])
  //end addding


  useEffect(() => {
    return () => {
      if (intervalId2 > 0) clearInterval(intervalId2);
    }
  }, [])

  const eventObjectBase = {
    token_from: sourceTokenSymbol,
    token_from_amount: sourceTokenValue,
    token_to: destinationTokenSymbol,
    token_to_amount: destinationTokenValue,
    request_type: fetchParams?.balanceError,
    slippage: fetchParams?.slippage,
    custom_slippage: fetchParams?.slippage !== 2,
    response_time: fetchParams?.responseTime,
    best_quote_source: topQuote?.aggregator,
    available_quotes: numberOfQuotes,
    is_hardware_wallet: hardwareWalletUsed,
    hardware_wallet_type: hardwareWalletType,
    stx_enabled: currentSmartTransactionsEnabled,
    current_stx_enabled: currentSmartTransactionsEnabled,
    stx_user_opt_in: smartTransactionsOptInStatus,
  };

  const allAvailableQuotesOpened = useNewMetricEvent({
    event: 'All Available Quotes Opened',
    category: 'swaps',
    sensitiveProperties: {
      ...eventObjectBase,
      other_quote_selected: usedQuote?.aggregator !== topQuote?.aggregator,
      other_quote_selected_source:
        usedQuote?.aggregator === topQuote?.aggregator
          ? null
          : usedQuote?.aggregator,
    },
  });

  const quoteDetailsOpened = useNewMetricEvent({
    event: 'Quote Details Opened',
    category: 'swaps',
    sensitiveProperties: {
      ...eventObjectBase,
      other_quote_selected: usedQuote?.aggregator !== topQuote?.aggregator,
      other_quote_selected_source:
        usedQuote?.aggregator === topQuote?.aggregator
          ? null
          : usedQuote?.aggregator,
    },
  });

  const editSpendLimitOpened = useNewMetricEvent({
    event: 'Edit Spend Limit Opened',
    category: 'swaps',
    sensitiveProperties: {
      ...eventObjectBase,
      custom_spend_limit_set: originalApproveAmount === approveAmount,
      custom_spend_limit_amount:
        originalApproveAmount === approveAmount ? null : approveAmount,
    },
  });

  const bestQuoteReviewedEvent = useNewMetricEvent({
    event: 'Best Quote Reviewed',
    category: 'swaps',
    sensitiveProperties: {
      ...eventObjectBase,
      network_fees: feeInFiat,
    },
  });

  const viewQuotePageLoadedEvent = useNewMetricEvent({
    event: 'View Quote Page Loaded',
    category: 'swaps',
    sensitiveProperties: {
      ...eventObjectBase,
      response_time: currentTimestamp - reviewSwapClickedTimestamp,
    },
  });

  useEffect(() => {
    if (
      !bestQuoteReviewedEventSent.current &&
      [
        sourceTokenSymbol,
        sourceTokenValue,
        destinationTokenSymbol,
        destinationTokenValue,
        fetchParams,
        topQuote,
        numberOfQuotes,
        feeInFiat,
      ].every((dep) => dep !== null && dep !== undefined)
    ) {
      bestQuoteReviewedEventSent.current = true;
      bestQuoteReviewedEvent();
    }
  }, [
    sourceTokenSymbol,
    sourceTokenValue,
    destinationTokenSymbol,
    destinationTokenValue,
    fetchParams,
    topQuote,
    numberOfQuotes,
    feeInFiat,
    bestQuoteReviewedEvent,
  ]);

  // const metaMaskFee = usedQuote.fee;

  const onFeeCardTokenApprovalClick = () => {
    editSpendLimitOpened();
    dispatch(
      showModal({
        name: 'EDIT_APPROVAL_PERMISSION',
        decimals: selectedFromToken.decimals,
        origin: 'MetaMask',
        setCustomAmount: (newCustomPermissionAmount) => {
          const customPermissionAmount =
            newCustomPermissionAmount === ''
              ? originalApproveAmount
              : newCustomPermissionAmount;
          const newData = getCustomTxParamsData(approveTxParams.data, {
            customPermissionAmount,
            decimals: selectedFromToken.decimals,
          });

          if (
            customPermissionAmount?.length &&
            approveTxParams.data !== newData
          ) {
            dispatch(setCustomApproveTxData(newData));
          }
        },
        tokenAmount: originalApproveAmount,
        customTokenAmount:
          originalApproveAmount === approveAmount ? null : approveAmount,
        tokenBalance,
        tokenSymbol: selectedFromToken.symbol,
        requiredMinimum: calcTokenAmount(
          usedQuote.sourceAmount,
          selectedFromToken.decimals,
        ),
      }),
    );
  };

  const nonGasFeeIsPositive = new BigNumber(nonGasFee, 16).gt(0);
  const approveGasTotal = calcGasTotal(
    approveGas || '0x0',
    networkAndAccountSupports1559 ? baseAndPriorityFeePerGas : gasPrice,
  );
  const extraNetworkFeeTotalInHexWEI = new BigNumber(nonGasFee, 16)
    .plus(approveGasTotal, 16)
    .toString(16);
  const extraNetworkFeeTotalInEth = getValueFromWeiHex({
    value: extraNetworkFeeTotalInHexWEI,
    toDenomination: 'ETH',
    numberOfDecimals: 4,
  });

  let extraInfoRowLabel = '';
  if (approveGas && nonGasFeeIsPositive) {
    extraInfoRowLabel = t('approvalAndAggregatorTxFeeCost');
  } else if (approveGas) {
    extraInfoRowLabel = t('approvalTxGasCost');
  } else if (nonGasFeeIsPositive) {
    extraInfoRowLabel = t('aggregatorFeeCost');
  }

  const onFeeCardMaxRowClick = () => {
    networkAndAccountSupports1559
      ? setShowEditGasPopover(true)
      : dispatch(
        showModal({
          name: 'CUSTOMIZE_METASWAP_GAS',
          value: tradeValue,
          customGasLimitMessage: approveGas
            ? t('extraApprovalGas', [hexToDecimal(approveGas)])
            : '',
          customTotalSupplement: approveGasTotal,
          extraInfoRow: extraInfoRowLabel
            ? {
              label: extraInfoRowLabel,
              value: `${extraNetworkFeeTotalInEth} ${nativeCurrencySymbol}`,
            }
            : null,
          initialGasPrice: gasPrice,
          initialGasLimit: maxGasLimit,
          minimumGasLimit: new BigNumber(nonCustomMaxGasLimit, 16).toNumber(),
        }),
      );
  };

//modified by CrystalBlockDev
  const actionableBalanceErrorMessage = tokenBalanceUnavailable
    ? t('swapTokenBalanceUnavailable', [sourceTokenSymbol])
    : t('swapApproveNeedMoreTokens', [
      <span key="swapApproveNeedMoreTokens-1" className="view-quote__bold">
        {tokenBalanceNeeded || ethBalanceNeeded || insufficientEthForSwap}  
      </span>,
      tokenBalanceNeeded && !(sourceTokenSymbol === defaultSwapsToken.symbol)
        ? sourceTokenSymbol
        : defaultSwapsToken.symbol,
    ]);
    //end modifiying
    
  useEffect(() => {

    console.log("[view-quote.js] feeInEth = ", feeInEth);
    
    console.log("[view-quote.js] ethBalance = ", ethBalance);
    console.log("[view-quote.js] insufficientEthForSwap = ", insufficientEthForSwap);

    console.log("[view-quote.js] conversionRate = ", conversionRate);

    console.log("[view-quote.js] feeInFiat = ", feeInFiat);
    console.log('[view-quote.js] estimatedFee = ', estimatedFee, nativeCurrencySymbol);

    console.log('[view-quote.js] balanceError = ', balanceError);

  }, [estimatedFee])

  // Price difference warning
  const priceSlippageBucket = usedQuote?.priceSlippage?.bucket;
  const lastPriceDifferenceBucket = usePrevious(priceSlippageBucket);

  // If the user agreed to a different bucket of risk, make them agree again
  useEffect(() => {
    if (
      acknowledgedPriceDifference &&
      lastPriceDifferenceBucket === GAS_RECOMMENDATIONS.MEDIUM &&
      priceSlippageBucket === GAS_RECOMMENDATIONS.HIGH
    ) {
      setAcknowledgedPriceDifference(false);
    }
  }, [
    priceSlippageBucket,
    acknowledgedPriceDifference,
    lastPriceDifferenceBucket,
  ]);

  let viewQuotePriceDifferenceComponent = null;
  const priceSlippageFromSource = useEthFiatAmount(
    usedQuote?.priceSlippage?.sourceAmountInETH || 0,
    { showFiat: true },
  );
  const priceSlippageFromDestination = useEthFiatAmount(
    usedQuote?.priceSlippage?.destinationAmountInETH || 0,
    { showFiat: true },
  );

  // We cannot present fiat value if there is a calculation error or no slippage
  // from source or destination
  const priceSlippageUnknownFiatValue =
    !priceSlippageFromSource ||
    !priceSlippageFromDestination ||
    usedQuote?.priceSlippage?.calculationError;

  let priceDifferencePercentage = 0;
  if (usedQuote?.priceSlippage?.ratio) {
    priceDifferencePercentage = parseFloat(
      new BigNumber(usedQuote.priceSlippage.ratio, 10)
        .minus(1, 10)
        .times(100, 10)
        .toFixed(2),
      10,
    );
  }

  const shouldShowPriceDifferenceWarning =
    !tokenBalanceUnavailable &&
    !showInsufficientWarning &&
    usedQuote &&
    (priceDifferenceRiskyBuckets.includes(priceSlippageBucket) ||
      priceSlippageUnknownFiatValue);

  if (shouldShowPriceDifferenceWarning) {
    viewQuotePriceDifferenceComponent = (
      <ViewQuotePriceDifference
        usedQuote={usedQuote}
        sourceTokenValue={sourceTokenValue}
        destinationTokenValue={destinationTokenValue}
        priceSlippageFromSource={priceSlippageFromSource}
        priceSlippageFromDestination={priceSlippageFromDestination}
        priceDifferencePercentage={priceDifferencePercentage}
        priceSlippageUnknownFiatValue={priceSlippageUnknownFiatValue}
        onAcknowledgementClick={() => {
          setAcknowledgedPriceDifference(true);
        }}
        acknowledged={acknowledgedPriceDifference}
      />
    );
  }

  const disableSubmissionDueToPriceWarning =
    shouldShowPriceDifferenceWarning && !acknowledgedPriceDifference;

  const isShowingWarning =
    showInsufficientWarning || shouldShowPriceDifferenceWarning;

  const onCloseEditGasPopover = () => {
    setShowEditGasPopover(false);
  };

  useEffect(() => {
    // Thanks to the next line we will only do quotes polling 3 times before showing a Quote Timeout modal.
    dispatch(setSwapsQuotesPollingLimitEnabled(true));
    if (reviewSwapClickedTimestamp) {
      viewQuotePageLoadedEvent();
    }
  }, [dispatch, viewQuotePageLoadedEvent, reviewSwapClickedTimestamp]);

  useEffect(() => {
    // if smart transaction error is turned off, reset submit clicked boolean
    if (
      !currentSmartTransactionsEnabled &&
      currentSmartTransactionsError &&
      submitClicked
    ) {
      setSubmitClicked(false);
    }
  }, [
    currentSmartTransactionsEnabled,
    currentSmartTransactionsError,
    submitClicked,
  ]);

  const transaction = {
    userFeeLevel: swapsUserFeeLevel || GAS_RECOMMENDATIONS.HIGH,
    txParams: {
      maxFeePerGas,
      maxPriorityFeePerGas,
      gas: maxGasLimit,
    },
  };

  const supportsEIP1559V2 = eip1559V2Enabled && networkAndAccountSupports1559;

  return (
    <GasFeeContextProvider
      editGasMode={EDIT_GAS_MODES.SWAPS}
      minimumGasLimit={usedGasLimit}
      transaction={transaction}
    >
      <TransactionModalContextProvider>
        <div className="view-quote">
          <div
            className={classnames('view-quote__content', {
              'view-quote__content_modal': disableSubmissionDueToPriceWarning,
            })}
          >
            {selectQuotePopoverShown && (
              <SelectQuotePopover
                quoteDataRows={renderablePopoverData}
                onClose={() => setSelectQuotePopoverShown(false)}
                onSubmit={(aggId) => dispatch(swapsQuoteSelected(aggId))}
                swapToSymbol={destinationTokenSymbol}
                initialAggId={usedQuote.aggregator}
                onQuoteDetailsIsOpened={quoteDetailsOpened}
                hideEstimatedGasFee={
                  smartTransactionsEnabled && smartTransactionsOptInStatus
                }
              />
            )}

            {!supportsEIP1559V2 &&
              showEditGasPopover &&
              networkAndAccountSupports1559 && (
                <EditGasPopover
                  transaction={transaction}
                  minimumGasLimit={usedGasLimit}
                  defaultEstimateToUse={GAS_RECOMMENDATIONS.HIGH}
                  mode={EDIT_GAS_MODES.SWAPS}
                  confirmButtonText={t('submit')}
                  onClose={onCloseEditGasPopover}
                />
              )}
            {supportsEIP1559V2 && (
              <>
                <EditGasFeePopover />
                <AdvancedGasFeePopover />
              </>
            )}

            <div
              className={classnames('view-quote__warning-wrapper', {
                'view-quote__warning-wrapper--thin': !isShowingWarning,
              })}
            >
              {viewQuotePriceDifferenceComponent}
              {(showInsufficientWarning || tokenBalanceUnavailable) && (
                <ActionableMessage
                  message={actionableBalanceErrorMessage}
                  onClose={() => setWarningHidden(true)}
                />
              )}
            </div>
            <div className="view-quote__countdown-timer-container">
              <CountdownTimer
                timeStarted={quotesLastFetched}
                warningTime="0:30"
                labelKey="swapNewQuoteIn"
              />
            </div>
            {
              (chainId === AVALANCHE_CHAIN_ID || chainId === BSC_CHAIN_ID || chainId === POLYGON_CHAIN_ID) ? 
              <MainQuoteSummary
                sourceValue={calcTokenValue(
                  sourceTokenValue,
                  sourceTokenDecimals,
                )}
                sourceDecimals={sourceTokenDecimals}
                sourceSymbol={sourceTokenSymbol}
                destinationValue={calcTokenValue(
                  estimateAmountOut, //destinationTokenValue, //replaced by CrystalBlockDev
                  destinationTokenDecimals,
                )}
                destinationDecimals={destinationTokenDecimals}
                destinationSymbol={destinationTokenSymbol}
                sourceIconUrl={sourceTokenIconUrl}
                destinationIconUrl={destinationIconUrl}
              />
              : 
              <MainQuoteSummary
                sourceValue={calcTokenValue(
                  sourceTokenValue,
                  sourceTokenDecimals,
                )}
                sourceDecimals={sourceTokenDecimals}
                sourceSymbol={sourceTokenSymbol}
                destinationValue={calcTokenValue(
                  destinationTokenValue,
                  destinationTokenDecimals,
                )}
                destinationDecimals={destinationTokenDecimals}
                destinationSymbol={destinationTokenSymbol}
                sourceIconUrl={sourceTokenIconUrl}
                destinationIconUrl={destinationIconUrl}
              />
            }
            {
            currentSmartTransactionsEnabled &&
              smartTransactionsOptInStatus &&
              !smartTransactionEstimatedGas?.txData && (
                <Box marginTop={0} marginBottom={10}>
                  <PulseLoader />
                </Box>
              )
            }
            {(!currentSmartTransactionsEnabled ||
              !smartTransactionsOptInStatus ||
              smartTransactionEstimatedGas?.txData) && (
                <div
                  className={classnames('view-quote__fee-card-container', {
                    'view-quote__fee-card-container--three-rows':
                      approveTxParams && (!balanceError || warningHidden),
                  })}
                >       
                {           
                  (chainId === AVALANCHE_CHAIN_ID || chainId === POLYGON_CHAIN_ID || chainId === BSC_CHAIN_ID) ?                     
                  <FeeCard
                    primaryFee = {
                      {
                        fee: (estimatedFee && estimatedFee !== 0) ? estimatedFee: feeInEth,
                        maxFee: (estimatedFee && estimatedFee !== 0) ? estimatedFee: feeInEth,
                      }
                    }
                    secondaryFee={{
                      fee: (estimatedFeeInFiat && estimatedFeeInFiat !== 0) ? estimatedFeeInFiat: feeInFiat,
                      maxFee: (estimatedFeeInFiat && estimatedFeeInFiat !== 0) ? estimatedFeeInFiat: maxFeeInFiat,
                    }}
                    onFeeCardMaxRowClick={onFeeCardMaxRowClick}
                    hideTokenApprovalRow={
                      !approveTxParams || (balanceError && !warningHidden)
                    }
                    tokenApprovalSourceTokenSymbol={sourceTokenSymbol}
                    onTokenApprovalClick={onFeeCardTokenApprovalClick}
                    // metaMaskFee={String(metaMaskFee)}    disabled by CrystalBlockDev
                    metaMaskFee="0.1"     //added by CrystalBlockDev
                    numberOfQuotes={Object.values(quotes).length}
                    onQuotesClick={() => {
                      allAvailableQuotesOpened();
                      setSelectQuotePopoverShown(true);
                    }}
                    chainId={chainId}
                    isBestQuote={isBestQuote}
                    supportsEIP1559V2={supportsEIP1559V2}
                    networkAndAccountSupports1559={networkAndAccountSupports1559}
                    maxPriorityFeePerGasDecGWEI={hexWEIToDecGWEI(
                      maxPriorityFeePerGas,
                    )}
                    maxFeePerGasDecGWEI={hexWEIToDecGWEI(maxFeePerGas)}
                    smartTransactionsEnabled={currentSmartTransactionsEnabled}
                    smartTransactionsOptInStatus={smartTransactionsOptInStatus}
                  />
                  :
                  <FeeCard
                    primaryFee = {
                      {
                        fee: feeInEth,
                        maxFee: maxFeeInEth,
                      }
                    }
                    secondaryFee={{
                      fee: feeInFiat,
                      maxFee: maxFeeInFiat,
                    }}
                    onFeeCardMaxRowClick={onFeeCardMaxRowClick}
                    hideTokenApprovalRow={
                      !approveTxParams || (balanceError && !warningHidden)
                    }
                    tokenApprovalSourceTokenSymbol={sourceTokenSymbol}
                    onTokenApprovalClick={onFeeCardTokenApprovalClick}
                    // metaMaskFee={String(metaMaskFee)}    disabled by CrystalBlockDev
                    metaMaskFee="0.1"     //added by CrystalBlockDev
                    numberOfQuotes={Object.values(quotes).length}
                    onQuotesClick={() => {
                      allAvailableQuotesOpened();
                      setSelectQuotePopoverShown(true);
                    }}
                    chainId={chainId}
                    isBestQuote={isBestQuote}
                    supportsEIP1559V2={supportsEIP1559V2}
                    networkAndAccountSupports1559={networkAndAccountSupports1559}
                    maxPriorityFeePerGasDecGWEI={hexWEIToDecGWEI(
                      maxPriorityFeePerGas,
                    )}
                    maxFeePerGasDecGWEI={hexWEIToDecGWEI(maxFeePerGas)}
                    smartTransactionsEnabled={currentSmartTransactionsEnabled}
                    smartTransactionsOptInStatus={smartTransactionsOptInStatus}
                  />
                }
                </div>
              )}
          </div>
          <SwapsFooter
            onSubmit={() => {
              setSubmitClicked(true);
              if (!balanceError) {
                if (
                  currentSmartTransactionsEnabled &&
                  smartTransactionsOptInStatus &&
                  smartTransactionEstimatedGas?.txData
                ) {
                  dispatch(
                    signAndSendSwapsSmartTransaction({
                      unsignedTransaction,
                      metaMetricsEvent,
                      history,
                    }),
                  );
                } else {
                  dispatch(signAndSendTransactions(history, metaMetricsEvent));
                }
              } else if (destinationToken.symbol === defaultSwapsToken.symbol) {
                history.push(DEFAULT_ROUTE);
              } else {
                history.push(`${ASSET_ROUTE}/${destinationToken.address}`);
              }
            }}
            submitText={
              currentSmartTransactionsEnabled &&
                smartTransactionsOptInStatus &&
                swapsSTXLoading
                ? t('preparingSwap')
                : t('swap')
            }
            hideCancel
            disabled={
              submitClicked ||
              balanceError ||
              tokenBalanceUnavailable ||
              disableSubmissionDueToPriceWarning ||
              (networkAndAccountSupports1559 &&
                baseAndPriorityFeePerGas === undefined) ||
              (!networkAndAccountSupports1559 &&
                (gasPrice === null || gasPrice === undefined)) ||
              (currentSmartTransactionsEnabled && currentSmartTransactionsError)
            }
            className={isShowingWarning && 'view-quote__thin-swaps-footer'}
            showTopBorder
          />
        </div>
      </TransactionModalContextProvider>
    </GasFeeContextProvider>
  );
}