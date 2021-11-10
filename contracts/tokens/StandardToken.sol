/**
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */

pragma solidity ^0.8.0;

import "@beandao/contracts/library/Initializer.sol";
import "@beandao/contracts/library/Ownership.sol";
import "@beandao/contracts/library/Multicall.sol";
import "@beandao/contracts/library/ERC2612.sol";
import "@beandao/contracts/interfaces/IMulticall.sol";
import "@beandao/contracts/interfaces/IMint.sol";
import "@beandao/contracts/interfaces/IBurn.sol";
import "@beandao/contracts/interfaces/IERC2612.sol";
import "@beandao/contracts/interfaces/IERC165.sol";
import "@beandao/contracts/interfaces/IERC173.sol";
import "@beandao/contracts/interfaces/IERC20.sol";
import "../ITemplateV1.sol";


contract StandardToken is
    IERC20,
    IERC2612,
    IBurn,
    IMint,
    IERC165,
    IERC173,
    IMulticall,
    ITemplateV1,
    ERC2612,
    Multicall,
    Ownership,
    Initializer
{
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function initialize(
        string memory contractVersion,
        string memory tokenName,
        string memory tokenSymbol,
        uint8 tokenDecimals
    ) external initializer {
        _transferOwnership(msg.sender);
        ERC2612._initDomainSeparator(contractVersion, tokenName);
        name = tokenName;
        symbol = tokenSymbol;
        decimals = tokenDecimals;
        balanceOf[address(this)] = type(uint256).max;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        _approve(msg.sender, spender, value);
        return true;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool) {
        allowance[from][msg.sender] -= value;
        _transfer(from, to, value);
        return true;
    }

    /**
     * @notice Update allowance with a signed permit
     * @param _owner       Token owner's address (Authorizer)
     * @param spender     Spender's address
     * @param value       Amount of allowance
     * @param deadline    Expiration time, seconds since the epoch
     * @param v           v of the signature
     * @param r           r of the signature
     * @param s           s of the signature
     */
    function permit(
        address _owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        _permit(_owner, spender, value, deadline, v, r, s);
    }

    function mint(uint256 value) external onlyOwner returns (bool) {
        balanceOf[msg.sender] += value;
        totalSupply += value;
        emit Transfer(address(0), msg.sender, value);
        return true;
    }

    function mintTo(address to, uint256 value) external onlyOwner returns (bool) {
        balanceOf[to] += value;
        totalSupply += value;
        emit Transfer(address(0), to, value);
        return true;
    }

    function burn(uint256 value) external onlyOwner returns (bool) {
        balanceOf[msg.sender] -= value;
        totalSupply -= value;
        emit Transfer(msg.sender, address(0), value);
        return true;
    }

    function burnFrom(address from, uint256 value) external onlyOwner returns (bool) {
        allowance[from][msg.sender] -= value;
        balanceOf[from] -= value;
        totalSupply = totalSupply - value;
        emit Transfer(from, address(0), value);
        return true;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            // ERC20
            interfaceId == type(IERC20).interfaceId ||
            interfaceId == type(IMint).interfaceId ||
            interfaceId == type(IBurn).interfaceId ||
            // ERC2612
            interfaceId == type(IERC2612).interfaceId ||
            // ITemplateV1(ERC165, ERC173, IMulticall)
            interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(IERC173).interfaceId ||
            interfaceId == type(IMulticall).interfaceId;
    }

    function _transfer(
        address from,
        address to,
        uint256 value
    ) internal override {
        balanceOf[from] -= value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }

    function _approve(
        address _owner,
        address spender,
        uint256 value
    ) internal override {
        require(spender != address(this), "ERC20/Impossible-Approve-to-Self");
        allowance[_owner][spender] = value;
        emit Approval(_owner, spender, value);
    }
}
