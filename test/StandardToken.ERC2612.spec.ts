import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Contract, BigNumber, constants, Signer } from 'ethers';
import { splitSignature, arrayify, joinSignature, SigningKey } from 'ethers/lib/utils';

import { getApprovalDigest } from './util';

describe('StandardToken/ERC2612', () => {
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

  describe('#permit()', () => {
    it('should be success', async () => {
      const walletAddress = await wallet.getAddress();
      const walletToAddress = await walletTo.getAddress();

      const value = constants.MaxUint256;
      const chainId = await wallet.getChainId();
      const deadline = constants.MaxUint256;
      const nonce = await StandardToken.nonces(walletAddress);

      const digest = await getApprovalDigest(
        chainId,
        StandardToken,
        { owner: walletAddress, spender: walletToAddress, value },
        nonce,
        deadline,
      );

      const hash = arrayify(digest);

      const sig = joinSignature(
        new SigningKey('0x7c299dda7c704f9d474b6ca5d7fee0b490c8decca493b5764541fe5ec6b65114').signDigest(hash),
      );
      const { v, r, s } = splitSignature(sig);

      StandardToken = StandardToken.connect(walletTo);

      await expect(StandardToken.permit(walletAddress, walletToAddress, value, deadline, v, r, s))
        .to.emit(StandardToken, 'Approval')
        .withArgs(walletAddress, walletToAddress, value);
      expect(await StandardToken.allowance(walletAddress, walletToAddress)).to.be.equal(value);
    });

    it('should be reverted when expired deadline', async () => {
      const walletAddress = await wallet.getAddress();
      const walletToAddress = await walletTo.getAddress();
      const value = constants.MaxUint256;
      const chainId = 1;
      const deadline = BigNumber.from('1');
      const nonce = await StandardToken.nonces(walletAddress);

      const digest = await getApprovalDigest(
        chainId,
        StandardToken,
        { owner: walletAddress, spender: walletToAddress, value },
        nonce,
        deadline,
      );

      const hash = arrayify(digest);

      const sig = joinSignature(
        new SigningKey('0x7c299dda7c704f9d474b6ca5d7fee0b490c8decca493b5764541fe5ec6b65114').signDigest(hash),
      );
      const { r, s, v } = splitSignature(sig);

      StandardToken = StandardToken.connect(walletTo);

      await expect(StandardToken.permit(walletAddress, walletToAddress, value, deadline, v, r, s)).to.be.revertedWith(
        'ERC2612/Expired-time',
      );
    });

    it('should be reverted when owner for zero address', async () => {
      const walletAddress = await wallet.getAddress();
      const walletToAddress = await walletTo.getAddress();
      const value = constants.MaxUint256;
      const chainId = 1;
      const deadline = constants.MaxUint256;
      const nonce = await StandardToken.nonces(walletAddress);

      const digest = await getApprovalDigest(
        chainId,
        StandardToken,
        { owner: walletAddress, spender: walletToAddress, value },
        nonce,
        deadline,
      );

      const hash = arrayify(digest);

      const sig = joinSignature(
        new SigningKey('0x7c299dda7c704f9d474b6ca5d7fee0b490c8decca493b5764541fe5ec6b65114').signDigest(hash),
      );
      const { r, s, v } = splitSignature(sig);

      StandardToken = StandardToken.connect(walletTo);

      await expect(
        StandardToken.permit(constants.AddressZero, walletToAddress, value, deadline, v, r, s),
      ).to.be.revertedWith('ERC2612/Invalid-address-0');
    });

    it('should be reverted with invalid signature', async () => {
      const walletAddress = await wallet.getAddress();
      const walletToAddress = await walletTo.getAddress();
      const value = constants.MaxUint256;
      const chainId = 1;
      const deadline = constants.MaxUint256;
      const nonce = await StandardToken.nonces(walletAddress);

      const digest = await getApprovalDigest(
        chainId,
        StandardToken,
        { owner: walletAddress, spender: walletToAddress, value },
        nonce,
        deadline,
      );

      const hash = arrayify(digest);

      const sig = joinSignature(
        new SigningKey('0x7c299dda7c704f9d474b6ca5d7fee0b490c8decca493b5764541fe5ec6b65114').signDigest(hash),
      );
      const { r, s, v } = splitSignature(sig);
      const fakeR = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

      StandardToken = StandardToken.connect(walletTo);

      await expect(
        StandardToken.permit(walletAddress, walletToAddress, value, deadline, v, fakeR, s),
      ).to.be.revertedWith('ERC2612/Invalid-Signature');
    });
  });
});
