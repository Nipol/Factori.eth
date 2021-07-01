/**
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */

pragma solidity ^0.8.0;

import "@beandao/contracts/library/Multicall.sol";
import "./ITemplateV1.sol";

contract DutchAuction is ITemplateV1, Multicall {}
