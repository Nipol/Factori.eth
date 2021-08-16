# Factori.eth

많은 컨트랙트들을 작은 코드 크기로 배포할 수 있으며, 모든 배포된 컨트랙트가 공통된 코드베이스를 사용하기 때문에 전체 블록체인의 크기를 줄여줍니다.

## Deployed

### Goerli
* StandardToken: 0x6403f288483cA9DA7409515967577042070628FE
    * Template key: 0x254a2c8cf5790bce7b67ebee0b9248872894f42c48f15178f58ed5fd9df1b244
    * Beacon key: 0x4a11e43cfddd716c15df4ee2923729a06a73946b6910e2b2afaba3ac715a0ff1
* Allowlist: 0xdFa76fDF338B1d7518A83392ec3989Ed26DE3b1C
* FactoryV1: 0xd91b593eeeada81dc7f6a20e4d8140ef5adf598a

FactoryV1을 통해서 토큰을 배포하기 위해서는 다음과 같은 작업을 필요로 합니다.

```Javascript
const ABI = [
    'function initialize(string memory contractVersion, string memory tokenName, string memory tokenSymbol, uint8 tokenDecimals)',
    'function mintTo(address to, uint256 value)',
    'function transferOwnership(address newOwner)',
];
const interfaces = new ethers.utils.Interface(ABI);

// 토큰 컨트랙트의 버전
const contractVersion = '1';
// 토큰 컨트랙트의 이름
const tokenName = 'TESTToken';
// 토큰 컨트랙트의 심볼
const tokenSymbol = 'TT';
// 토큰의 소수점 자리
const tokenDecimals = ethers.BigNumber.from('18');
// 소수점 자리를 포함하여 토큰을 처음 배포할 숫자는 다음이 됩니다. 100.000000000000000000
const initialToken = ethers.BigNumber.from('100000000000000000000');

// 토큰을 배포하면서 초기화 할 때 필요한 데이터를 직렬화 합니다.
const initdata = interfaces.encodeFunctionData('initialize', [contractVersion, tokenName, tokenSymbol, tokenDecimals]);

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

//...

// factory에서 토큰 컨트랙트의 템플릿 키를 넣고, 초기화 데이터, 그리고 각각 필요한 호출을 배열형태로 넣어줍니다.
await Factory.deploy('0x7a215e0493b6f77cc3450eb1693d035a56f9cefea78454efef7eddf34488c323', initdata, [
    mintCallData,
    ownerCallData,
]);
// tx가 완료되면 컨트랙트가 배포되며, 토큰을 생성하고 오너십을 넘기게 됩니다.
```
