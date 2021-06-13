/**
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */

pragma solidity ^0.8.0;

interface IFactory {
    struct Template {
        address template;
        uint256 price;
    }

    function deploy(bytes32 templateId, bytes memory initializationCallData)
        external
        payable
        returns (address deployed);

    function deployWithCalls(
        bytes32 templateId,
        bytes memory initializationCallData,
        bytes[] memory callDatas
    ) external payable returns (address deployed);

    function calculateDeployableAddress(
        bytes32 templateId,
        bytes memory initializationCallData
    ) external view returns (address deployable);

    function getPrice(bytes32 templateId) external view returns (uint256 price);

    event Deployed(address deployed, address owner);
    event NewTemplate(
        bytes32 indexed key,
        address indexed template,
        uint256 price
    );
    event UpdatedTemplate(
        bytes32 indexed key,
        address indexed template,
        uint256 price
    );
}
