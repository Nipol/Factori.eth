# Factori.eth

자주 사용되는 컨트랙트들을 작은 코드 크기로 배포할 수 있으며, 모든 배포된 컨트랙트가 공통된 코드베이스를 사용하기 때문에 전체 블록체인의 크기를 줄이는데 기여합니다.

## Deployed

### Mainnet
* FactoriV1: 0xD9BEc768Ad2aAd84cE5AAdcA49D3334e898B2D8b
    - Owner: 0x54B5E06c82f0d3d91377E5827BFb2381Ef1CC2b7
    - ERC20 Beacon Key: 0x82301aee25330b02ec5683a14b0da625ef01b32e2f1167f777d022933c3be3df
    - ERC20 Minimal Key: 0x93a29c9777094fdf34309d8a898fd8cdb2717ed3b8209e3fcd9ae5cc6d0c6568
    - Merkle Distributer template: 0x9aaDda8587f2F09Bab5199F6306d310f76C2fd6B

### Goerli
* FactoryV1: 0xd91b593eeeada81dc7f6a20e4d8140ef5adf598a
    - ERC20 Template key: 0x254a2c8cf5790bce7b67ebee0b9248872894f42c48f15178f58ed5fd9df1b244
    - ERC20 Beacon key: 0x4a11e43cfddd716c15df4ee2923729a06a73946b6910e2b2afaba3ac715a0ff1

FactoryV1을 통해서 토큰을 배포하기 위해서는 다음과 같은 작업을 필요로 합니다.

```Javascript
const ABI = [
    'function initialize(string memory tokenName, string memory tokenSymbol, uint8 tokenDecimals)',
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
const initdata = interfaces.encodeFunctionData('initialize', [tokenName, tokenSymbol, tokenDecimals]);

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
await Factory['deploy(bytes32,bytes,bytes[])'](
    '0x93a29c9777094fdf34309d8a898fd8cdb2717ed3b8209e3fcd9ae5cc6d0c6568', 
    initdata, 
    [mintCallData,ownerCallData],
    { value: parseEther('0.01') },
]);
// tx가 완료되면 컨트랙트가 배포되며, 토큰을 생성하고 오너십을 넘기게 됩니다.
```
