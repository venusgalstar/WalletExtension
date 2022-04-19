// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./IJoeRouter02.sol";
import "./IJoeFactory.sol";

contract swapTest is Ownable {

    using SafeMath for uint256;
            
    IJoeRouter02 _joeV2Router;
    IJoeFactory _joeFactory;
    uint8 pauseContract = 0;
    address ManagerWallet;
    address dexRouterAddress = address(0x60aE616a2155Ee3d9A68541Ba4544862310933d4);
    address nativeWrappedCurrencyAddr = address(0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7);
    address factoryAddress = address(0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10);

    event Received(address, uint);
    event Fallback(address, uint);
    event SetContractStatus(address addr, uint256 pauseValue);
    event WithdrawAll(address addr, uint256 token, uint256 native);

    constructor() 
    {          
        _joeV2Router = IJoeRouter02(dexRouterAddress);   
        _joeFactory = IJoeFactory(factoryAddress);
        ManagerWallet = address(0xe28f60670529EE8d14277730CDA405e24Ac7251A);
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    fallback() external payable { 
        emit Fallback(msg.sender, msg.value);
    }

    function isPairExists(address _Atoken, address _Btoken) public view returns(bool){        
        return _joeFactory.getPair(_Atoken, _Btoken) != address(0);
    }

    function isSwapPathExists(address _Atoken, address _Btoken) public view returns(bool){        
        return _joeFactory.getPair(_Atoken, _Btoken) != address(0) || 
            (_joeFactory.getPair(_Atoken, nativeWrappedCurrencyAddr) != address(0) && _joeFactory.getPair(nativeWrappedCurrencyAddr, _Btoken) != address(0));
    }

    function getContractStatus() external view returns (uint8) {
        return pauseContract;
    }

    function setContractStatus(uint8 _newPauseContract) external onlyOwner {
        pauseContract = _newPauseContract;
        emit SetContractStatus(msg.sender, _newPauseContract);
    }

    function setFactoryAddress(address _addr) public onlyOwner{
        require(pauseContract == 0, "Contract Paused");
        factoryAddress = _addr;
    }

    function getFactoryAddress() public view returns(address){
        return factoryAddress;
    }

    function setnativeWrappedCurrencyAddress(address _addr) public onlyOwner{
        require(pauseContract == 0, "Contract Paused");
        nativeWrappedCurrencyAddr = _addr;
    }

    function getnativeWrappedCurrencyAddress() public view returns(address){
        return nativeWrappedCurrencyAddr;
    }

    function setManagerWallet(address _addr) public onlyOwner{
        require(pauseContract == 0, "Contract Paused");
        ManagerWallet = _addr;
    }

    function getManagerWallet() public view returns(address){
        return ManagerWallet;
    }

    function setDexRouterAddress(address _addr) public onlyOwner{
        require(pauseContract == 0, "Contract Paused");
        dexRouterAddress = _addr;
    }

    function getDexRouterAddress() public view returns(address){
        return dexRouterAddress;
    }

    function swap(address _Aaddress, address _Baddress, uint256 _amountIn, uint256 _slippage) public 
    {
        require(pauseContract == 0, "Contract Paused");
        require(_Aaddress != address(0), "Invalid A token address.");
        require(_Baddress != address(0), "Invalid B token address.");
        require(_amountIn > 0 , "Invalid amount");
        require(_slippage >= 0 && _slippage <= 100, "Invalid slippage.");
        require(IERC20(_Aaddress).balanceOf(msg.sender) > _amountIn, "Insufficient balance of A token.");

        IERC20 _tokenAContract = IERC20(_Aaddress);        
        _tokenAContract.transferFrom(msg.sender, address(this), _amountIn);    
        _tokenAContract.approve(address(_joeV2Router), _amountIn);    
        
        address[] memory path;
        if (_Aaddress == nativeWrappedCurrencyAddr || _Baddress == nativeWrappedCurrencyAddr ) 
        {
            path = new address[](2);
            path[0] = _Aaddress;
            path[1] = _Baddress;
        } 
        else {
            path = new address[](3);
            path[0] = _Aaddress;
            path[1] = nativeWrappedCurrencyAddr;
            path[2] = _Baddress;
        }
        uint256 _realAmountIn = _amountIn.mul(999).div(1000);             
        uint256 _realRequestedAmountOutMin  = getAmountOut(_Aaddress, _Baddress, _realAmountIn).mul(100 - _slippage).div(100);  
        _joeV2Router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
            _realAmountIn,
            _realRequestedAmountOutMin,               
            path,
            address(msg.sender),
            block.timestamp
        );
        _tokenAContract.transfer(ManagerWallet, _amountIn.sub(_realAmountIn));     
    }

    function getBalanceOfToken(address _tokenAddr) public view returns(uint256){
        return IERC20(_tokenAddr).balanceOf(address(this));
    }

    function getAmountOut(address _Aaddress, address _Baddress, uint256 _amountIn) public view returns(uint256) { 
        require(_Aaddress != address(0), "Invalid A token address.");
        require(_Baddress != address(0), "Invalid B token address.");       
        require(_amountIn > 0 , "Invalid amount");

        address[] memory path;
        if (_Aaddress == nativeWrappedCurrencyAddr || _Baddress == nativeWrappedCurrencyAddr ) 
        {
            path = new address[](2);
            path[0] = _Aaddress;
            path[1] = _Baddress;
        } 
        else {
            path = new address[](3);
            path[0] = _Aaddress;
            path[1] = nativeWrappedCurrencyAddr;
            path[2] = _Baddress;
        }
        uint256[] memory amountOutMins = _joeV2Router.getAmountsOut(_amountIn, path);
        return amountOutMins[path.length -1];  
    }
    
    function withdrawAll() external onlyOwner{
        // uint256 balance = IERC20(exchangeingTokenAddr).balanceOf(address(this));
        // if(balance > 0) {
        //     IERC20(exchangeingTokenAddr).transfer(msg.sender, balance);
        // }
        address payable mine = payable(msg.sender);
        if(address(this).balance > 0) {
            mine.transfer(address(this).balance);
        }
        // emit WithdrawAll(msg.sender, balance, address(this).balance);
        emit WithdrawAll(msg.sender, 0, address(this).balance);
    }

}

