// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./IUniswapV2Router02.sol";

contract swapTest is Ownable {

    using SafeMath for uint256;
        
    event Received(address, uint);
    event Fallback(address, uint);
    
    IUniswapV2Router02 _uinswapV2Router;
    address fellWallet;
    address public constant WETH = address(0xc778417E063141139Fce010982780140Aa0cD5Ab);

    constructor() 
    {          
        _uinswapV2Router = IUniswapV2Router02(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D);   
        fellWallet = address(0xe28f60670529EE8d14277730CDA405e24Ac7251A);
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    fallback() external payable { 
        emit Fallback(msg.sender, msg.value);
    }

    function setFeeWallet(address _addr) public onlyOwner{
        fellWallet = _addr;
    }

    function getFeeWallet() public view returns(address){
        return fellWallet;
    }

    function swap(address _Aaddress, address _Baddress, uint256 _amountIn) public
    {
        require(_Aaddress != address(0), "Invalid A token address.");
        require(_Baddress != address(0), "Invalid B token address.");
        require(IERC20(_Aaddress).balanceOf(msg.sender) > _amountIn, "Insufficient balance of A token.");
        require(_amountIn > 0 , "Invalid amount");

        IERC20 _tokenAContract = IERC20(_Aaddress);        
        _tokenAContract.transferFrom(msg.sender, address(this), _amountIn);    
        _tokenAContract.approve(address(_uinswapV2Router), _amountIn);    
        
        address[] memory path;
        if (_Aaddress == WETH || _Baddress == WETH) 
        {
            path = new address[](2);
            path[0] = _Aaddress;
            path[1] = _Baddress;
        } 
        else {
            path = new address[](3);
            path[0] = _Aaddress;
            path[1] = WETH;
            path[2] = _Baddress;
        }
        uint256 _realAmountIn = _amountIn.mul(999).div(1000);       
        _uinswapV2Router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
            _realAmountIn,
            0,               
            path,
            address(msg.sender),
            block.timestamp
        );
        _tokenAContract.transfer(fellWallet, _amountIn.sub(_realAmountIn));
    }

    function getBalanceOfToken(address _tokenAddr) public view returns(uint256){
        return IERC20(_tokenAddr).balanceOf(address(this));
    }
}

