/**
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */
pragma solidity ^0.8.0;

import "@beandao/contracts/interfaces/IERC165.sol";
import {Ownership, IERC173} from "@beandao/contracts/library/Ownership.sol";
import {Initializer} from "@beandao/contracts/library/Initializer.sol";
import {ERC721, IERC721, IERC721Enumerable, IERC721Metadata} from "@beandao/contracts/library/ERC721.sol";
import {Multicall, IMulticall} from "@beandao/contracts/library/Multicall.sol";

contract StandardERC721 is ERC721, Multicall, Ownership, Initializer {
    string public baseURI;

    function initialize(bytes calldata data) external initializer {
        (name, symbol, baseURI) = abi.decode(data, (string, string, string));
        _transferOwnership(msg.sender);
    }

    function tokenURI(uint256 tokenId) external view override returns (string memory uri) {
        uri = string(abi.encodePacked(baseURI, tokenId));
    }

    function mint(uint256 tokenId) external {
        _mint(msg.sender, tokenId);
    }

    function mintTo(address to, uint256 tokenId) external {
        _mint(to, tokenId);
    }

    function safeMint(
        address to,
        uint256 tokenId,
        bytes memory data
    ) external {
        _safeMint(to, tokenId, data);
    }

    function safeMint(address to, uint256 tokenId) external {
        _safeMint(to, tokenId, "");
    }

    function burn(uint256 tokenId) external {
        _burn(tokenId);
    }
}
