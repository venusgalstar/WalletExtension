import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { ETH, GWEI } from '../../../helpers/constants/common';
import { useCurrencyDisplay } from '../../../hooks/useCurrencyDisplay';
import { getNetWorthOnUSD } from '../../../selectors';
import { useSelector } from 'react-redux';

export default function CurrencyDisplay({
  value,
  displayValue,
  'data-testid': dataTestId,
  style,
  className,
  prefix,
  prefixComponent,
  hideLabel,
  hideTitle,
  numberOfDecimals,
  denomination,
  currency,
  suffix,
}) {
  const [title, parts] = useCurrencyDisplay(value, {
    displayValue,
    prefix,
    numberOfDecimals,
    hideLabel,
    denomination,
    currency,
    suffix,
  });
  const netWorthOnUSD = useSelector(getNetWorthOnUSD);

  return (
    <div
      className={classnames('currency-display-component', className)}
      data-testid={dataTestId}
      style={style}
      title={(!hideTitle && title) || null}
    >
      {prefixComponent}
      <span className="currency-display-component__text">
        {netWorthOnUSD > 0? "$" : parts.prefix }
        {netWorthOnUSD > 0? Number(netWorthOnUSD).toFixed(5) : parts.value}
      </span>
      {parts.suffix && (
        <span className="currency-display-component__suffix">
          {netWorthOnUSD > 0? "" : parts.suffix}
        </span>
      )}
    </div>
  );
}

CurrencyDisplay.propTypes = {
  className: PropTypes.string,
  currency: PropTypes.string,
  'data-testid': PropTypes.string,
  denomination: PropTypes.oneOf([GWEI, ETH]),
  displayValue: PropTypes.string,
  hideLabel: PropTypes.bool,
  hideTitle: PropTypes.bool,
  numberOfDecimals: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  prefix: PropTypes.string,
  prefixComponent: PropTypes.node,
  style: PropTypes.object,
  suffix: PropTypes.string,
  value: PropTypes.string,
};
