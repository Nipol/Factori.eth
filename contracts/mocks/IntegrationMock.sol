/**
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */

pragma solidity ^0.8.0;

import "@beandao/contracts/interfaces/IMulticall.sol";
import "@beandao/contracts/interfaces/IMint.sol";
import "@beandao/contracts/interfaces/IERC173.sol";
import "../IFactory.sol";

contract IntegrationMock {
    IFactory private Factory;
    bytes32 private TOKEN_KEY;

    event Sample(address deployed);

    constructor(address factoryAddr, bytes32 tokenKey) {
        Factory = IFactory(factoryAddr);
        TOKEN_KEY = tokenKey;
    }

    function deployToken(
        string calldata name,
        string calldata symbol,
        uint256 amount
    ) external payable returns (address deployed) {
        bytes[] memory callData = new bytes[](2);
        callData[0] = abi.encodeWithSelector(IMint.mintTo.selector, msg.sender, amount);
        callData[1] = abi.encodeWithSelector(IERC173.transferOwnership.selector, msg.sender);

        bytes memory init = abi.encodeWithSelector(
            bytes4(keccak256("initialize(string,string,string,uint8)")),
            "1",
            name,
            symbol,
            uint8(18)
        );
        deployed = Factory.deploy{value: msg.value}(TOKEN_KEY, init, callData);

        emit Sample(deployed);
    }

    function calculateAddress(string calldata name, string calldata symbol) external view returns (address calculated) {
        bytes memory init = abi.encodeWithSelector(
            bytes4(keccak256("initialize(string,string,string,uint8)")),
            "1",
            name,
            symbol,
            uint8(18)
        );
        calculated = Factory.calculateDeployableAddress(TOKEN_KEY, init);
    }
}

contract IntegrationSeedMock {
    IFactory private Factory;
    bytes32 private TOKEN_KEY;
    string private seed;

    event Sample(address deployed);

    constructor(
        string memory seedStr,
        address factoryAddr,
        bytes32 tokenKey
    ) {
        seed = seedStr;
        Factory = IFactory(factoryAddr);
        TOKEN_KEY = tokenKey;
    }

    function deployToken(
        string calldata name,
        string calldata symbol,
        uint256 amount
    ) external payable returns (address deployed) {
        bytes[] memory callData = new bytes[](2);
        callData[0] = abi.encodeWithSelector(IMint.mintTo.selector, msg.sender, amount);
        callData[1] = abi.encodeWithSelector(IERC173.transferOwnership.selector, msg.sender);

        bytes memory init = abi.encodeWithSelector(
            bytes4(keccak256("initialize(string,string,string,uint8)")),
            "1",
            name,
            symbol,
            uint8(18)
        );
        deployed = Factory.deploy{value: msg.value}(seed, TOKEN_KEY, init, callData);

        emit Sample(deployed);
    }

    function calculateAddress(string calldata name, string calldata symbol) external view returns (address calculated) {
        bytes memory init = abi.encodeWithSelector(
            bytes4(keccak256("initialize(string,string,string,uint8)")),
            "1",
            name,
            symbol,
            uint8(18)
        );
        calculated = Factory.calculateDeployableAddress(seed, TOKEN_KEY, init);
    }
}
