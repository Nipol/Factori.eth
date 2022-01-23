/**
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */

pragma solidity ^0.8.0;

import "@beandao/contracts/interfaces/IERC165.sol";
import {Initializer} from "@beandao/contracts/library/Initializer.sol";
import {ERC20, IERC20} from "@beandao/contracts/library/ERC20.sol";
import {ERC2612, IERC2612} from "@beandao/contracts/library/ERC2612.sol";
import {Multicall, IMulticall} from "@beandao/contracts/library/Multicall.sol";
import "./IL2StandardERC20.sol";

/**
 * @title L2StandardERC20
 * @author yoonsung.eth
 * @notice ERC20과 ERC2612를 기본으로, ERC165, ERC173 명세를 구현하고 있습니다.
 */
contract L2StandardERC20 is ERC20, ERC2612, Multicall, Initializer, IL2StandardERC20, IERC165 {
    address public immutable l2Bridge = 0x4200000000000000000000000000000000000010;
    address public l1Token;

    modifier onlyL2Bridge() {
        require(msg.sender == l2Bridge, "Only L2 Bridge can mint and burn");
        _;
    }

    /**
     * @notice ERC20을 초기화 합니다. 토큰의 이름, 심볼, 소수점 정보를 필요로 합니다. 이 함수는 실행될 때 단 한번만 실행됩니다.
     * 이 함수가 실행될 때 이 함수를 실행한 당사자가 해당 컨트랙트의 소유권을 받게됩니다.
     * @param data 토큰 이름, 토큰 심볼, 소수점 정보, L2 브릿지, L1 토큰 주소를 abi encode 하여, bytes 형태로 전달하여야 합니다.
     */
    function initialize(bytes calldata data) external initializer {
        (name, symbol, decimals, l1Token) = abi.decode(data, (string, string, uint8, address));
        version = "1";
        balanceOf[address(this)] = type(uint256).max;
        balanceOf[l1Token] = type(uint256).max;
        _initDomainSeparator(name, version);
    }

    function mint(address to, uint256 value) external onlyL2Bridge {
        totalSupply += value;
        unchecked {
            balanceOf[to] += value;
        }
        emit Transfer(address(0), to, value);
        emit Mint(to, value);
    }

    function burn(address from, uint256 value) external onlyL2Bridge {
        balanceOf[from] -= value;
        unchecked {
            totalSupply -= value;
        }
        emit Transfer(from, address(0), value);
        emit Burn(from, value);
    }

    function supportsInterface(bytes4 interfaceID) external pure returns (bool) {
        return
            type(IERC20).interfaceId == interfaceID ||
            type(IERC2612).interfaceId == interfaceID ||
            type(IERC165).interfaceId == interfaceID ||
            type(IL2StandardERC20).interfaceId == interfaceID ||
            type(IMulticall).interfaceId == interfaceID;
    }
}
