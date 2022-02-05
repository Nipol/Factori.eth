const hre = require('hardhat');
const ethers = hre.ethers;
const factoryABI = require('../deployments/mainnet/FactoryV1.json').abi;

async function main() {
  const ABI = [
    'function initialize(bytes calldata data)',
    'function mintTo(address to, uint256 value)',
    'function transferOwnership(address newOwner)',
  ];
  const interfaces = new ethers.utils.Interface(ABI);

  // 토큰의 이름
  const tokenName = '';
  // 토큰의 심볼
  const tokenSymbol = '';
  // 토큰의 소수점 자리
  const tokenDecimals = ethers.BigNumber.from('18');
  // 소수점 자리를 포함하여 토큰을 처음 배포할 숫자는 다음이 됩니다. 100000.000000000000000000
  const initialToken = ethers.BigNumber.from('100000000000000000000000');

  // 토큰 컨트랙트 초기화 데이터
  // 이름, 심볼, 소수점
  const initdata = interfaces.encodeFunctionData('initialize', [
    ethers.utils.defaultAbiCoder.encode(['string', 'string', 'uint8'], [tokenName, tokenSymbol, tokenDecimals]),
  ]);
  // 토큰 생성 데이터
  // 토큰 수령 주소, 토큰 수량
  const mintCallData = interfaces.encodeFunctionData('mintTo', [
    '0x54B5E06c82f0d3d91377E5827BFb2381Ef1CC2b7',
    initialToken,
  ]);
  // 토큰 소유권 데이터
  // 토큰 소유권 수령 주소
  const ownerCallData = interfaces.encodeFunctionData('transferOwnership', [
    '0x54B5E06c82f0d3d91377E5827BFb2381Ef1CC2b7',
  ]);

  const Factory = await ethers.getContractAt(factoryABI, '0x7906743465F43fe72Ced0986D62037920929dDC7');

  await Factory['deploy(bool,bytes32,bytes,bytes[])'](
    false,
    '0xd84f5b1df9c4fd84edcba18d9eec1e0598f898a9d84025ffcd437e0b828fbbe5',
    initdata,
    [mintCallData, ownerCallData],
    {
      value: ethers.utils.parseEther('0.01'),
      maxFeePerGas: ethers.utils.parseEther('0.000000060'),
      maxPriorityFeePerGas: ethers.utils.parseEther('0.000000002'),
    },
  );
}
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
