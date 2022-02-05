import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Contract, BigNumber, constants, Signer } from 'ethers';

import distributionTable from './result.json';
import { defaultAbiCoder } from 'ethers/lib/utils';

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
  let StandardERC20: Contract;

  let wallet: Signer;
  let Dummy1: Signer;
  let Dummy2: Signer;
  let Dummy3: Signer;

  beforeEach(async () => {
    const accounts = await ethers.getSigners();
    [wallet, Dummy1, Dummy2, Dummy3] = accounts;

    // 100000개
    const initialToken = BigNumber.from('100000000000000000000000');

    const StandardERC20Template = await ethers.getContractFactory(
      'contracts/tokens/StandardERC20.sol:StandardERC20',
      wallet,
    );
    StandardERC20 = await StandardERC20Template.deploy();

    await StandardERC20.initialize(
      defaultAbiCoder.encode(['string', 'string', 'uint8'], ['template', 'TEMP', BigNumber.from('18')]),
    );
    await StandardERC20.mint(initialToken);
  });

  it('should be same token addr', async () => {
    const MerkleDistributorTemplate = await ethers.getContractFactory(
      'contracts/utils/MerkleDistributor.sol:MerkleDistributor',
      wallet,
    );
    MerkleDistributor = await MerkleDistributorTemplate.deploy();
    await MerkleDistributor.initialize(StandardERC20.address, constants.HashZero);

    expect(await MerkleDistributor.token()).to.equal(StandardERC20.address);
  });

  it('should be same merkle root', async () => {
    const modHash = '0x00000200000000100000000000a0000000000000000001000000000000000001';
    const MerkleDistributorTemplate = await ethers.getContractFactory(
      'contracts/utils/MerkleDistributor.sol:MerkleDistributor',
      wallet,
    );
    MerkleDistributor = await MerkleDistributorTemplate.deploy();
    await MerkleDistributor.initialize(StandardERC20.address, modHash);

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
      await MerkleDistributor.initialize(StandardERC20.address, table.merkleRoot);

      // 배포 컨트랙트로 토큰 전송
      await StandardERC20.transfer(MerkleDistributor.address, '0x64');
      expect(await StandardERC20.balanceOf(MerkleDistributor.address)).to.equal('0x64');

      const addrs = ['0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'];

      addrs.forEach(async addr => {
        const index = table.claims[`${addr}`]?.index;
        const amount = table.claims[`${addr}`]?.amount;
        const proof = table.claims[`${addr}`]?.proof;

        expect(await MerkleDistributor.claim(index, addr, amount, proof))
          .to.emit(MerkleDistributor, 'Claimed')
          .withArgs(index, addr, amount);
      });

      expect(await StandardERC20.balanceOf(MerkleDistributor.address)).to.equal('0');
    });

    it('should be reverted with already claimed', async () => {
      const table: resultType = distributionTable;
      const MerkleDistributorTemplate = await ethers.getContractFactory(
        'contracts/utils/MerkleDistributor.sol:MerkleDistributor',
        wallet,
      );
      MerkleDistributor = await MerkleDistributorTemplate.deploy();
      await MerkleDistributor.initialize(StandardERC20.address, table.merkleRoot);

      // 배포 컨트랙트로 토큰 전송
      await StandardERC20.transfer(MerkleDistributor.address, '0x64');
      expect(await StandardERC20.balanceOf(MerkleDistributor.address)).to.equal('0x64');

      const addrs = ['0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'];

      const index = table.claims[`${addrs[0]}`]?.index;
      const amount = table.claims[`${addrs[0]}`]?.amount;
      const proof = table.claims[`${addrs[0]}`]?.proof;

      expect(await MerkleDistributor.claim(index, addrs[0], amount, proof))
        .to.emit(MerkleDistributor, 'Claimed')
        .withArgs(index, addrs[0], amount);

      expect(await StandardERC20.balanceOf(MerkleDistributor.address)).to.equal('0');

      await expect(MerkleDistributor.claim(index, addrs[0], amount, proof)).revertedWith(
        'MerkleDistributor/Already claimed',
      );
    });

    it('should be reverted abnormaly proof', async () => {
      const table: resultType = distributionTable;
      const MerkleDistributorTemplate = await ethers.getContractFactory(
        'contracts/utils/MerkleDistributor.sol:MerkleDistributor',
        wallet,
      );
      MerkleDistributor = await MerkleDistributorTemplate.deploy();
      await MerkleDistributor.initialize(StandardERC20.address, table.merkleRoot);

      // 배포 컨트랙트로 토큰 전송
      await StandardERC20.transfer(MerkleDistributor.address, '0x64');
      expect(await StandardERC20.balanceOf(MerkleDistributor.address)).to.equal('0x64');

      const addrs = ['0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'];

      const index = table.claims[`${addrs[0]}`]?.index;
      const amount = table.claims[`${addrs[0]}`]?.amount;
      const proof: string[] = [constants.HashZero];

      await expect(MerkleDistributor.claim(index, addrs[0], amount, proof)).revertedWith(
        'MerkleDistributor/Invalid proof',
      );
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
      await MerkleDistributor.initialize(StandardERC20.address, table.merkleRoot);

      // 배포 컨트랙트로 토큰 전송
      await StandardERC20.transfer(MerkleDistributor.address, '903000000000000000000');
      expect(await StandardERC20.balanceOf(MerkleDistributor.address)).to.equal('903000000000000000000');

      expect(await MerkleDistributor.finalize())
        .to.emit(MerkleDistributor, 'Finalized')
        .withArgs(StandardERC20.address, constants.HashZero);

      expect(await StandardERC20.balanceOf(MerkleDistributor.address)).to.equal('0');
    });
  });
});
