/**
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */
pragma solidity ^0.8.0;

import "@beandao/contracts/library/Initializer.sol";
import "@beandao/contracts/library/Ownership.sol";
import "@beandao/contracts/library/Multicall.sol";
import "./ITemplateV1.sol";
import "@beandao/contracts/interfaces/IERC721Metadata.sol";
import "@beandao/contracts/interfaces/IERC721.sol";

// mint와 burn 필요.
// mint는 오너 서명에 의해 생성될 수 있는 기능 필요.
contract StandardNFT is IERC721, IERC721Metadata, ITemplateV1, Multicall, Ownership, Initializer {
    string public override name;
    string public override symbol;
    mapping(uint256 => string) public override tokenURI;
    mapping(address => uint256) public override balanceOf;
    mapping(uint256 => address) public override ownerOf;

    function initialize(string memory nameStr, string memory symbolStr) external initializer {
        Ownership.initialize(msg.sender);
        name = nameStr;
        symbol = symbolStr;
    }

    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _tokenId,
        bytes memory data
    ) external payable override {}

    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _tokenId
    ) external payable override {}

    function transferFrom(
        address _from,
        address _to,
        uint256 _tokenId
    ) external payable override {}

    function approve(address _approved, uint256 _tokenId) external payable override {}

    function setApprovalForAll(address _operator, bool _approved) external override {}

    function getApproved(uint256 _tokenId) external view override returns (address) {}

    function isApprovedForAll(address _owner, address _operator) external view override returns (bool) {}

    function supportsInterface(bytes4 interfaceID) external pure override returns (bool) {
        return
            interfaceID == type(IERC165).interfaceId || // ERC165
            interfaceID == type(IERC173).interfaceId || // ERC173
            interfaceID == type(IERC721Metadata).interfaceId || // ERC721Metadata
            interfaceID == type(IERC721).interfaceId || // ERC721
            interfaceID == type(ITemplateV1).interfaceId; // ITemplateV1
    }
}
