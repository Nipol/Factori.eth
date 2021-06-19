/**
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */

pragma solidity ^0.8.0;

import "./Library/Initializer.sol";
import "./Library/Ownership.sol";
import "./Library/Multicall.sol";
import "./Library/ERC2612.sol";
import "./Interface/IERC20.sol";
import "./Interface/IERC165.sol";
import "./Interface/IERC2612.sol";
import "./ITemplateV1.sol";

contract StandardToken is
    ITemplateV1,
    IERC2612,
    IERC165,
    IERC20,
    ERC2612,
    Multicall,
    Ownership,
    Initializer
{
    string public override name;
    string public override symbol;
    uint8 public override decimals;
    uint256 public override totalSupply;

    mapping(address => uint256) public override balanceOf;
    mapping(address => mapping(address => uint256)) public override allowance;

    function initialize(
        string memory contractVersion,
        string memory tokenName,
        string memory tokenSymbol,
        uint8 tokenDecimals
    ) external initializer {
        Ownership.initialize(msg.sender);
        ERC2612._initDomainSeparator(contractVersion, tokenName);
        name = tokenName;
        symbol = tokenSymbol;
        decimals = tokenDecimals;
        balanceOf[address(this)] = type(uint256).max;
    }

    function approve(address spender, uint256 value)
        external
        override
        returns (bool)
    {
        _approve(msg.sender, spender, value);
        return true;
    }

    function transfer(address to, uint256 value)
        external
        override
        returns (bool)
    {
        _transfer(msg.sender, to, value);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external override returns (bool) {
        allowance[from][msg.sender] = allowance[from][msg.sender] - value;
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
    ) external override {
        _permit(_owner, spender, value, deadline, v, r, s);
    }

    function mint(uint256 value) external onlyOwner returns (bool) {
        balanceOf[msg.sender] = balanceOf[msg.sender] + value;
        totalSupply = totalSupply + value;
        emit Transfer(address(0), msg.sender, value);
        return true;
    }

    function mintTo(address to, uint256 value)
        external
        onlyOwner
        returns (bool)
    {
        require(to != address(this), "ERC20/Not-Allowed-Transfer");
        balanceOf[to] = balanceOf[to] + value;
        totalSupply = totalSupply + value;
        emit Transfer(address(0), to, value);
        return true;
    }

    function burn(uint256 value) external onlyOwner returns (bool) {
        balanceOf[msg.sender] = balanceOf[msg.sender] - value;
        totalSupply = totalSupply - value;
        emit Transfer(msg.sender, address(0), value);
        return true;
    }

    function burnFrom(address from, uint256 value)
        external
        onlyOwner
        returns (bool)
    {
        allowance[from][msg.sender] = allowance[from][msg.sender] - value;
        balanceOf[from] = balanceOf[from] - value;
        totalSupply = totalSupply - value;
        emit Transfer(msg.sender, address(0), value);
        return true;
    }

    function supportsInterface(bytes4 interfaceID)
        external
        pure
        override
        returns (bool)
    {
        return
            interfaceID == type(IERC20).interfaceId || // ERC20
            interfaceID == type(IERC165).interfaceId || // ERC165
            interfaceID == type(IERC173).interfaceId || // ERC173
            interfaceID == type(IERC2612).interfaceId; // ERC2612
    }

    function _transfer(
        address from,
        address to,
        uint256 value
    ) internal override {
        balanceOf[from] = balanceOf[from] - value;
        balanceOf[to] = balanceOf[to] + value;
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
