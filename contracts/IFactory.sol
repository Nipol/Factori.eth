/**
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */

pragma solidity ^0.8.0;

interface IFactory {
    struct TemplateInfo {
        address template;
        address btemplate;
        address owner;
    }

    event Deployed(address deployed, address owner);
    event NewTemplate(bytes32 indexed key, address template, address beacon);
    event UpdatedTemplate(bytes32 indexed key, address template, address indexed owner);
    event DeletedTemplate(bytes32 indexed key);
    event ChangedFee(uint256 fee);
    event ChangedFeeTo(address feeTo);

    function deploy(
        bool isBeacon,
        bytes32 templateId,
        bytes memory initializationCallData,
        bytes[] memory calls
    ) external payable returns (address deployed);

    function deployWithSeed(
        string memory seed,
        bool isBeacon,
        bytes32 templateId,
        bytes memory initializationCallData,
        bytes[] memory calls
    ) external payable returns (address deployed);

    function compute(
        bool isBeacon,
        bytes32 templateId,
        bytes memory initializationCallData
    ) external view returns (address deployable);

    function computeWithSeed(
        string memory seed,
        bool isBeacon,
        bytes32 templateId,
        bytes memory initializationCallData
    ) external view returns (address deployable);

    function clone(
        address templateAddr,
        bytes memory initializationCallData,
        bytes[] memory calls
    ) external returns (address deployed);

    function computeClone(address templateAddr, bytes memory initializationCallData)
        external
        view
        returns (address deployable);

    function getPrice() external view returns (uint256 price);

    function addTemplate(address templateAddr, address ownerAddr) external;

    function updateTemplate(bytes32 key, bytes memory updateCode) external;

    function removeTemplate(bytes32 key) external;

    function changeFee(uint256 newFee) external;

    function changeFeeTo(address payable newFeeTo) external;

    function collect(address tokenAddr) external;

    function recoverOwnership(address deployed, address to) external;
}
