const hre = require('hardhat');
const ethers = hre.ethers;
const factoryABI = require('../deployments/kovan/FactoryV1.json').abi;

async function main() {
  const ABI = [
    'function initialize(bytes calldata data)',
    'function mintTo(address to, uint256 value)',
    'function transferOwnership(address newOwner)',
  ];
  const interfaces = new ethers.utils.Interface(ABI);

  // 토큰 컨트랙트의 이름
  const tokenName = 'EToken';
  // 토큰 컨트랙트의 심볼
  const tokenSymbol = 'ET';
  // 토큰의 소수점 자리
  const tokenDecimals = ethers.BigNumber.from('18');
  // 소수점 자리를 포함하여 토큰을 처음 배포할 숫자는 다음이 됩니다. 100000.000000000000000000
  const initialToken = ethers.BigNumber.from('100000000000000000000000');

  const initdata = interfaces.encodeFunctionData('initialize', [
    ethers.utils.defaultAbiCoder.encode(['string', 'string', 'uint8'], [tokenName, tokenSymbol, tokenDecimals]),
  ]);
  const mintCallData = interfaces.encodeFunctionData('mintTo', [
    '0x2e6bE9855A3bF02C73Ba74B7d756a63DB7762238',
    initialToken,
  ]);
  const ownerCallData = interfaces.encodeFunctionData('transferOwnership', [
    '0x2e6bE9855A3bF02C73Ba74B7d756a63DB7762238',
  ]);

  const Factory = await ethers.getContractAt(factoryABI, '0x43ccFa6D2E5cB209a4764Ad1DA46e5B5B32C644D');

  await Factory['deploy(bool,bytes32,bytes,bytes[])'](
    false,
    '0x9826236a1bc4fc40f2cca879bc5ed99015ca0427eba794e5e6445427acd5055d',
    initdata,
    [mintCallData, ownerCallData],
    { value: ethers.utils.parseEther('0.01') },
  );
}
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
