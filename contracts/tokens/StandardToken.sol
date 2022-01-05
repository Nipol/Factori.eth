/**
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */

pragma solidity ^0.8.0;

import "@beandao/contracts/interfaces/IMint.sol";
import "@beandao/contracts/interfaces/IBurn.sol";
import "@beandao/contracts/interfaces/IERC165.sol";
import {Initializer} from "@beandao/contracts/library/Initializer.sol";
import {Ownership, IERC173} from "@beandao/contracts/library/Ownership.sol";
import {ERC20, IERC20} from "@beandao/contracts/library/ERC20.sol";
import {ERC2612, IERC2612} from "@beandao/contracts/library/ERC2612.sol";
import {Multicall, IMulticall} from "@beandao/contracts/library/Multicall.sol";

contract StandardToken is ERC20, ERC2612, Ownership, Multicall, Initializer, IERC165, IBurn, IMint {
    function initialize(
        string memory _name,
        string memory _symbol,
        uint8 _decimals
    ) external initializer {
        version = "1";
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        balanceOf[address(this)] = type(uint256).max;
        _initDomainSeparator(_name, version);
        _transferOwnership(msg.sender);
    }

    function mint(uint256 value) external onlyOwner returns (bool) {
        balanceOf[msg.sender] += value;
        totalSupply += value;
        emit Transfer(address(0), msg.sender, value);
        return true;
    }

    function mintTo(address to, uint256 value) external onlyOwner returns (bool) {
        balanceOf[to] += value;
        totalSupply += value;
        emit Transfer(address(0), to, value);
        return true;
    }

    function burn(uint256 value) external onlyOwner returns (bool) {
        balanceOf[msg.sender] -= value;
        totalSupply -= value;
        emit Transfer(msg.sender, address(0), value);
        return true;
    }

    function burnFrom(address from, uint256 value) external onlyOwner returns (bool) {
        allowance[from][msg.sender] -= value;
        balanceOf[from] -= value;
        totalSupply = totalSupply - value;
        emit Transfer(from, address(0), value);
        return true;
    }

    function supportsInterface(bytes4 interfaceID) external pure returns (bool) {
        return
            type(IERC20).interfaceId == interfaceID ||
            type(IERC2612).interfaceId == interfaceID ||
            type(IERC173).interfaceId == interfaceID ||
            type(IERC165).interfaceId == interfaceID ||
            type(IMulticall).interfaceId == interfaceID ||
            type(IBurn).interfaceId == interfaceID ||
            type(IMint).interfaceId == interfaceID;
    }
}
