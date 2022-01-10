import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Contract, BigNumber, constants, Signer } from 'ethers';

import distributionTable from './result.json';

interface resultType {
  merkleRoot: string;
  tokenTotal: string;
  claims: {
    [key: string]: {
      index: number;
      amount: string;
      proof: string[];
    };
  };
}

describe('MerkleDistributor', () => {
  let MerkleDistributor: Contract;
  let StandardToken: Contract;

  let wallet: Signer;
  let Dummy1: Signer;
  let Dummy2: Signer;
  let Dummy3: Signer;

  beforeEach(async () => {
    const accounts = await ethers.getSigners();
    [wallet, Dummy1, Dummy2, Dummy3] = accounts;

    const tokenName = 'template';
    const tokenSymbol = 'TEMP';
    const tokenDecimals = BigNumber.from('18');
    // 100000개
    const initialToken = BigNumber.from('100000000000000000000000');

    const StandardTokenTemplate = await ethers.getContractFactory(
      'contracts/tokens/StandardToken.sol:StandardToken',
      wallet,
    );
    StandardToken = await StandardTokenTemplate.deploy();

    await StandardToken.deployed();
    await StandardToken.initialize(tokenName, tokenSymbol, tokenDecimals);
    await StandardToken.mint(initialToken);
  });

  it('should be same token addr', async () => {
    const MerkleDistributorTemplate = await ethers.getContractFactory(
      'contracts/utils/MerkleDistributor.sol:MerkleDistributor',
      wallet,
    );
    MerkleDistributor = await MerkleDistributorTemplate.deploy();
    await MerkleDistributor.initialize(StandardToken.address, constants.HashZero);

    expect(await MerkleDistributor.token()).to.equal(StandardToken.address);
  });

  it('should be same merkle root', async () => {
    const modHash = '0x00000200000000100000000000a0000000000000000001000000000000000001';
    const MerkleDistributorTemplate = await ethers.getContractFactory(
      'contracts/utils/MerkleDistributor.sol:MerkleDistributor',
      wallet,
    );
    MerkleDistributor = await MerkleDistributorTemplate.deploy();
    await MerkleDistributor.initialize(StandardToken.address, modHash);

    expect(await MerkleDistributor.root()).to.equal(modHash);
  });

  describe('#claim()', () => {
    it('should be success claim token', async () => {
      const table: resultType = distributionTable;
      const MerkleDistributorTemplate = await ethers.getContractFactory(
        'contracts/utils/MerkleDistributor.sol:MerkleDistributor',
        wallet,
      );
      MerkleDistributor = await MerkleDistributorTemplate.deploy();
      await MerkleDistributor.initialize(StandardToken.address, table.merkleRoot);

      // 배포 컨트랙트로 토큰 전송
      await StandardToken.transfer(MerkleDistributor.address, '0x64');
      expect(await StandardToken.balanceOf(MerkleDistributor.address)).to.equal('0x64');

      const addrs = ['0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'];

      addrs.forEach(async addr => {
        const index = table.claims[`${addr}`]?.index;
        const amount = table.claims[`${addr}`]?.amount;
        const proof = table.claims[`${addr}`]?.proof;

        expect(await MerkleDistributor.claim(index, addr, amount, proof))
          .to.emit(MerkleDistributor, 'Claimed')
          .withArgs(index, addr, amount);
      });

      expect(await StandardToken.balanceOf(MerkleDistributor.address)).to.equal('0');
    });
  });

  describe('#finalize()', () => {
    it('should be success finalize distribution', async () => {
      const table: resultType = distributionTable;
      const MerkleDistributorTemplate = await ethers.getContractFactory(
        'contracts/utils/MerkleDistributor.sol:MerkleDistributor',
        wallet,
      );
      MerkleDistributor = await MerkleDistributorTemplate.deploy();
      await MerkleDistributor.initialize(StandardToken.address, table.merkleRoot);

      // 배포 컨트랙트로 토큰 전송
      await StandardToken.transfer(MerkleDistributor.address, '903000000000000000000');
      expect(await StandardToken.balanceOf(MerkleDistributor.address)).to.equal('903000000000000000000');

      expect(await MerkleDistributor.finalize())
        .to.emit(MerkleDistributor, 'Finalized')
        .withArgs(StandardToken.address, constants.HashZero);

      expect(await StandardToken.balanceOf(MerkleDistributor.address)).to.equal('0');
    });
  });
});
