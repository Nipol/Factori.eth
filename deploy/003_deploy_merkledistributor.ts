import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { constants } from 'ethers';
import { parseEther } from 'ethers/lib/utils';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy, execute } = deployments;
  const artifact = await deployments.getArtifact('Allowlist');

  const { deployer } = await getNamedAccounts();

  await deploy('MerkleDistributor', {
    from: deployer,
    maxFeePerGas: parseEther('0.000000070'),
    maxPriorityFeePerGas: parseEther('0.000000002'),
    gasLimit: '1200000',
    log: true,
  });

  await execute(
    'MerkleDistributor',
    {
      from: deployer,
      maxFeePerGas: parseEther('0.000000070'),
      maxPriorityFeePerGas: parseEther('0.000000002'),
    },
    'initialize',
    constants.AddressZero,
    constants.HashZero,
  );

  await execute(
    'MerkleDistributor',
    {
      from: deployer,
      maxFeePerGas: parseEther('0.000000070'),
      maxPriorityFeePerGas: parseEther('0.000000002'),
    },
    'resignOwnership',
  );

  // const op: TxOptions = {
  //   from: deployer,
  // };

  // await execute('StandardToken', op, 'resignOwnership');
};
export default func;
func.tags = ['Allowlist'];
