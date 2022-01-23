import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction, TxOptions } from 'hardhat-deploy/types';
import { parseEther } from 'ethers/lib/utils';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, execute } = deployments;
  const { deployer } = await getNamedAccounts();

  const StandardERC20 = await deployments.get('StandardERC20');
  const L2StandardERC20 = await deployments.get('L2StandardERC20');
  const MerkleDistributor = await deployments.get('MerkleDistributor');
  const VestingEscrow = await deployments.get('VestingEscrow');

  await deploy('FactoriV1', {
    from: deployer,
    args: [parseEther('0.001'), deployer],
    maxFeePerGas: parseEther('0.000000070'),
    maxPriorityFeePerGas: parseEther('0.000000002'),
    log: true,
  });

  const op: TxOptions = {
    maxFeePerGas: parseEther('0.000000070'),
    maxPriorityFeePerGas: parseEther('0.000000002'),
    from: deployer,
    gasLimit: '265492',
    log: true,
  };

  await execute('FactoriV1', op, 'addTemplate', StandardERC20.address);
  await execute('FactoriV1', op, 'addTemplate', L2StandardERC20.address);
  await execute('FactoriV1', op, 'addTemplate', MerkleDistributor.address);
  await execute('FactoriV1', op, 'addTemplate', VestingEscrow.address);
};
export default func;
func.tags = ['FactoriV1'];
func.dependencies = ['StandardERC20', 'L2StandardERC20', 'MerkleDistributor', 'VestingEscrow'];
