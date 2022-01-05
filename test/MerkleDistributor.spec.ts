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
      await StandardToken.transfer(MerkleDistributor.address, '903000000000000000000');
      expect(await StandardToken.balanceOf(MerkleDistributor.address)).to.equal('903000000000000000000');

      const addrs = [
        '0x26A22514d3Ac0B05E2F4f04dF96EF302ba434cBE',
        '0x094a9009Fe93A85658E4b49604fD8177620F8Cd8',
        '0x66DCe44a16d17b9186F2Cc7E83249152936fCe08',
        '0x5e8B33Ebd72C7D9f32020174f5e827D796a36b44',
        '0xA93b0B577e70279dBBEf0533558a480feC627641',
        '0xB2c3FE38138D4A6391115a8BD187cDDB5Fe80edE',
        '0xBbbbEd03131f83D2ABA099CDd3631280E51f6978',
        '0xcD762369412E9B7A4aB181f5186927B4Fe795c4E',
        '0x6cbb8ba9e93a295F6fa0f8eCa0000EA9Db083059',
        '0x3acC3eCB08a9ce1b26932DC87227Ca377295Db69',
        '0x9F8e83E434092Fd7DF3Fe2fc52D42F0252e60311',
        '0xA1079668Bea61e26a9E4a1c3758CCCaAF0ADe5f2',
        '0x98d2D8b4769422728274F85cDe5bbcded70cc2d1',
        '0xEEA45C31B0131C41b7c8DC5A4A93FeAe475a80cA',
        '0xf56E68E5cc8a1139C61Ef9391606C2d2486333B7',
        '0x0ccE65d85E818021dB26d24a7bEcc1032b217564',
        '0xb34D9AA0234B3626C5d615cFd88d1Ee335bE01a8',
        '0x872E15B80cf0fF781152bfb5F5630ff0b6A61229',
        '0xfF0Cb0351a356ad16987E5809a8dAAaF34F5ADBe',
        '0xC994F5c186500082D5E4a3Ead684F1CfA50EB894',
        '0xE3665b69b8fE475C334db2D51EFD50B5358D6659',
        '0xDC8Ed3979cEc263156Bb38fcbE8C7Ee64F412957',
        '0x5fe9CFa5cFECDC333eb102d219B4e77EAcdE9828',
        '0x7ae3D073592aCCB6d885378d83De2F0DeD4394E2',
        '0xE0c6F85e0D469Fa75703B3570f718260eeB7Ef2B',
      ];

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
