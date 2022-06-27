import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Image} from 'react-native';
import AssetIcon from '../AssetIcon';
import Identicon from '../Identicon';
import isUrl from 'is-url';
import { connect } from 'react-redux';
import { getTokenList } from '../../../reducers/tokens';
import Logger from '../../../util/Logger';

const styles = StyleSheet.create({
  itemLogoWrapper: {
    width: 50,
    height: 50,
  },
  roundImage: {
    overflow: 'hidden',
    borderRadius: 25,
  },
});

export function TokenImage({ asset, containerStyle, iconStyle, tokenList }) {
  // Logger.log("[TokenImage/index.js] asset?.image = ", asset?.image);
  const assetImage = isUrl(asset?.image) ? asset.image : null;
  // const assetImage = asset?.image ? asset.image : null;
  // Logger.log("[TokenImage/index.js] assetImage = ", assetImage);
  const iconUrl =
    assetImage ||
    tokenList[asset?.address]?.iconUrl ||
    tokenList[asset?.address?.toLowerCase()]?.iconUrl ||
    '';

    // Logger.log("[TokenImage/index.js] iconUrl = ", iconUrl);
  return (
    <View style={[styles.itemLogoWrapper, containerStyle, styles.roundImage]}>
      {iconUrl ? (
        // // asset.isETH === true?        
        // <Image
        //   // style={iconStyle}
        //   source={require('../../../images/eth-logo.png')}
        // />
        // // :
        <AssetIcon logo={iconUrl} customStyle={iconStyle} />
      ) : (
        <Identicon address={asset?.address} customStyle={iconStyle} />
      )}
    </View>
  );
}

TokenImage.propTypes = {
  asset: PropTypes.object,
  containerStyle: PropTypes.object,
  iconStyle: PropTypes.object,
  tokenList: PropTypes.object,
};

const mapStateToProps = (state) => ({
  tokenList: getTokenList(state),
});

export default connect(mapStateToProps)(TokenImage);
