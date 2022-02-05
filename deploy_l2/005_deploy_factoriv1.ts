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

  await deploy('FactoryV1', {
    from: deployer,
    args: [parseEther('0.001'), deployer],
    log: true,
  });

  const op: TxOptions = {
    from: deployer,
    gasLimit: '265492',
    log: true,
  };

  await execute('FactoryV1', op, 'addTemplate', StandardERC20.address);
  await execute('FactoryV1', op, 'addTemplate', L2StandardERC20.address);
  await execute('FactoryV1', op, 'addTemplate', MerkleDistributor.address);
  await execute('FactoryV1', op, 'addTemplate', VestingEscrow.address);
};
export default func;
func.tags = ['FactoryV1'];
func.dependencies = ['StandardERC20', 'L2StandardERC20', 'MerkleDistributor', 'VestingEscrow'];
