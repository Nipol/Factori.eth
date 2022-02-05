const hre = require('hardhat');
const ethers = hre.ethers;
const factoryABI = require('../deployments/optimism/FactoryV1.json').abi;

async function main() {
  const ABI = ['function initialize(bytes calldata data)'];
  const interfaces = new ethers.utils.Interface(ABI);

  // 토큰의 이름
  const tokenName = '';
  // 토큰의 심볼
  const tokenSymbol = '';
  // 토큰의 소수점 자리
  const tokenDecimals = ethers.BigNumber.from('18');

  // 토큰 컨트랙트 초기화 데이터
  // 이름, 심볼, 소수점, l1 토큰 주소
  const initdata = interfaces.encodeFunctionData('initialize', [
    ethers.utils.defaultAbiCoder.encode(
      ['string', 'string', 'uint8', 'address'],
      [tokenName, tokenSymbol, tokenDecimals, '0x259AB9b9EAB62b0fD98729B97BE121073D5B3479'],
    ),
  ]);

  const Factory = await ethers.getContractAt(factoryABI, '0x677ef2B01493e235fE2271AFcd01d7e22975Ce5b');

  await Factory['deploy(bool,bytes32,bytes,bytes[])'](
    false,
    '0x2aa4348ea67f2b4fb341743986c38b48067fd815ea436e08a922b298733b5442',
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
