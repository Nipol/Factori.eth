import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction, TxOptions } from 'hardhat-deploy/types';
import { defaultAbiCoder, parseEther } from 'ethers/lib/utils';
import { BigNumber } from 'ethers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, execute } = deployments;

  const tokenName = 'template';
  const tokenSymbol = 'TEMP';
  const tokenDecimals = BigNumber.from('18');

  const { deployer } = await getNamedAccounts();

  await deploy('StandardERC20', {
    from: deployer,
    maxFeePerGas: parseEther('0.000000070'),
    maxPriorityFeePerGas: parseEther('0.000000002'),
    log: true,
  });

  await execute(
    'StandardERC20',
    {
      from: deployer,
      maxFeePerGas: parseEther('0.000000070'),
      maxPriorityFeePerGas: parseEther('0.000000002'),
      gasLimit: '265492',
    },
    'initialize',
    defaultAbiCoder.encode(['string', 'string', 'uint8'], [tokenName, tokenSymbol, tokenDecimals]),
  );
  await execute(
    'StandardERC20',
    {
      from: deployer,
      maxFeePerGas: parseEther('0.000000070'),
      maxPriorityFeePerGas: parseEther('0.000000002'),
      gasLimit: '50000',
    },
    'resignOwnership',
  );
};
export default func;
func.tags = ['StandardERC20'];
