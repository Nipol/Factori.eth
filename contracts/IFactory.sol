/**
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */

pragma solidity ^0.8.0;

interface IFactory {
    struct Template {
        address template;
        uint256 price;
    }

    event NewToken(address token, address owner);
    event NewTemplate(bytes32 indexed key, address indexed template, uint256 price);
    event UpdatedTemplate(bytes32 indexed key, address indexed template, uint256 price);
}