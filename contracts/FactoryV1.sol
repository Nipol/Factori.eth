/**
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */
pragma solidity ^0.8.0;

import "./Interface/IERC173.sol";
import "./Interface/IMulticall.sol";
import "./Library/Ownership.sol";
import "./Library/Deployer.sol";
import "./IFactory.sol";
import "./IAllowlist.sol";

/**
 * @title Factory V1
 * @author yoonsung.eth
 * @notice minimal proxy로 배포될 컨트랙트를 template로 추상화 하며 같은 컨트랙트를 쉽게 배포할 수 있도록 함.
 * @dev template에는 단 한번만 호출 가능한 initialize 함수가 필요하며, 이는 필수적으로 호출되어야 함.
 * ERC173이 구현되어 컨트랙트의 소유권을 옮길 수 있도록 하여야 함.
 */
contract FactoryV1 is Ownership, IFactory {
    struct Entity {
        bytes32 _key;
        Template _value;
    }

    Entity[] public entities;
    mapping(bytes32 => uint256) public indexes;
    /**
     * @notice template가 총 얼마나 사용되었는지 나타내는 값.
     */
    mapping(bytes32 => uint256) public nonces;

    IAllowlist private immutable allowlist;

    // 30 / 10000 = 0.3 %
    uint256 public constant FEE_RATE = 30;

    /**
     * @notice 허용 목록 컨트랙트가 미리 배포되어 주입 되어야 한다.
     * @param allowContract IAllowlist를 구현한 컨트랙트 주소
     */
    constructor(address allowContract) {
        Ownership.initialize(msg.sender);
        allowlist = IAllowlist(allowContract);
    }

    /**
     * @notice template id를 통해서 해당 컨트랙트를 배포하는 함수, 여기에는 initialize 함수를 한 번 호출할 수 있도록 call data가 필요함.
     * @param templateId bytes32 형태의 template id가 필요
     * @param initializationCallData 템플릿에 적합한 initialize 함수를 호출하는 함수 데이터
     * @param calls 컨트랙트가 배포된 이후에, 부수적으로 초기화 할 함수들이 있을 때 사용 가능함.
     */
    function deploy(
        bytes32 templateId,
        bytes memory initializationCallData,
        bytes[] memory calls
    ) external payable override returns (address deployed) {
        // 배포할 템플릿의 정보
        Template memory tmp = _get(templateId);
        // 템플릿을 배포하기 위한 수수료가 적정 수준인지, 템플릿 오너가 호출한 것인지 또는 호출자가 허용된 목록에 있는지 확인.
        require(
            tmp.price == msg.value ||
                tmp.owner == msg.sender ||
                allowlist.allowance(msg.sender),
            "Factory/Incorrect-amounts"
        );
        // 지정된 정보로 컨트랙트를 배포함.
        deployed = Deployer.deploy(tmp.template, initializationCallData);
        // 부수적으로 호출할 데이터가 있다면, 배포된 컨트랙트에 추가적인 call을 할 수 있음.
        if (calls.length > 0) IMulticall(deployed).multicall(calls);
        // 모든 호출이 끝나면, 배포된 컨트랙트의 소유권을 호출자로 이관함.
        IERC173(deployed).transferOwnership(msg.sender);
        // 해당 함수를 호출할 때 수수료가 담긴 경우에 수수료를 컨트랙트 소유자에게 전송하고 기존 수수료에서 일정 비율 만큼 수수료를 상승 시킴
        if (msg.value > 0) {
            payable(this.owner()).transfer(msg.value);
            tmp.price = ((tmp.price / 10000) * FEE_RATE);
            _set(templateId, tmp);
        }
        // 이벤트 호출
        emit Deployed(deployed, msg.sender);
    }

    /**
     * @notice template id를 통해서 컨트랙트를 배포할 주소를 미리 파악하는 함수
     * @param templateId bytes32 형태의 template id가 필요
     * @param initializationCallData 템플릿에 적합한 initialize 함수를 호출하는 함수 데이터
     */
    function calculateDeployableAddress(
        bytes32 templateId,
        bytes memory initializationCallData
    ) external view override returns (address deployable) {
        Template memory tmp = _get(templateId);
        deployable = Deployer.calculateAddress(
            tmp.template,
            initializationCallData
        );
    }

    /**
     * @notice template id에 따라서 컨트랙트를 배포하기 위한 필요 가격을 가져오는 함수
     * @param templateId 값을 가져올 템플릿의 아이디
     * @return price 이더리움으로 구성된 값을 가짐.
     */
    function getPrice(bytes32 templateId)
        external
        view
        override
        returns (uint256 price)
    {
        price = _get(templateId).price;
    }

    /**
     * @notice 템플릿으로 사용되기 적합한 인터페이스가 구현된 컨트랙트를 템플릿으로 가격과 함께 등록함.
     * @param templateAddr 템플릿으로 사용될 컨트랙트의 주소
     * @param ownerAddr 해당 템플릿의 소유주를 지정함. 해당 소유주는 수수료를 지불하지 않음.
     * @param price 템플릿으로 컨트랙트를 배포할 때 소모될 이더리움의 수량
     */
    function addTemplate(
        address templateAddr,
        address ownerAddr,
        uint256 price
    ) external onlyOwner returns (bool success) {
        require(templateAddr != address(0), "Factory/Template-Address-is-Zero");
        Entity[] memory _entities = entities;
        for (uint256 i = 0; i < entities.length; i++) {
            require(
                _entities[i]._value.template != templateAddr,
                "Factory/Exist-Template"
            );
        }
        bytes32 key = keccak256(abi.encode(templateAddr, _entities.length));
        Template memory tmp =
            Template({template: templateAddr, owner: ownerAddr, price: price});

        _set(key, tmp);
        success = true;
        emit NewTemplate(key, templateAddr, price);
    }

    /**
     * @notice 등록된 템플릿의 정보를 변경하는 함수
     * @param key 업데이트 될 템플릿의 아이디
     * @param updateCode 템플릿 컨트랙트 주소, 템플릿 소유주 주소, 가격을 순서대로 인코딩
     * @return success 성공하였다면 true를 반환함
     */
    function updateTemplate(bytes32 key, bytes memory updateCode)
        external
        onlyOwner
        returns (bool success)
    {
        Template memory tmp = _get(key);
        (address templateAddr, address ownerAddr, uint256 price) =
            abi.decode(updateCode, (address, address, uint256));
        tmp.template = (templateAddr != address(0) &&
            templateAddr != tmp.template)
            ? templateAddr
            : tmp.template;
        tmp.owner = (ownerAddr != tmp.owner) ? ownerAddr : tmp.owner;
        tmp.price = price != 0 ? price : tmp.price;

        _set(key, tmp);
        success = true;
        emit UpdatedTemplate(key, tmp.template, tmp.price);
    }

    /**
     * @notice 등록된 템플릿을 삭제하는 함수
     * @param key 삭제될 템플릿의 아이디
     * @return success 성공하였다면 true를 반환함
     */
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
