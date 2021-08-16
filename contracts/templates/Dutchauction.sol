/**
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */

pragma solidity ^0.8.0;

import "@beandao/contracts/library/Multicall.sol";
import "@beandao/contracts/library/Ownership.sol";
import "@beandao/contracts/library/Initializer.sol";
import "./ITemplateV1.sol";

contract DutchAuction is ITemplateV1, Multicall, Ownership, Initializer {
    function supportsInterface(bytes4 interfaceID) external pure override returns (bool) {
        return
            interfaceID == type(IERC165).interfaceId || // ERC165
            interfaceID == type(IERC173).interfaceId || // ERC173
            interfaceID == type(ITemplateV1).interfaceId; // ITemplateV1
    }
}
