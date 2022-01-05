import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  // const Allowlist = await deployments.get('Allowlist');
  // const StandardToken = await deployments.get('StandardToken');
  // const MerkleDistributor = await deployments.get('MerkleDistributor');

  // await deploy('FactoriV1', {
  //   from: deployer,
  //   args: [Allowlist.address],
  //   maxFeePerGas: parseEther('0.000000070'),
  //   maxPriorityFeePerGas: parseEther('0.000000002'),
  //   log: true,
  // });

  // const op: TxOptions = {
  //   from: deployer,
  // };

  // await execute('StandardToken', op, 'initialize', '1', 'Template', 'TEMP', 18);
  // await execute('StandardToken', op, 'resignOwnership');
};
export default func;
func.tags = ['FactoriV1'];
func.dependencies = ['Allowlist'];
