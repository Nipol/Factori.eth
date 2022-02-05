import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { constants } from 'ethers';
import { parseEther } from 'ethers/lib/utils';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, execute } = deployments;

  const { deployer } = await getNamedAccounts();

  await deploy('VestingEscrow', {
    from: deployer,
    maxFeePerGas: parseEther('0.000000060'),
    maxPriorityFeePerGas: parseEther('0.000000002'),
    log: true,
  });

  await execute(
    'VestingEscrow',
    {
      from: deployer,
      maxFeePerGas: parseEther('0.000000060'),
      maxPriorityFeePerGas: parseEther('0.000000002'),
      gasLimit: '51285',
    },
    'initialize',
    constants.AddressZero,
    [],
  );

  await execute(
    'VestingEscrow',
    {
      from: deployer,
      maxFeePerGas: parseEther('0.000000060'),
      maxPriorityFeePerGas: parseEther('0.000000002'),
      gasLimit: '50000',
    },
    'resignOwnership',
  );
};
export default func;
func.tags = ['VestingEscrow'];
