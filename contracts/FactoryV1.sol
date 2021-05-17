/**
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */

pragma solidity ^0.8.0;

import "./Interface/IERC173.sol";
import "./Library/Ownership.sol";
import "./Library/Deployer.sol";
import "./IFactory.sol";
import "./IAllowlist.sol";

contract FactoryV1 is Ownership, IFactory {
    struct Entity {
        bytes32 _key;
        Template _value;
    }

    Entity[] public entities;
    mapping(bytes32 => uint256) public indexes;

    IAllowlist private immutable allowlist;

    constructor(address allowContract) {
        Ownership.initialize(msg.sender);
        allowlist = IAllowlist(allowContract);
    }

    function deploy(bytes32 templateId, bytes memory initializationCallData)
        external
        payable
        returns (address deployed)
    {
        Template memory tmp = _get(templateId);
        require(
            tmp.price == msg.value || allowlist.allowance(msg.sender),
            "Factory/Incorrect-amounts"
        );
        deployed = Deployer.deploy(tmp.template, initializationCallData);
        IERC173(deployed).transferOwnership(msg.sender);
        payable(this.owner()).transfer(msg.value);
        emit Deployed(deployed, msg.sender);
    }

    function deployWithCall(
        bytes32 templateId,
        bytes memory initializationCallData,
        bytes memory callData
    ) external payable returns (address deployed) {
        Template memory tmp = _get(templateId);
        require(
            tmp.price == msg.value || allowlist.allowance(msg.sender),
            "Factory/Incorrect-amounts"
        );
        deployed = Deployer.deploy(tmp.template, initializationCallData);

        (bool success, ) = deployed.call(callData);
        require(success, "Factory/Fail-to-deploy");

        IERC173(deployed).transferOwnership(msg.sender);
        payable(this.owner()).transfer(msg.value);
        emit Deployed(deployed, msg.sender);
    }

    function deployWithCalls(
        bytes32 templateId,
        bytes memory initializationCallData,
        bytes[] memory callDatas
    ) external payable returns (address deployed) {
        Template memory tmp = _get(templateId);
        require(
            tmp.price == msg.value || allowlist.allowance(msg.sender),
            "Factory/Incorrect-amounts"
        );
        deployed = Deployer.deploy(tmp.template, initializationCallData);
        for (uint256 i = 0; i < callDatas.length; i++) {
            (bool success, ) = deployed.call(callDatas[i]);
            require(success, "Factory/Fail-to-deploy");
        }

        IERC173(deployed).transferOwnership(msg.sender);
        payable(this.owner()).transfer(msg.value);
        emit Deployed(deployed, msg.sender);
    }

    function calculateDeployableAddress(
        bytes32 templateId,
        bytes memory initializationCallData
    ) external view returns (address deployable) {
        Template memory tmp = _get(templateId);
        deployable = Deployer.calculateAddress(
            tmp.template,
            initializationCallData
        );
    }

    function addTemplate(address templateAddr, uint256 price)
        external
        onlyOwner
        returns (bool success)
    {
        require(templateAddr != address(0), "Factory/Template-Address-is-Zero");
        Entity[] memory _entities = entities;
        for (uint256 i = 0; i < entities.length; i++) {
            require(
                _entities[i]._value.template != templateAddr,
                "Factory/Exist-Template"
            );
        }
        bytes32 key = keccak256(abi.encode(templateAddr, _entities.length));
        Template memory tmp = Template({template: templateAddr, price: price});

        _set(key, tmp);
        success = true;
        emit NewTemplate(key, templateAddr, price);
    }

    function updateTemplate(
        bytes32 key,
        address templateAddr,
        uint256 price
    ) external onlyOwner returns (bool success) {
        Template memory tmp = _get(key);
        if (templateAddr != address(0) && templateAddr != tmp.template) {
            tmp.template = templateAddr;
        }
        if (price != 0 && price != tmp.price) {
            tmp.price = price;
        }

        _set(key, tmp);
        success = true;
        emit UpdatedTemplate(key, tmp.template, tmp.price);
    }

    function removeTemplate(bytes32 key)
        external
        onlyOwner
        returns (bool success)
    {
        require(
            (success = _remove(key)) && success,
            "Factory/None-Exist-Template"
        );
    }

    function _set(bytes32 key, Template memory tmp) internal {
        uint256 keyIndex = indexes[key];

        if (keyIndex == 0) {
            entities.push(Entity({_key: key, _value: tmp}));
            indexes[key] = entities.length;
        } else {
            entities[keyIndex - 1]._value = tmp;
        }
    }

    function _get(bytes32 key) private view returns (Template memory) {
        uint256 keyIndex = indexes[key];
        require(keyIndex != 0, "Factory/None-Exist"); // Equivalent to contains(map, key)
        return entities[keyIndex - 1]._value; // All indexes are 1-based
    }

    function _remove(bytes32 key) private returns (bool success) {
        uint256 keyIndex = indexes[key];

        if (keyIndex != 0) {
            uint256 toDeleteIndex = keyIndex - 1;
            uint256 lastIndex = entities.length - 1;

            Entity storage lastEntity = entities[lastIndex];

            entities[toDeleteIndex] = lastEntity;
            indexes[lastEntity._key] = toDeleteIndex + 1;

            entities.pop();

            delete indexes[key];
            success = true;
        } else {
            success = false;
        }
    }
}
