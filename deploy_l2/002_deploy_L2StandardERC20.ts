import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction, TxOptions } from 'hardhat-deploy/types';
import { defaultAbiCoder, parseEther } from 'ethers/lib/utils';
import { BigNumber, constants } from 'ethers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, execute } = deployments;

  const tokenName = 'template';
  const tokenSymbol = 'TEMP';
  const tokenDecimals = BigNumber.from('18');

  const { deployer } = await getNamedAccounts();

  await deploy('L2StandardERC20', {
    from: deployer,
    maxFeePerGas: parseEther('0.000000070'),
    maxPriorityFeePerGas: parseEther('0.000000002'),
    log: true,
  });

  await execute(
    'L2StandardERC20',
    {
      from: deployer,
      maxFeePerGas: parseEther('0.000000070'),
      maxPriorityFeePerGas: parseEther('0.000000002'),
      gasLimit: '165492',
    },
    'initialize',
    defaultAbiCoder.encode(
      ['string', 'string', 'uint8', 'address'],
      [tokenName, tokenSymbol, tokenDecimals, constants.AddressZero],
    ),
  );
};
export default func;
func.tags = ['L2StandardERC20'];
