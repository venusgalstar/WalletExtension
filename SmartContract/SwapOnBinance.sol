// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./IPancakeRouter02.sol";
import "./IPancakeFactory.sol";

contract SwapOnBinance is Ownable {

    using SafeMath for uint256;
            
    IPancakeRouter02 _dexRouter;
    IPancakeFactory _dexFactory;
    uint8 pauseContract = 0;
    address ManagerWallet;
    address dexRouterAddress = address(0x10ED43C718714eb63d5aA57B78B54704E256024E);     //Pancakeswap Router
    address nativeWrappedCurrencyAddr = address(0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c);
    address dexFactoryAddress = address(0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73);

    event Received(address, uint);
    event Fallback(address, uint);
    event SetContractStatus(address addr, uint256 pauseValue);
    event WithdrawAll(address addr, uint256 token, uint256 native);

    constructor() 
    {          
        _dexRouter = IPancakeRouter02(dexRouterAddress);   
        _dexFactory = IPancakeFactory(dexFactoryAddress);
        ManagerWallet = address(0xe28f60670529EE8d14277730CDA405e24Ac7251A);
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    fallback() external payable { 
        emit Fallback(msg.sender, msg.value);
    }

    function isPairExists(address _Atoken, address _Btoken) public view returns(bool){        
        return _dexFactory.getPair(_Atoken, _Btoken) != address(0);
    }

    function isSwapPathExists(address _Atoken, address _Btoken) public view returns(bool){        
        return _dexFactory.getPair(_Atoken, _Btoken) != address(0) || 
            (_dexFactory.getPair(_Atoken, nativeWrappedCurrencyAddr) != address(0) && _dexFactory.getPair(nativeWrappedCurrencyAddr, _Btoken) != address(0));
    }

    function getContractStatus() external view returns (uint8) {
        return pauseContract;
    }

    function setContractStatus(uint8 _newPauseContract) external onlyOwner {
        pauseContract = _newPauseContract;
        emit SetContractStatus(msg.sender, _newPauseContract);
    }

    function setDexFactoryAddress(address _addr) public onlyOwner{
        require(pauseContract == 0, "Contract Paused");
        dexFactoryAddress = _addr;
    }

    function getDexFactoryAddress() public view returns(address){
        return dexFactoryAddress;
    }

    function setNativeWrappedCurrencyAddress(address _addr) public onlyOwner{
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
        require(_amountIn > 0 , "Invalid amount");
        require(_slippage >= 0 && _slippage <= 100, "Invalid slippage.");
        require(IERC20(_Aaddress).balanceOf(msg.sender) > _amountIn, "Insufficient balance of A token.");

        IERC20 _tokenAContract = IERC20(_Aaddress);        
        _tokenAContract.transferFrom(msg.sender, address(this), _amountIn);    
        _tokenAContract.approve(address(_dexRouter), _amountIn);    
        
        uint256 _realAmountIn = _amountIn.mul(999).div(1000);   
        uint256 _realRequestedAmountOutMin  = getAmountOut(_Aaddress, _Baddress, _realAmountIn).mul(100 - _slippage).div(100);     

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
        _dexRouter.swapExactTokensForTokensSupportingFeeOnTransferTokens(
            _realAmountIn,
            _realRequestedAmountOutMin,               
            path,
            address(msg.sender),
            block.timestamp
        );
        _tokenAContract.transfer(ManagerWallet, _amountIn.sub(_realAmountIn));     
    }

    function swapExactBNBForTokens(address _TokenAddress, uint256 _slippage) public payable{
        require(pauseContract == 0, "Contract Paused");
        require(_slippage >= 0 && _slippage <= 100, "Invalid slippage.");

        address[] memory path = new address[](2);
        path[0] = nativeWrappedCurrencyAddr;
        path[1] = _TokenAddress;

        uint256 _realAmountIn = msg.value.mul(999).div(1000);   
        uint256 _realRequestedAmountOutMin  = getAmountOut(nativeWrappedCurrencyAddr, _TokenAddress, _realAmountIn).mul(100 - _slippage).div(100);    

        _dexRouter.swapExactETHForTokensSupportingFeeOnTransferTokens{value: _realAmountIn}(                
            _realRequestedAmountOutMin,               
            path,
            address(msg.sender),
            block.timestamp
        );

        payable(ManagerWallet).transfer(msg.value.sub(_realAmountIn));   
    }

    function swapExactTokenForBNB(address _TokenAddress, uint256 _amountIn, uint256 _slippage) public {
        require(pauseContract == 0, "Contract Paused");
        require(_amountIn > 0 , "Invalid amount");
        require(_slippage >= 0 && _slippage <= 100, "Invalid slippage.");

        address[] memory path = new address[](2);
        path[0] = _TokenAddress;
        path[1] = nativeWrappedCurrencyAddr;
        
        IERC20 _tokenAContract = IERC20(_TokenAddress);        
        _tokenAContract.transferFrom(msg.sender, address(this), _amountIn);    
        _tokenAContract.approve(address(_dexRouter), _amountIn);    

        uint256 _realAmountIn = _amountIn.mul(999).div(1000);   
        uint256 _realRequestedAmountOutMin  = getAmountOut(_TokenAddress, nativeWrappedCurrencyAddr, _realAmountIn).mul(100 - _slippage).div(100);    

        _dexRouter.swapExactTokensForETHSupportingFeeOnTransferTokens(   
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
        uint256[] memory amountOutMins = _dexRouter.getAmountsOut(_amountIn, path);
        return amountOutMins[path.length -1];  
    }
    
    function withdrawAll(address _addr) external onlyOwner{
        uint256 balance = IERC20(_addr).balanceOf(address(this));
        if(balance > 0) {
            IERC20(_addr).transfer(msg.sender, balance);
        }
        address payable mine = payable(msg.sender);
        if(address(this).balance > 0) {
            mine.transfer(address(this).balance);
        }
        emit WithdrawAll(msg.sender, balance, address(this).balance);
    }
    
    function getSelector(string calldata _func) external pure returns (bytes4) {
        return bytes4(keccak256(bytes(_func)));
    }
}

