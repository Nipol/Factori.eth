import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction, TxOptions } from 'hardhat-deploy/types';
import { parseEther } from 'ethers/lib/utils';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, execute } = deployments;

  const { deployer } = await getNamedAccounts();

  await deploy('StandardToken', {
    from: deployer,
    log: true,
  });

  // await execute(
  //   'StandardToken',
  //   {
  //     from: deployer,
  //     gasLimit: '165492',
  //   },
  //   'initialize',
  //   '1',
  //   'Template',
  //   'TEMP',
  //   18,
  // );
  // await execute(
  //   'StandardToken',
  //   {
  //     from: deployer,
  //     gasLimit: '27924',
  //   },
  //   'resignOwnership',
  // );
};
export default func;
func.tags = ['StandardToken'];
