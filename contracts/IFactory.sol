/**
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */

pragma solidity ^0.8.0;

interface IFactory {
    // 어떤 지불 수단으로
    // 슬롯 맞추기
    struct Template {
        // 20
        address template;
        // 20
        address owner;
        // 32
        uint256 price;
        // 1
        bool isBeacon;
    }

    function deploy(
        bytes32 templateId,
        bytes memory initializationCallData,
        bytes[] memory calls
    ) external payable returns (address deployed);

    function calculateDeployableAddress(bytes32 templateId, bytes memory initializationCallData)
        external
        view
        returns (address deployable);

    function getPrice(bytes32 templateId) external view returns (uint256 price);

    function addTemplate(
        address templateAddr,
        address ownerAddr,
        uint256 price
    ) external;

    function addBeacon(
        address templateAddr,
        address ownerAddr,
        uint256 price
    ) external returns (address beaconAddr);

    function updateTemplate(bytes32 key, bytes memory updateCode) external;

    function removeTemplate(bytes32 key) external;

    event Deployed(address deployed, address owner);
    event NewTemplate(bytes32 indexed key, address indexed template, uint256 price);
    event UpdatedTemplate(bytes32 indexed key, address indexed template, address indexed owner, uint256 price);
    event DeletedTemplate(bytes32 indexed key);
}
