import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Contract, BigNumber, constants, Signer } from 'ethers';
import { Interface } from 'ethers/lib/utils';

describe('Multicall', () => {
  let StandardToken: Contract;

  const contractVersion = '1';
  const tokenName = 'template';
  const tokenSymbol = 'TEMP';
  const tokenDecimals = BigNumber.from('18');
  const initialToken = BigNumber.from('100000000000000000000');

  let wallet: Signer;
  let walletTo: Signer;
  let Dummy: Signer;

  beforeEach(async () => {
    const accounts = await ethers.getSigners();
    [wallet, walletTo, Dummy] = accounts;

    const StandardTokenTemplate = await ethers.getContractFactory('contracts/StandardToken.sol:StandardToken', wallet);
    StandardToken = await StandardTokenTemplate.deploy();

    await StandardToken.deployed();
    await StandardToken.initialize(contractVersion, tokenName, tokenSymbol, tokenDecimals);
    await StandardToken.mint(initialToken);
  });

  describe('#multicall()', () => {
    it('should be success with multiple approve call', async () => {
      const ABI = ['function approve(address spender, uint256 value)'];
      const interfaces = new Interface(ABI);

      const value = BigNumber.from('5000000000000000000');
      const walletAddress = await wallet.getAddress();
      const walletToAddress = await walletTo.getAddress();
      const ZeroAddress = constants.AddressZero;
      const callData1 = interfaces.encodeFunctionData('approve', [walletToAddress, value]);
      const callData2 = interfaces.encodeFunctionData('approve', [ZeroAddress, value]);

      await StandardToken.multicall([callData1, callData2]);

      expect(await StandardToken.allowance(walletAddress, walletToAddress)).to.be.equal(value);
      expect(await StandardToken.allowance(walletAddress, ZeroAddress)).to.be.equal(value);
    });

    it('should be reverted with non-existing function call', async () => {
      const ABI = ['function nonExistASDF()'];
      const interfaces = new Interface(ABI);
      const callData = interfaces.encodeFunctionData('nonExistASDF', []);
      await expect(StandardToken.multicall([callData])).to.be.revertedWith('');
    });
  });
});
