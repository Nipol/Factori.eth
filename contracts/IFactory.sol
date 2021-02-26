/**
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */

pragma solidity ^0.8.0;

interface IFactory {
    struct Template {
        address template;
        uint256 price;
    }
}