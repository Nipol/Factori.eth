/**
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Origin by https://github.com/Uniswap/merkle-distributor
 */
pragma solidity ^0.8.0;

interface IL2StandardERC20 {
    function l1Token() external returns (address);

    function mint(address _to, uint256 _amount) external;

    function burn(address _from, uint256 _amount) external;

    event Mint(address indexed _account, uint256 _amount);
    event Burn(address indexed _account, uint256 _amount);
}
