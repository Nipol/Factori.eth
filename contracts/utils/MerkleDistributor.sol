/**
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Origin by https://github.com/Uniswap/merkle-distributor
 */
pragma solidity ^0.8.0;

import "@beandao/contracts/interfaces/IERC20.sol";
import "@beandao/contracts/interfaces/IERC165.sol";
import "@beandao/contracts/interfaces/IERC173.sol";
import "@beandao/contracts/interfaces/IMulticall.sol";
import "@beandao/contracts/library/Initializer.sol";
import "@beandao/contracts/library/Ownership.sol";
import "@beandao/contracts/library/Multicall.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "../ITemplateV1.sol";

contract MerkleDistributor is ITemplateV1, Multicall, Ownership, Initializer {
    IERC20 public token;
    bytes32 public root;
    mapping(uint256 => uint256) private claimedIndex;

    event Claimed(uint256 index, address account, uint256 amount);
    event Finalized(address token, bytes32 merkleroot);

    function initialize(address tokenAddr, bytes32 merkleRoot) external initializer {
        _transferOwnership(msg.sender);
        token = IERC20(tokenAddr);
        root = merkleRoot;
    }

    function isClaimed(uint256 index) public view returns (bool) {
        uint256 claimedWordIndex = index / 256;
        uint256 claimedBitIndex = index % 256;
        uint256 claimedWord = claimedIndex[claimedWordIndex];
        uint256 mask = (1 << claimedBitIndex);
        return claimedWord & mask == mask;
    }

    function _setClaimed(uint256 index) private {
        uint256 claimedWordIndex = index / 256;
        uint256 claimedBitIndex = index % 256;
        claimedIndex[claimedWordIndex] = claimedIndex[claimedWordIndex] | (1 << claimedBitIndex);
    }

    function claim(
        uint256 index,
        address account,
        uint256 amount,
        bytes32[] calldata merkleProof
    ) external {
        require(!isClaimed(index), "MerkleDistributor/Already claimed");

        // Verify the merkle proof.
        bytes32 node = keccak256(abi.encodePacked(index, account, amount));
        require(MerkleProof.verify(merkleProof, root, node), "MerkleDistributor/Invalid proof");

        // Mark it claimed and send the token.
        _setClaimed(index);
        token.transfer(account, amount);

        emit Claimed(index, account, amount);
    }

    /**
     * 클레임된 비트맵을 유지하면서, 새로운 트리를 등록합니다.
     */
    function updateTree(bytes32 merkleRoot) external onlyOwner {
        require(merkleRoot != bytes32(0), "MerkleDistributor/Invalid Input");
        root = merkleRoot;
    }

    /**
     * 배포 종료
     * 남은 토큰을 오너에게 전송하고, 가스를 낭비하지 않도록 MerkleRoot를 0으로 변경한다.
     */
    function finalize() external onlyOwner {
        uint256 balance = token.balanceOf(address(this));
        token.transfer(msg.sender, balance);
        root = bytes32(0);
        emit Finalized(address(token), root);
    }

    function supportsInterface(bytes4 interfaceID) external pure override returns (bool) {
        return
            interfaceID == type(IERC165).interfaceId ||
            interfaceID == type(IERC173).interfaceId ||
            interfaceID == type(IMulticall).interfaceId;
    }
}
