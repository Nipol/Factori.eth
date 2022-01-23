# Factori.eth

자주 사용되는 컨트랙트들을 작은 코드 크기로 배포할 수 있으며, 모든 배포된 컨트랙트가 공통된 코드베이스를 사용하기 때문에 전체 블록체인의 크기를 줄이는데 기여합니다.

## Deployed

### Mainnet
* FactoriV1: 
    - StandardERC20 key: 
    - MerkleDistributor key: 
    - VestingEscrow key: 

### Optimism
* FactoriV1: 
    - StandardERC20 key: 
    - L2StandardERC20 key: 
    - MerkleDistributor key: 
    - VestingEscrow key: 

### Goerli
* FactoryV1: 0x131bC833b5857A74466ce61b0A2EE4CFc2436002
    - Price: 0.01 ETH
    - StandardERC20 key: 0x39d750b6e6944bb4361c7379b5f0fa20f77b99adc94192761c67ffd0e3fb04e6
    - MerkleDistributor key: 0x1df4fa81b7029485e75e8567a980cbb02ef58e65fda79384f7df2a0b6f5e9a3a
    - VestingEscrow key: 0x4e2407a6af55c287bda11462e5e0810cdf2cf83c38200c3f0e9cccebe5e96106

### Kovan
* FactoryV1: 0x43ccFa6D2E5cB209a4764Ad1DA46e5B5B32C644D
    - Price: 0.01 ETH
    - StandardERC20 key: 0x9826236a1bc4fc40f2cca879bc5ed99015ca0427eba794e5e6445427acd5055d
    - MerkleDistributor key: 0x5d29e9fad9171dbbd99199b154f79a94c1583ceb907cb2ce6f89b701df69c647
    - VestingEscrow key: 0xc4bfab919fc3beb03ab61980fca95cb2c49aa95c1762e6149adcd3b004266285

### Optimism Testnet
* FactoryV1: 0xd5ac3B857177A0081e2BcF4CAd803e4FE2B5F366
    - Price: 0.001 ETH
    - StandardERC20 key: 0x6108e99ff7450dcaa72e5352300c431df06d6a29f7d4ef425ddd124775b2138c
    - L2StandardERC20 key: 0x7086e604b2f6abf7cd6acd06ac7185589800477c125dccfec0ea104159c12786
    - MerkleDistributor key: 0xe8d3e74813db60888defcb8ab86ac511fce6481052109d6e003ceb2388b6cce8
    - VestingEscrow key: 0xd460dccff7ffce909ad9de70f40f3f2e48e0d4a48374991783a70fbcb5394df3

FactoryV1을 통해서 토큰을 배포하기 위해서는 다음과 같은 작업을 필요로 합니다.

```Javascript
const ABI = [
    'function initialize(bytes calldata data)',
    'function mintTo(address to, uint256 value)',
    'function transferOwnership(address newOwner)',
];
const interfaces = new ethers.utils.Interface(ABI);

// 토큰 컨트랙트의 이름
const tokenName = 'TESTToken';
// 토큰 컨트랙트의 심볼
const tokenSymbol = 'TT';
// 토큰의 소수점 자리
const tokenDecimals = ethers.BigNumber.from('18');
// 소수점 자리를 포함하여 토큰을 처음 배포할 숫자는 다음이 됩니다. 100.000000000000000000
const initialToken = ethers.BigNumber.from('100000000000000000000');

// 토큰을 배포하면서 초기화 할 때 필요한 데이터를 직렬화 합니다.
const initdata = interfaces.encodeFunctionData('initialize', [
    ethers.utils.defaultAbiCoder.encode(['string', 'string', 'uint8'], [tokenName, tokenSymbol, tokenDecimals]),
]);

// 토큰 컨트랙트를 배포할 때 토큰을 수령하도록 합니다.
// 해당 작업으로, 토큰 수량이 결정되고 총 공급량이 업데이트 됩니다.
const mintCallData = interfaces.encodeFunctionData('mintTo', [
    '토큰 수령인의 이더리움 주소',
    initialToken,
]);

// 배포된 토큰 컨트랙트의 소유권 이전(이 작업이 없다면, 토큰 컨트랙트의 소유권은 factory가 가지고 있습니다)
// 토큰 컨트랙트의 소유권이 있다면 추후에 토큰을 생성하거나 소각할 수 있습니다.
const ownerCallData = interfaces.encodeFunctionData('transferOwnership', [
    '토큰 컨트랙트의 소유권을 가질 이더리움 주소',
]);

const Factory = await ethers.getContractAt(FACTORY_ABI, FACTORY_ADDRESS);

// factory에서 토큰 컨트랙트의 템플릿 키를 넣고, 초기화 데이터, 그리고 각각 필요한 호출을 배열형태로 넣어줍니다.
await Factory['deploy(bool,bytes32,bytes,bytes[])'](
    false,
    TOKEN_KEY,
    initdata,
    [mintCallData, ownerCallData],
    { value: ethers.utils.parseEther('0.01') },
);
// tx가 완료되면 토큰 컨트랙트가 배포되어 토큰을 발행하고 Factory가 가지고 있던 오너십을 넘기게 됩니다.
```
