/**
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */
pragma solidity ^0.8.0;

import "@beandao/contracts/interfaces/IERC165.sol";
import "@beandao/contracts/interfaces/IERC173.sol";
import "@beandao/contracts/interfaces/IMulticall.sol";

interface ITemplateV1 is IERC165, IERC173, IMulticall {}
