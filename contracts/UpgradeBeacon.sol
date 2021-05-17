/**
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */

pragma solidity ^0.8.0;

contract UpgradeBeacon {
    bytes32 private constant _IMPLEMENTATION_SLOT =
        bytes32(uint256(keccak256("eip1967.proxy.implementation")) - 1);

    address private immutable _CONTROLLER;

    event Upgraded(address indexed implementation);

    constructor() {
        _CONTROLLER = msg.sender;
    }

    fallback() external payable {
        bytes32 slot = _IMPLEMENTATION_SLOT;
        if (msg.sender == _CONTROLLER) {
            address implementation;
            // solhint-disable-next-line no-inline-assembly
            assembly {
                implementation := calldataload(0)
                sstore(slot, implementation)
            }
            emit Upgraded(implementation);
        }
        // solhint-disable-next-line no-inline-assembly
        assembly {
            mstore(0, sload(slot))
            return(0, 32)
        }
    }
}
