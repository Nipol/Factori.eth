import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const artifact = await deployments.getArtifact('Allowlist');

  const { deployer } = await getNamedAccounts();

  await deploy('Allowlist', {
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
    },
    from: deployer,
    log: true,
  });

  // const op: TxOptions = {
  //   from: deployer,
  // };

  // await execute('StandardToken', op, 'initialize', '1', 'Template', 'TEMP', 18);
  // await execute('StandardToken', op, 'resignOwnership');
};
export default func;
func.tags = ['Allowlist'];
