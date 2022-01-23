const hre = require('hardhat');
const ethers = hre.ethers;
const factoryABI = require('../deployments/optimism-kovan/FactoryV1.json').abi;

async function main() {
  const ABI = ['function initialize(bytes calldata data)'];
  const interfaces = new ethers.utils.Interface(ABI);

  const tokenName = 'EToken';
  const tokenSymbol = 'ET';
  const tokenDecimals = ethers.BigNumber.from('18');
  const initdata = interfaces.encodeFunctionData('initialize', [
    ethers.utils.defaultAbiCoder.encode(
      ['string', 'string', 'uint8', 'address'],
      [tokenName, tokenSymbol, tokenDecimals, '0xd7ff83c09e317188cb9f1053ba3fca3df23aeae7'],
    ),
  ]);

  const Factory = await ethers.getContractAt(factoryABI, '0xd5ac3B857177A0081e2BcF4CAd803e4FE2B5F366');
  await Factory['deploy(bool,bytes32,bytes,bytes[])'](
    false,
    '0x7086e604b2f6abf7cd6acd06ac7185589800477c125dccfec0ea104159c12786',
    initdata,
    [],
    { value: ethers.utils.parseEther('0.001') },
  );
}
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
