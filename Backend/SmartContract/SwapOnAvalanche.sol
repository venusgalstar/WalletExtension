// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./library/IJoeRouter02.sol";
import "./library/IJoeFactory.sol";
import "./library/IRouter.sol";
import "./library/IFactory.sol";

contract SwapOnAvalanche is Ownable {

    using SafeMath for uint256;
            
    IJoeRouter02 _joeV2Router;
    IJoeFactory _joeFactory;
    uint8 pauseContract = 0;
    address ManagerWallet;
    address dexRouterAddress = address(0x60aE616a2155Ee3d9A68541Ba4544862310933d4);     //Joe Router
    address nativeWrappedCurrencyAddr = address(0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7);
    address factoryAddress = address(0x9Ad6C38BE94206cA50bb0d90783181662f0Cfa10);

    event Received(address, uint);
    event Fallback(address, uint);
    event SetContractStatus(address addr, uint256 pauseValue);
    event WithdrawAll(address addr, uint256 token, uint256 native);

    struct erc20Info{
        bool isERC20;
        string name;
        string symbol;
        uint8 decimals;
    }

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
        require(_amountIn > 0 , "Invalid amount");
        require(_slippage >= 0 && _slippage <= 100, "Invalid slippage.");
        require(IERC20(_Aaddress).balanceOf(msg.sender) > _amountIn, "Insufficient balance of A token.");

        IERC20 _tokenAContract = IERC20(_Aaddress);        
        _tokenAContract.transferFrom(msg.sender, address(this), _amountIn);    
        _tokenAContract.approve(address(_joeV2Router), _amountIn);    
        
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
        _joeV2Router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
            _realAmountIn,
            _realRequestedAmountOutMin,               
            path,
            address(msg.sender),
            block.timestamp
        );
        _tokenAContract.transfer(ManagerWallet, _amountIn.sub(_realAmountIn));     
    }

    function swapExactAVAXForTokens(address _TokenAddress, uint256 _slippage) public payable{
        require(pauseContract == 0, "Contract Paused");
        require(_slippage >= 0 && _slippage <= 100, "Invalid slippage.");

        address[] memory path = new address[](2);
        path[0] = nativeWrappedCurrencyAddr;
        path[1] = _TokenAddress;

        uint256 _realAmountIn = msg.value.mul(999).div(1000);   
        uint256 _realRequestedAmountOutMin  = getAmountOut(nativeWrappedCurrencyAddr, _TokenAddress, _realAmountIn).mul(100 - _slippage).div(100);    

        _joeV2Router.swapExactAVAXForTokensSupportingFeeOnTransferTokens{value: _realAmountIn}(                
            _realRequestedAmountOutMin,               
            path,
            address(msg.sender),
            block.timestamp
        );

        payable(ManagerWallet).transfer(msg.value.sub(_realAmountIn));   
    }

    function swapExactTokenForAvax(address _TokenAddress, uint256 _amountIn, uint256 _slippage) public {
        require(pauseContract == 0, "Contract Paused");
        require(_amountIn > 0 , "Invalid amount");
        require(_slippage >= 0 && _slippage <= 100, "Invalid slippage.");

        address[] memory path = new address[](2);
        path[0] = _TokenAddress;
        path[1] = nativeWrappedCurrencyAddr;
        
        IERC20 _tokenAContract = IERC20(_TokenAddress);        
        _tokenAContract.transferFrom(msg.sender, address(this), _amountIn);    
        _tokenAContract.approve(address(_joeV2Router), _amountIn);    

        uint256 _realAmountIn = _amountIn.mul(999).div(1000);   
        uint256 _realRequestedAmountOutMin  = getAmountOut(_TokenAddress, nativeWrappedCurrencyAddr, _realAmountIn).mul(100 - _slippage).div(100);    

        _joeV2Router.swapExactTokensForAVAXSupportingFeeOnTransferTokens(   
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
        uint256[] memory amountOutMins = _joeV2Router.getAmountsOut(_amountIn, path);
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

    function checkERC20(address[] calldata tokenList) external view returns(erc20Info[] memory){
       
        erc20Info[] memory erc20InfoList = new erc20Info[](tokenList.length);
        uint256 idx;

        for( idx = 0; idx < tokenList.length; idx++ ){

            try ERC20(tokenList[idx]).allowance(address(this), address(this)) returns (uint256){
            }
            catch {
                erc20InfoList[idx].isERC20 = false;
                continue;
            }

            try ERC20(tokenList[idx]).decimals() returns (uint8 d){       
                erc20InfoList[idx].decimals = d;         
            } catch {
                erc20InfoList[idx].isERC20 = false;
                continue;
            } 

            try ERC20(tokenList[idx]).name() returns (string memory n){    
                erc20InfoList[idx].name = n;            
            } catch {
                erc20InfoList[idx].isERC20 = false;
                continue;
            }

            try ERC20(tokenList[idx]).symbol() returns (string memory s){       
                erc20InfoList[idx].symbol = s;
            } catch {
                erc20InfoList[idx].isERC20 = false;
                continue;
            }
            erc20InfoList[idx].isERC20 = true;
        }
        return erc20InfoList;
    }

    function getBalance(address account, address[] calldata tokenList) external view returns(uint256[] memory){
        uint256[] memory balances = new uint256[](tokenList.length);
        uint256 idx;
        for(idx = 0; idx < tokenList.length; idx++)
        {
            balances[idx] = IERC20(tokenList[idx]).balanceOf(account);
        }
        return balances;
    }

    function getDexInfo( address[] calldata routerList ) external view returns(uint[] memory)
    {
        uint256 idx;
        uint256[] memory pairCount = new uint256[](routerList.length);

        for( idx = 0; idx < routerList.length; idx++ )
        {
            pairCount[idx] = IDEXFactory(IDEXRouter(routerList[idx]).factory()).allPairsLength();
        }

        return pairCount;
    }

    function getTokenPrice(address[] calldata tokenList, address[] calldata routerList) external view returns(uint256[] memory ){
        uint256 idx;
        uint256 idx1;
        uint256 amountIn;
        uint256[] memory resPriceList = new uint256[](tokenList.length);
        address[] memory path = new address[](2);
        path[1] = nativeWrappedCurrencyAddr;

        for(idx = 0; idx < tokenList.length; idx++)
        {
            for( idx1 = 0; idx1 < routerList.length; idx1++ )
            {
                if( IDEXFactory(IDEXRouter(routerList[idx1]).factory()).getPair(tokenList[idx], nativeWrappedCurrencyAddr) != address(0) )
                    break;
            }

            if( idx1 == routerList.length ){
                resPriceList[idx] = 0;
            }
            else{
                path[0] = tokenList[idx];

                amountIn = 10 ** ERC20(path[0]).decimals();

                resPriceList[idx] = IDEXRouter(routerList[idx1]).getAmountsOut(amountIn, path)[1];
            }       
        }

        return resPriceList;
    }
}

