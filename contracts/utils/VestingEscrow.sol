/**
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */
pragma solidity ^0.8.0;

import "@beandao/contracts/interfaces/IERC20.sol";
import "@beandao/contracts/interfaces/IERC165.sol";
import "@beandao/contracts/interfaces/IERC173.sol";
import "@beandao/contracts/interfaces/IERC2612.sol";
import "@beandao/contracts/library/Initializer.sol";
import "@beandao/contracts/library/Ownership.sol";
import "@beandao/contracts/library/Multicall.sol";
import "../ITemplateV1.sol";

contract VestingEscrow is ITemplateV1, Multicall, Ownership, Initializer {
    struct Vest {
        uint128 startTime;
        uint128 endTime;
        uint128 initialLocked;
        uint128 totalClaimed;
    }

    IERC20 public token;
    /// @notice 배포가 결정되지 않은 토큰 수량
    uint256 public unallocatedSupply;
    /// @notice 배포가 결정된 토큰 수량
    uint256 public allocatedSupply;

    mapping(address => Vest) public vests;

    event Funded(uint256 amount);
    event Locked(address indexed recipient, uint256 amount, uint256 startTime);
    event Claimed(address indexed recipient, uint256 amount);

    function initialize(address tokenAddr) external initializer {
        _transferOwnership(msg.sender);
        token = IERC20(tokenAddr);
    }

    /**
     * @notice 토큰을 필요한 수량만큼 해당 컨트랙트로 이관하는 함수
     */
    function fund(uint256 amount) external onlyOwner {
        require(token.transferFrom(msg.sender, address(this), amount), "VestingEscrow/Not-Enough");
        unallocatedSupply += amount;
        emit Funded(amount);
    }

    /**
     * @notice 토큰을 필요한 수량만큼 해당 컨트랙트로 이관하는 함수, 다만 Approve는 서명으로 수행함
     */
    function fund(
        uint256 amount,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external onlyOwner {
        IERC2612(address(token)).permit(msg.sender, address(this), amount, type(uint256).max, v, r, s);
        require(token.transferFrom(msg.sender, address(this), amount), "VestingEscrow/Not-Enough");
        unallocatedSupply += amount;
        emit Funded(amount);
    }

    /**
     * @notice 개별 주소에 베스팅을 지정하는 함수
     * @param recipient 베스팅이 지정될 주소
     * @param amount 베스팅 수량
     * @param startAt 베스팅 시작 시점, Unix time을 이용
     * @param endAt 베스팅 종료 시점, Unix time을 이용
     */
    function lock(
        address recipient,
        uint128 amount,
        uint128 startAt,
        uint128 endAt
    ) external onlyOwner {
        require(recipient != address(0), "VestingEscrow/Now-Allowed-For-Zero");
        require(unallocatedSupply >= amount, "VestingEscrow/Not-Enough-balance");
        require(vests[recipient].startTime == 0, "VestingEscrow/Already-Registred");
        require(startAt >= block.timestamp, "VestingEscrow/Forwarded-start");
        require(endAt > startAt, "VestingEscrow/Bigger-than-end");

        unallocatedSupply -= amount;
        vests[recipient] = Vest({startTime: startAt, endTime: endAt, initialLocked: amount, totalClaimed: 0});
        allocatedSupply += amount;
        emit Locked(recipient, amount, startAt);
    }

    function claim() external {
        this.claim(msg.sender);
    }

    function claim(address recipient) external {
        uint256 claimable = _vestedOf(recipient) - vests[recipient].totalClaimed;
        assert(token.transfer(recipient, claimable));
        allocatedSupply -= claimable;
        vests[recipient].totalClaimed += uint128(claimable);
        emit Claimed(recipient, claimable);
    }

    function decreaseLockedOf(address recipient, uint128 amount) external onlyOwner {
        // 아직 잠겨있는 물량보다, 줄여야 할 물량이 많아야 함
        require(_lockedOf(recipient) >= amount, "Not Enough");
        this.claim(recipient);
        vests[recipient].initialLocked -= amount;
        allocatedSupply -= amount;
        unallocatedSupply += amount;
    }

    function claimableOf(address recipient) public view returns (uint256 amount) {
        amount = _vestedOf(recipient) - vests[recipient].totalClaimed;
    }

    /// @notice 지정된 시간으로 부터 지금까지 할당된 총 토큰 수량
    function _vestedOf(address recipient) internal view returns (uint256 amount) {
        uint256 start = vests[recipient].startTime;
        uint256 end = vests[recipient].endTime;
        uint256 locked = vests[recipient].initialLocked;
        uint256 least = ((locked * (block.timestamp - start)) / (end - start));
        amount = block.timestamp < start ? 0 : least > locked ? locked : least;
    }

    /// @notice 지정된 시간으로 부터 지금까지 잠금되어 남아있는 총 토큰 수량
    function _lockedOf(address recipient) internal view returns (uint256 amount) {
        uint256 start = vests[recipient].startTime;
        uint256 end = vests[recipient].endTime;
        uint256 locked = vests[recipient].initialLocked;
        uint256 least = ((locked * (block.timestamp - start)) / (end - start));
        amount = block.timestamp < start ? locked : locked - least;
    }

    function supportsInterface(bytes4 interfaceID) external pure returns (bool) {
        return
            interfaceID == type(IERC165).interfaceId ||
            interfaceID == type(IERC173).interfaceId ||
            interfaceID == type(IMulticall).interfaceId;
    }
}
