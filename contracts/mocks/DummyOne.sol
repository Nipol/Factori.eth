/**
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */

pragma solidity ^0.8.0;

import "@beandao/contracts/library/Initializer.sol";

contract DummyOne is Initializer {
    string public name;

    function initialize(string memory _name) external initializer {
        name = _name;
    }

    function checkName() external view returns (string memory) {
        return string(abi.encodePacked("DummyOne ", name));
    }
}
