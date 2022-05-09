import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import axios from 'axios';
import Web3 from 'web3';
import { isEqual } from 'lodash';
import {
  getCollectibles,
  getCollectibleContracts,
} from '../ducks/metamask/metamask';
import { getCurrentChainId, getSelectedAddress } from '../selectors';
import { usePrevious } from './usePrevious';
import { erc721Abi } from "./erc721Abi";
import { HTTP_PROVIDERS } from '../ducks/swaps/swap_config';
import { updateERC721TokenLists } from '../store/actions';

export function useCollectiblesCollections() {
  const [collections, setCollections] = useState({});
  const [previouslyOwnedCollection, setPreviouslyOwnedCollection] = useState({
    collectionName: 'Previously Owned',
    collectibles: [],
  });
  const collectibles = useSelector(getCollectibles);
  const [collectiblesLoading, setCollectiblesLoading] = useState(
    () => collectibles?.length >= 0,
  );
  const selectedAddress = useSelector(getSelectedAddress);
  const chainId = useSelector(getCurrentChainId);
  const collectibleContracts = useSelector(getCollectibleContracts);
  const prevCollectibles = usePrevious(collectibles);
  const prevChainId = usePrevious(chainId);
  const prevSelectedAddress = usePrevious(selectedAddress);
  const dispatch = useDispatch();

  useEffect(() => {

    const fetchNFTs = async () => {
      try {
        const requestURL = `https://deep-index.moralis.io/api/v2/${selectedAddress}/nft/?chain=${chainId}`;
        console.log("[useCollectiblesCollectibles.js]", requestURL);
        const response = await axios.get(requestURL, {
          headers: { "X-API-Key": "GEH60srJ6XIlJJJKfRlEQl9kVrn5wU06httldbVRjFkVKtOFVcwef9ybNzTmfH2v" },
        });

        // console.log("[useCollectiblesCollectibles.js] fetchNFTs result : ", response.data.result);

        var fetchedTokens = response.data.result;
        if (fetchedTokens.length > 0) {
          var tempERC721Tokens = [];
          fetchedTokens.map((item) => {
            if (item.contract_type === "ERC721") {
              tempERC721Tokens.push(item);
            }
          });

          console.log("[useCollectiblesCollectibles.js] ERC721 tokens : ", tempERC721Tokens);

          var provider = new Web3.providers.HttpProvider(HTTP_PROVIDERS[chainId]);
          var web3 = new Web3(provider);
          var MyContract = web3.eth.contract(erc721Abi);

          let tempNewCollections = {};
          setCollections(tempNewCollections);

          for (let idx = 0; idx < tempERC721Tokens.length; idx++) {
            let tokenId = tempERC721Tokens[idx].token_id;
            let tokenAddress = tempERC721Tokens[idx].token_address;
            let tokenContractInstance = MyContract.at(tokenAddress);
            let tokenURI = await tokenContractInstance.tokenURI(tokenId);
            console.log("[useCollectiblesCollectibles.js] tokenURI[", idx, "] = ", tokenURI);
            let tokenMetadata = await axios.get(tokenURI);
            console.log("[useCollectiblesCollectibles.js] Metadata[", idx, "] = ", tokenMetadata.data);

            console.log("[useCollectiblesCollectibles.js] tempNewCollections[tokenAddress] = ", tempNewCollections[tokenAddress]);

            if (!tempNewCollections[tokenAddress]) 
            {
              let name = await tokenContractInstance.name();

              tempNewCollections = {
                ...tempNewCollections,
                [tokenAddress]: {
                  collectionName: name,
                  collectionImage: null,
                  collectibles: []
                }
              }
            }
            tempNewCollections[tokenAddress].collectibles.push({
              address: tokenAddress,
              description: tokenMetadata.data.description || null,
              favorite: false,
              image: tokenMetadata.data.image || null,
              isCurrentlyOwned: true,
              name: "#" + tokenId,
              standard: "ERC721",
              tokenId: tokenId.toString()
            });
            setCollections(tempNewCollections);
            console.log("[useCollectiblesCollectibles.js] tempNewCollections = ", tempNewCollections);
            dispatch(updateERC721TokenLists(chainId, tempNewCollections));
          }

        }
      } catch (error) {
        console.log("[useCollectiblesCollectibles.js] fetchNFTs error: ", error);
      }
    }

    const getCollections = () => {

      setCollectiblesLoading(true);
      if (selectedAddress === undefined || chainId === undefined) {
        return;
      }
      // const newCollections = {};
      const newPreviouslyOwnedCollections = {
        collectionName: 'Previously Owned',
        collectibles: [],
      };

      //if(chainId === AVALANCHE_CHAIN_ID || chainId === BSC_CHAIN_ID || chainId === POLYGON_CHAIN_ID )
      //{
      fetchNFTs();  //added by CrystalBlockDev
      //}

      // collectibles.forEach((collectible) => {
      //   if (collectible?.isCurrentlyOwned === false) {
      //     newPreviouslyOwnedCollections.collectibles.push(collectible);
      //   } else if (newCollections[collectible.address]) {
      //     newCollections[collectible.address].collectibles.push(collectible);
      //   } else {
      //     const collectionContract = collectibleContracts.find(
      //       ({ address }) => address === collectible.address,
      //     );
      //     newCollections[collectible.address] = {
      //       collectionName: collectionContract?.name || collectible.name,
      //       collectionImage:
      //         collectionContract?.logo || collectible.collectionImage,
      //       collectibles: [collectible],
      //     };
      //   }
      // });

      // console.log("[useCollectiblesCollections.js] newCollections = ", newCollections);
      console.log("[useCollectiblesCollections.js] newPreviouslyOwnedCollections = ", newPreviouslyOwnedCollections);

      // setCollections(newCollections);
      setPreviouslyOwnedCollection(newPreviouslyOwnedCollections);
      setCollectiblesLoading(false);
    };

    if (
      !isEqual(prevCollectibles, collectibles) ||
      !isEqual(prevSelectedAddress, selectedAddress) ||
      !isEqual(prevChainId, chainId)
    ) {
      getCollections();
    }
  }, [
    collectibles,
    prevCollectibles,
    collectibleContracts,
    setCollectiblesLoading,
    chainId,
    prevChainId,
    selectedAddress,
    prevSelectedAddress,
  ]);

  return { collectiblesLoading, collections, previouslyOwnedCollection };
}
