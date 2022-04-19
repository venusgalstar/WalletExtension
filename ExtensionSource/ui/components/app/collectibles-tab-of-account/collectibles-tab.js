import React  from 'react';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import Box from '../../ui/box';
import Button from '../../ui/button';
import Typography from '../../ui/typography/typography';
import CollectiblesDetectionNotice from '../collectibles-detection-notice';
import CollectiblesItems from '../collectibles-items-of-account';
import {
  COLORS,
  TYPOGRAPHY,
  TEXT_ALIGN,
  JUSTIFY_CONTENT,
  FLEX_DIRECTION,
  FONT_WEIGHT,
  ALIGN_ITEMS,
} from '../../../helpers/constants/design-system';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { getCollectiblesDetectionNoticeDismissed } from '../../../ducks/metamask/metamask';
import { getIsMainnet, getUseCollectibleDetection, getSelectedAccount, getSelectedAddress } from '../../../selectors';
import { EXPERIMENTAL_ROUTE } from '../../../helpers/constants/routes';
import {
  checkAndUpdateAllCollectiblesOwnershipStatus,
  detectCollectibles,
} from '../../../store/actions';
import { useCollectiblesCollections } from '../../../hooks/useCollectiblesCollections-of-account';

export default function CollectiblesTab({ onAddNFT }) {
  const useCollectibleDetection = useSelector(getUseCollectibleDetection);
  const selectedAddress = useSelector(getSelectedAddress);
  const isMainnet = useSelector(getIsMainnet);
  const collectibleDetectionNoticeDismissed = useSelector(
    getCollectiblesDetectionNoticeDismissed,
  );
  const history = useHistory();
  const t = useI18nContext();
  const dispatch = useDispatch();

  const {
    collectiblesLoading,
    collections,
    previouslyOwnedCollection,
  } = useCollectiblesCollections();

  const onEnableAutoDetect = () => {
    history.push(EXPERIMENTAL_ROUTE);
  };

  const onRefresh = () => {
    if (isMainnet) {
      dispatch(detectCollectibles());
    }
    checkAndUpdateAllCollectiblesOwnershipStatus();
  };

  if (collectiblesLoading) {
    return <div className="collectibles-tab__loading">{t('loadingNFTs')}</div>;
  }

  console.log("[collectibles-tab-of-account] collections = ", collections);
  
  // useEffect(() =>
  // {    
  //   async function getCollectibles_of_account() 
  //   {
  //     try{
  //       const res = await axios.get("https://deep-index.moralis.io/api/v2/" + selectedAddress + "/nft/?chain="+chainId+"&format=hex", {
  //         headers: { "X-API-Key": "YEEwMh0B4VRg6Hu5gFQcKxqinJ7UizRza1JpbkyMgNTfj4jUkSaZVajOxLNabvnt" },
  //       });
  //       console.log("[collectibles-tab-of-account] Morilis api result : ", res.data.result);
  //       const nftlist = res.data.result;
  //       if(nftlist && nftlist.length>0)
  //       {
  //           // let nftItems = []; let tokenIds = [];
  //           // nftlist.forEach(async (item) => {
  //           //   if(item.token_address.toLowerCase() === config.EvoNFTContractAddress.toLowerCase() ) 
  //           //   {            
  //           //     tokenIds.push(item.token_id);
  //           //   }
  //           // });
  //           //   //get token uris from token IDs
  //           //   let evoManagerContract = await new window.web3.eth.Contract(config.EvoManagerContractAbi, config.EvoManagerContractAddress);
  //           //   let queryRet = await evoManagerContract.methods.getTokenURIsFromIds(tokenIds).call();
            
  //           //   let evoNftUris = queryRet;
  //           //   console.log("[header useEffect] 11")
  //           //   let k; let metadata;
  //           //   for(k = 0 ; k < tokenIds.length; k++)
  //           //   {                
  //           //     metadata = await axios.get(evoNftUris[k]);
  //           //     nftItems.push({token_id:tokenIds[k], token_uri: evoNftUris[k], metadata:metadata.data });      
  //           //   };
  //           //   console.log("nftItems = ", nftItems)
  //           // store.dispatch(updateEvoNFTList(nftItems));
  //       }else{
  //         // store.dispatch(updateEvoNFTList());
  //       }
  //     }catch(error){
  //       // store.dispatch(updateEvoNFTList());      
  //     }         
  //   };

  //   if(selectedAddress) getCollectibles_of_account();

  // }, [selectedAddress]);

  return (
    <div className="collectibles-tab">
      {Object.keys(collections).length > 0 ||
      previouslyOwnedCollection.collectibles.length > 0 ? (
        <CollectiblesItems
          collections={collections}
          previouslyOwnedCollection={previouslyOwnedCollection}
        />
      ) : (
        <Box padding={[6, 12, 6, 12]}>
          {isMainnet &&
          !useCollectibleDetection &&
          !collectibleDetectionNoticeDismissed ? (
            <CollectiblesDetectionNotice />
          ) : null}
          <Box justifyContent={JUSTIFY_CONTENT.CENTER}>
            <img src="./images/no-nfts.svg" />
          </Box>
          <Box
            marginTop={4}
            marginBottom={12}
            justifyContent={JUSTIFY_CONTENT.CENTER}
            flexDirection={FLEX_DIRECTION.COLUMN}
            className="collectibles-tab__link"
          >
            <Typography
              color={COLORS.UI3}
              variant={TYPOGRAPHY.H4}
              align={TEXT_ALIGN.CENTER}
              fontWeight={FONT_WEIGHT.BOLD}
            >
              {t('noNFTs')}
            </Typography>
            <Button
              type="link"
              target="_blank"
              rel="noopener noreferrer"
              href="https://metamask.zendesk.com/hc/en-us/articles/360058238591-NFT-tokens-in-MetaMask-wallet"
            >
              {t('learnMoreUpperCase')}
            </Button>
          </Box>
        </Box>
      )}
      <Box
        marginBottom={4}
        justifyContent={JUSTIFY_CONTENT.CENTER}
        flexDirection={FLEX_DIRECTION.COLUMN}
      >
        <Typography
          color={COLORS.UI3}
          variant={TYPOGRAPHY.H5}
          align={TEXT_ALIGN.CENTER}
        >
          {t('missingNFT')}
        </Typography>
        <Box
          alignItems={ALIGN_ITEMS.CENTER}
          justifyContent={JUSTIFY_CONTENT.CENTER}
        >
          {!isMainnet && Object.keys(collections).length < 1 ? null : (
            <>
              <Box
                className="collectibles-tab__link"
                justifyContent={JUSTIFY_CONTENT.FLEX_END}
              >
                {isMainnet && !useCollectibleDetection ? (
                  <Button type="link" onClick={onEnableAutoDetect}>
                    {t('enableAutoDetect')}
                  </Button>
                ) : (
                  <Button type="link" onClick={onRefresh}>
                    {t('refreshList')}
                  </Button>
                )}
              </Box>
              <Typography
                color={COLORS.UI3}
                variant={TYPOGRAPHY.H6}
                align={TEXT_ALIGN.CENTER}
              >
                {t('or')}
              </Typography>
            </>
          )}
          <Box
            justifyContent={JUSTIFY_CONTENT.FLEX_START}
            className="collectibles-tab__link"
          >
            <Button type="link" onClick={onAddNFT}>
              {t('importNFTs')}
            </Button>
          </Box>
        </Box>
      </Box>
    </div>
  );
}

CollectiblesTab.propTypes = {
  onAddNFT: PropTypes.func.isRequired,
};
