/**
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */
pragma solidity ^0.8.0;

import "@beandao/contracts/interfaces/IERC165.sol";
import "@beandao/contracts/interfaces/IERC173.sol";
import "@beandao/contracts/interfaces/IMulticall.sol";
import "@beandao/contracts/interfaces/IAllowlist.sol";
import "@beandao/contracts/library/Ownership.sol";
import "@beandao/contracts/library/BeaconProxyDeployer.sol";
import "@beandao/contracts/library/MinimalProxyDeployer.sol";
import "@beandao/contracts/library/Beacon.sol";
import "./IFactory.sol";
import "hardhat/console.sol";

/**
 * @title Factory V1
 * @author yoonsung.eth
 * @notice minimal proxy로 배포될 컨트랙트를 template로 추상화 하며 같은 컨트랙트를 쉽게 배포할 수 있도록 함.
 * @dev template에는 단 한번만 호출 가능한 initialize 함수가 필요하며, 이는 필수적으로 호출되어야 함.
 * ERC173이 구현되어 컨트랙트의 소유권을 옮길 수 있도록 하여야 함.
 */
contract FactoryV1 is Ownership, IFactory {
    /**
     * @notice key에 따른 template 반환.
     */
    mapping(bytes32 => Template) public templates;
    /**
     * @notice 등록된 모든 템플릿에 대한 nonce
     */
    mapping(address => uint256) private nonceForTemplate;
    /**
     * @notice 템플릿에 연결된 비콘 주소
     */
    mapping(address => address) private beaconForTemplate;
    /**
     * @notice template가 등록된 숫자.
     */
    uint256 public nonce = 1;

    /**
     * @notice Contract를 무료로 배포할 수 있는 허용된 주소
     */
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
        nonceForTemplate[address(0)] = type(uint256).max;
    }

    /**
     * @notice template id를 통해서 해당 컨트랙트를 배포하는 함수, 여기에는 initialize 함수를 한 번 호출할 수 있도록 call data가 필요함.
     * @dev deploy에서 기본적으로 오너십을 체크하지는 않기 때문에, 오너십 관리가 필요한 경우 multicall을 통해서 필수적으로 호출해 주어야 함.
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
        Template memory tmp = templates[templateId];
        // 템플릿을 배포하기 위한 수수료가 적정 수준인지, 템플릿 오너가 호출한 것인지 또는 호출자가 허용된 목록에 있는지 확인.
        require(
            tmp.price == msg.value || tmp.owner == msg.sender || allowlist.allowance(msg.sender),
            "Factory/Incorrect-amounts"
        );
        // 해당 함수를 호출할 때 수수료가 담긴 경우에 수수료를 컨트랙트 소유자에게 전송하고 기존 수수료에서 일정 비율 만큼 수수료를 상승 시킴
        if (msg.value > 0) {
            tmp.price += ((tmp.price / 10000) * FEE_RATE);
            templates[templateId] = tmp;
            payable(this.owner()).transfer(msg.value);
        }
        deployed = tmp.isBeacon
            ? BeaconProxyDeployer.deploy(tmp.template, initializationCallData)
            : MinimalProxyDeployer.deploy(tmp.template, initializationCallData);
        // 부수적으로 호출할 데이터가 있다면, 배포된 컨트랙트에 추가적인 call을 할 수 있음.
        if (calls.length > 0) IMulticall(deployed).multicall(calls);
        // 이벤트 호출
        emit Deployed(deployed, msg.sender);
    }

    /**
     * @notice template id와 초기화 데이터 통해서 컨트랙트를 배포할 주소를 미리 파악하는 함수
     * @dev 연결된 지갑 주소에 따라 생성될 지갑 주소가 변경되므로, 연결되어 있는 주소를 필수로 확인하여야 합니다.
     * @param templateId bytes32 형태의 template id가 필요
     * @param initializationCallData 템플릿에 적합한 initialize 함수를 호출하는 함수 데이터
     */
    function calculateDeployableAddress(bytes32 templateId, bytes memory initializationCallData)
        external
        view
        override
        returns (address deployable)
    {
        Template memory tmp = templates[templateId];
        deployable = tmp.isBeacon
            ? BeaconProxyDeployer.calculateAddress(tmp.template, initializationCallData)
            : MinimalProxyDeployer.calculateAddress(tmp.template, initializationCallData);
    }

    /**
     * @notice template id에 따라서 컨트랙트를 배포하기 위한 필요 가격을 가져오는 함
     * @dev 연결된 지갑 주소에 따라 생성될 지갑 주소가 변경되므로, 연결되어 있는 주소를 필수로 확인하여야 합니다.
     * @param templateId 값을 가져올 템플릿의 아이디
     * @return price 이더리움으로 구성된 값을 가짐.
     */
    function getPrice(bytes32 templateId) external view override returns (uint256 price) {
        price = templates[templateId].price;
    }

    /**
     * @notice 템플릿으로 사용되기 적합한 인터페이스가 구현된 컨트랙트를 템플릿으로 가격과 함께 등록함.
     * @dev 같은 템플릿이 비콘과, 일반적인 템플릿으로 등록될 수 있습니다. 따라서 선택적으로 사용 가능합니다.
     * @param templateAddr 템플릿으로 사용될 컨트랙트의 주소
     * @param ownerAddr 해당 템플릿의 소유주를 지정함. 해당 소유주는 수수료를 지불하지 않음.
     * @param price 템플릿으로 컨트랙트를 배포할 때 소모될 이더리움의 수량
     */
    function addTemplate(
        address templateAddr,
        address ownerAddr,
        uint256 price
    ) external override onlyOwner {
        require(nonceForTemplate[templateAddr] == 0, "Factory/Non-Valid");
        bytes32 key = keccak256(abi.encode(templateAddr, nonce));
        templates[key] = Template({isBeacon: false, template: templateAddr, owner: ownerAddr, price: price});
        nonceForTemplate[templateAddr] = nonce++;
        emit NewTemplate(key, templateAddr, price);
    }

    /**
     * @notice 템플릿으로 사용되기 적합한 인터페이스를 비콘으로 배포할 수 있도록 합니다.
     * @param templateAddr 템플릿으로 사용될 컨트랙트의 주소
     * @param ownerAddr 해당 템플릿의 소유주를 지정함. 해당 소유주는 수수료를 지불하지 않음.
     * @param price 템플릿으로 컨트랙트를 배포할 때 소모될 이더리움의 수량
     */
    function addBeacon(
        address templateAddr,
        address ownerAddr,
        uint256 price
    ) external override onlyOwner returns (address beaconAddr) {
        require(beaconForTemplate[templateAddr] == address(0), "Factory/Non-Valid");
        beaconAddr = address(new Beacon(templateAddr));
        bytes32 key = keccak256(abi.encode(beaconAddr, nonce));
        templates[key] = Template({isBeacon: true, template: beaconAddr, owner: ownerAddr, price: price});
        beaconForTemplate[templateAddr] = beaconAddr;
        emit NewTemplate(key, beaconAddr, price);
    }

    /**
     * @notice 등록된 템플릿의 정보를 변경하는 함수, 비콘인 경우에는 템플릿을 업데이트 할 수 있으나 비콘이 아니라면 업데이트 불가능.
     * @param key 업데이트 될 템플릿의 아이디
     * @param updateCode 비콘일 경우 템플릿 주소, 템플릿 소유주 주소, 가격을 순서대로 인코딩
     */
    function updateTemplate(bytes32 key, bytes memory updateCode) external override onlyOwner {
        Template memory tmp = templates[key];
        (address templateAddr, address ownerAddr, uint256 price) = abi.decode(updateCode, (address, address, uint256));
        require(tmp.isBeacon ? templateAddr != address(0) : templateAddr == address(0), "Factory/Non-Valid");
        tmp.isBeacon ? tmp.template.call(abi.encode(templateAddr)) : (false, new bytes(0));
        tmp.owner = (ownerAddr != tmp.owner) ? ownerAddr : tmp.owner;
        tmp.price = price != 0 ? price : tmp.price;
        templates[key] = tmp;
        emit UpdatedTemplate(key, tmp.template, tmp.owner, tmp.price);
    }

    /**
     * @notice 등록된 템플릿을 삭제하는 함수
     * @param key 삭제될 템플릿의 아이디
     */
    function removeTemplate(bytes32 key) external override onlyOwner {
        Template memory tmp = templates[key];
        require(tmp.template != address(0), "Factory/Non-Exist");
        delete templates[key];
        emit DeletedTemplate(key);
    }
}
