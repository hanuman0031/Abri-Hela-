// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

contract ArbitrageExecutor is Ownable {
    using SafeERC20 for IERC20;

    constructor() Ownable(msg.sender) {}

    receive() external payable {}

    /**
     * @dev Executes cross-DEX arbitrage between two Uniswap V2-style routers.
     * @param routerA Address of the first DEX router (Buy).
     * @param routerB Address of the second DEX router (Sell).
     * @param pathA Token path for the first swap (e.g., [TokenIn, TokenOut]).
     * @param pathB Token path for the second swap (e.g., [TokenOut, TokenIn]).
     * @param amountIn Amount of TokenIn to start the arbitrage.
     * @param minProfit Minimum acceptable profit in startToken.
     */
    function executeArbitrage(
        address routerA,
        address routerB,
        address[] calldata pathA,
        address[] calldata pathB,
        uint256 amountIn,
        uint256 minProfit
    ) external onlyOwner {
        require(pathA.length >= 2 && pathB.length >= 2, "Invalid paths");
        require(pathA[0] == pathB[pathB.length - 1], "Mismatched paths");
        
        address startToken = pathA[0];
        
        // Record starting balance
        uint256 balanceBefore = IERC20(startToken).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient starting balance");

        // --- LEG 1: Swap on DEX A ---
        IERC20(startToken).forceApprove(routerA, amountIn);
        uint[] memory amountsOutA = IUniswapV2Router(routerA).swapExactTokensForTokens(
            amountIn,
            0, // Slippage is handled by final revert logic
            pathA,
            address(this),
            block.timestamp
        );
        uint256 amountReceivedA = amountsOutA[amountsOutA.length - 1];

        // --- LEG 2: Swap on DEX B ---
        IERC20(pathB[0]).forceApprove(routerB, amountReceivedA);
        IUniswapV2Router(routerB).swapExactTokensForTokens(
            amountReceivedA,
            0, 
            pathB,
            address(this),
            block.timestamp
        );

        // --- RISK-FREE REVERT LOGIC ---
        // Ensure the transaction is net-positive, else revert the entire state
        uint256 balanceAfter = IERC20(startToken).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "Arbitrage not profitable: net loss");
        
        uint256 profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum threshold");
    }

    /**
     * @dev Executes cross-DEX arbitrage where Leg 1 is V3 and Leg 2 is V2.
     * Included to fulfill V3 interface requirements.
     */
    function executeArbitrageV3toV2(
        address routerV3,
        address routerV2,
        address tokenIn,
        address tokenOut,
        uint24 poolFeeV3,
        address[] calldata pathV2,
        uint256 amountIn,
        uint256 minProfit
    ) external onlyOwner {
        require(pathV2[pathV2.length - 1] == tokenIn, "Mismatched tokens");
        
        uint256 balanceBefore = IERC20(tokenIn).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");

        // --- LEG 1: V3 Swap ---
        IERC20(tokenIn).forceApprove(routerV3, amountIn);
        uint256 amountReceivedA = IUniswapV3Router(routerV3).exactInputSingle(
            IUniswapV3Router.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: poolFeeV3,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );

        // --- LEG 2: V2 Swap ---
        IERC20(tokenOut).forceApprove(routerV2, amountReceivedA);
        IUniswapV2Router(routerV2).swapExactTokensForTokens(
            amountReceivedA,
            0,
            pathV2,
            address(this),
            block.timestamp
        );

        // --- RISK-FREE REVERT LOGIC ---
        uint256 balanceAfter = IERC20(tokenIn).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "Arbitrage not profitable: net loss");
        require((balanceAfter - balanceBefore) >= minProfit, "Profit below minimum threshold");
    }

    /**
     * @dev Rescue tokens/profits
     */
    function withdrawToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}
