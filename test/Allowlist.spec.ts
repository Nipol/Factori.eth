import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Contract, BigNumber, constants, Signer } from 'ethers';

describe('Allowlist', () => {
  let Allowlist: Contract;

  let wallet: Signer;
  let Dummy: Signer;

  beforeEach(async () => {
    const accounts = await ethers.getSigners();
    [wallet, Dummy] = accounts;

    const AllowlistDeployer = await ethers.getContractFactory('contracts/Allowlist.sol:Allowlist', wallet);
    Allowlist = await AllowlistDeployer.deploy();

    await Allowlist.deployed();
  });

  describe('#authorise()', () => {
    it('should be Authorised Address', async () => {
      const DummyAddress = await Dummy.getAddress();
      await expect(Allowlist.authorise(DummyAddress))
        .to.emit(Allowlist, 'Allowed')
        .withArgs(DummyAddress);
      expect(await Allowlist.allowance(DummyAddress)).to.be.equal(true);
    });
  });

  describe('#revoke()', () => {
    it('should be Revoked To Address', async () => {
      const DummyAddress = await Dummy.getAddress();
      await Allowlist.authorise(DummyAddress);
      expect(await Allowlist.allowance(DummyAddress)).to.be.equal(true);

      await expect(Allowlist.revoke(DummyAddress))
        .to.emit(Allowlist, 'Revoked')
        .withArgs(DummyAddress);
      expect(await Allowlist.allowance(DummyAddress)).to.be.equal(false);
    });
  });
});
