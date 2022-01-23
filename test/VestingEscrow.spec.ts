import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Contract, BigNumber, constants, Signer } from 'ethers';
import {
  splitSignature,
  arrayify,
  joinSignature,
  SigningKey,
  recoverAddress,
  defaultAbiCoder,
  Interface,
} from 'ethers/lib/utils';
import { getApprovalDigest, latestTimestamp } from './util';

describe('VestingEscrow', () => {
  let StandardERC20: Contract;
  let VestingEscrow: Contract;

  const tokenName = 'template';
  const tokenSymbol = 'TEMP';
  const tokenDecimals = BigNumber.from('18');
  const initialToken = BigNumber.from('100000000000000000000'); //100개

  let wallet: Signer;
  let walletTo: Signer;

  let walletAddress: string;
  let toAddress: string;

  beforeEach(async () => {
    const accounts = await ethers.getSigners();
    [wallet, walletTo] = accounts;
    walletAddress = await wallet.getAddress();
    toAddress = await walletTo.getAddress();

    const StandardERC20Template = await ethers.getContractFactory(
      'contracts/tokens/StandardERC20.sol:StandardERC20',
      wallet,
    );
    StandardERC20 = await StandardERC20Template.deploy();
    await StandardERC20.initialize(
      defaultAbiCoder.encode(['string', 'string', 'uint8'], [tokenName, tokenSymbol, tokenDecimals]),
    );
    await StandardERC20.mint(initialToken);

    VestingEscrow = await (
      await ethers.getContractFactory('contracts/utils/VestingEscrow.sol:VestingEscrow', wallet)
    ).deploy();
  });

  describe('#initialize()', () => {
    it('should be success initialized with vesting', async () => {
      const to = await walletTo.getAddress();
      let now = await latestTimestamp();
      await ethers.provider.send('evm_setNextBlockTimestamp', [now + 1]);
      // await expect(VestingEscrow.lock(to, initialToken, now + 1, now + 100001));

      await expect(
        VestingEscrow.initialize(StandardERC20.address, [
          { recipient: to, amount: initialToken, startAt: now + 1, endAt: now + 100001 },
        ]),
      )
        .to.emit(VestingEscrow, 'Locked')
        .withArgs(to, initialToken, now + 1);
      expect(await VestingEscrow.allocatedSupply()).to.equal(initialToken);

      now = await latestTimestamp();
      await ethers.provider.send('evm_setNextBlockTimestamp', [now + 1000]);
      await expect(VestingEscrow['claim(address)'](to)).reverted;
      expect(await StandardERC20.balanceOf(toAddress)).to.equal('0');

      await StandardERC20.approve(VestingEscrow.address, initialToken);
      await expect(VestingEscrow['fund(uint256)'](initialToken))
        .to.emit(VestingEscrow, 'Funded')
        .withArgs(initialToken);
      expect(await StandardERC20.balanceOf(VestingEscrow.address)).to.equal(initialToken);

      now = await latestTimestamp();
      await ethers.provider.send('evm_setNextBlockTimestamp', [now + 100000]);

      await expect(VestingEscrow['claim(address)'](to)).to.emit(VestingEscrow, 'Claimed').withArgs(to, initialToken);
      expect(await StandardERC20.balanceOf(VestingEscrow.address)).to.equal('0');
      expect(await StandardERC20.balanceOf(to)).to.equal(initialToken);
    });
  });

  describe('#fund()', () => {
    beforeEach(async () => {
      await VestingEscrow.initialize(StandardERC20.address, []);
    });

    it('should be success fund', async () => {
      await StandardERC20.approve(VestingEscrow.address, initialToken);
      await expect(VestingEscrow['fund(uint256)'](initialToken))
        .to.emit(VestingEscrow, 'Funded')
        .withArgs(initialToken);
      expect(await StandardERC20.balanceOf(VestingEscrow.address)).to.equal(initialToken);
    });

    it('should be success fund with sig', async () => {
      const walletAddress = await wallet.getAddress();
      const value = initialToken;
      const chainId = await wallet.getChainId();
      const deadline = constants.MaxUint256;
      const nonce = await StandardERC20.nonces(walletAddress);

      const digest = await getApprovalDigest(
        chainId,
        StandardERC20,
        { owner: walletAddress, spender: VestingEscrow.address, value },
        nonce,
        deadline,
      );

      const hash = arrayify(digest);

      const sig = joinSignature(
        new SigningKey('0x7c299dda7c704f9d474b6ca5d7fee0b490c8decca493b5764541fe5ec6b65114').signDigest(hash),
      );
      const { v, r, s } = splitSignature(sig);

      await expect(VestingEscrow['fund(uint256,uint8,bytes32,bytes32)'](initialToken, v, r, s))
        .to.emit(VestingEscrow, 'Funded')
        .withArgs(initialToken);
      expect(await StandardERC20.balanceOf(VestingEscrow.address)).to.equal(initialToken);
    });

    it('should be revert with not approved', async () => {
      await expect(VestingEscrow['fund(uint256)'](initialToken)).to.revertedWith('');
    });

    it('should be revert fund with sig, not enough balance', async () => {
      const walletAddress = await wallet.getAddress();
      const to = await walletTo.getAddress();
      const value = initialToken;
      const chainId = await wallet.getChainId();
      const deadline = constants.MaxUint256;
      const nonce = await StandardERC20.nonces(walletAddress);

      const digest = await getApprovalDigest(
        chainId,
        StandardERC20,
        { owner: walletAddress, spender: VestingEscrow.address, value },
        nonce,
        deadline,
      );

      const hash = arrayify(digest);

      const sig = joinSignature(
        new SigningKey('0x7c299dda7c704f9d474b6ca5d7fee0b490c8decca493b5764541fe5ec6b65114').signDigest(hash),
      );
      const { v, r, s } = splitSignature(sig);

      await StandardERC20.transfer(to, initialToken);
      await expect(VestingEscrow['fund(uint256,uint8,bytes32,bytes32)'](initialToken, v, r, s)).to.revertedWith('');
    });
  });

  describe('#lock()', () => {
    beforeEach(async () => {
      await VestingEscrow.initialize(StandardERC20.address, []);
      await StandardERC20.approve(VestingEscrow.address, initialToken);
      await VestingEscrow['fund(uint256)'](initialToken);
    });

    it('should be success lock', async () => {
      const to = await walletTo.getAddress();
      const now = await latestTimestamp();
      await ethers.provider.send('evm_setNextBlockTimestamp', [now + 1]);
      await expect(VestingEscrow.lock(to, initialToken, now + 1, now + 100001))
        .to.emit(VestingEscrow, 'Locked')
        .withArgs(to, initialToken, now + 1);
      expect(await VestingEscrow.unallocatedSupply()).to.equal('0');
      // expect(await VestingEscrow.vests(to)).to.deep.equal([
      //   BigNumber.from(`${now + 1}`),
      //   BigNumber.from(`${now + 100001}`),
      //   initialToken,
      //   BigNumber.from('0'),
      // ]);
      expect((await VestingEscrow.vests(to))[0]).to.equal(BigNumber.from(`${now + 1}`));
      expect((await VestingEscrow.vests(to))[1]).to.equal(BigNumber.from(`${now + 100001}`));
      expect((await VestingEscrow.vests(to))[2]).to.equal(initialToken);
      expect((await VestingEscrow.vests(to))[3]).to.equal(BigNumber.from('0'));
    });

    it('should be revert with recipient zero', async () => {
      const to = await walletTo.getAddress();
      const now = await latestTimestamp();
      await ethers.provider.send('evm_setNextBlockTimestamp', [now + 1]);
      await expect(VestingEscrow.lock(constants.AddressZero, initialToken, now + 1, now + 100001)).revertedWith(
        'VestingEscrow/Now-Allowed-For-Zero',
      );
    });

    it('should be revert with over amount', async () => {
      const to = await walletTo.getAddress();
      const now = await latestTimestamp();
      await ethers.provider.send('evm_setNextBlockTimestamp', [now + 1]);
      await expect(VestingEscrow.lock(to, initialToken.add('1'), now + 1, now + 100001)).revertedWith(
        'VestingEscrow/Not-Enough-balance',
      );
    });

    it('should be revert with already registered', async () => {
      const to = await walletTo.getAddress();
      let now = await latestTimestamp();
      await ethers.provider.send('evm_setNextBlockTimestamp', [now + 1]);
      await expect(VestingEscrow.lock(to, '1', now + 1, now + 100001))
        .to.emit(VestingEscrow, 'Locked')
        .withArgs(to, '1', now + 1);
      expect(await VestingEscrow.unallocatedSupply()).to.equal(initialToken.sub('1'));
      now = await latestTimestamp();
      await expect(VestingEscrow.lock(to, '1', now + 2, now + 100001)).revertedWith('VestingEscrow/Already-Registred');
    });

    it('should be revert with prev start time', async () => {
      const to = await walletTo.getAddress();
      const now = await latestTimestamp();
      await ethers.provider.send('evm_setNextBlockTimestamp', [now + 1]);
      await expect(VestingEscrow.lock(to, initialToken, now - 1, now + 100001)).revertedWith(
        'VestingEscrow/Forwarded-start',
      );
    });

    it('should be revert with start is bigger than end', async () => {
      const to = await walletTo.getAddress();
      const now = await latestTimestamp();
      await ethers.provider.send('evm_setNextBlockTimestamp', [now + 1]);
      await expect(VestingEscrow.lock(to, initialToken, now + 2, now + 1)).revertedWith(
        'VestingEscrow/Bigger-than-end',
      );
    });
  });

  describe('#claim()', () => {
    let to: string;
    let now: number;

    beforeEach(async () => {
      await VestingEscrow.initialize(StandardERC20.address, []);
      await StandardERC20.approve(VestingEscrow.address, initialToken);
      await VestingEscrow['fund(uint256)'](initialToken);
      to = await walletTo.getAddress();
      now = await latestTimestamp();
      await ethers.provider.send('evm_setNextBlockTimestamp', [now + 1]);
      await expect(VestingEscrow.lock(to, initialToken, now + 1, now + 100001))
        .to.emit(VestingEscrow, 'Locked')
        .withArgs(to, initialToken, now + 1);
    });

    it('should be success claim with one second', async () => {
      now = await latestTimestamp();
      await ethers.provider.send('evm_setNextBlockTimestamp', [now + 1000]);
      await expect(VestingEscrow['claim(address)'](to))
        .to.emit(VestingEscrow, 'Claimed')
        .withArgs(to, BigNumber.from('1000000000000000000'));
      expect(await StandardERC20.balanceOf(toAddress)).to.equal('1000000000000000000');
    });

    it('should be success claim with two second', async () => {
      now = await latestTimestamp();
      await ethers.provider.send('evm_setNextBlockTimestamp', [now + 2000]);
      await expect(VestingEscrow['claim(address)'](to))
        .to.emit(VestingEscrow, 'Claimed')
        .withArgs(to, BigNumber.from('2000000000000000000'));
      expect(await StandardERC20.balanceOf(toAddress)).to.equal('2000000000000000000');
    });

    it('should be success claim with two calls', async () => {
      now = await latestTimestamp();
      await ethers.provider.send('evm_setNextBlockTimestamp', [now + 2000]);
      await expect(VestingEscrow['claim(address)'](to))
        .to.emit(VestingEscrow, 'Claimed')
        .withArgs(to, BigNumber.from('2000000000000000000'));

      now = await latestTimestamp();
      await ethers.provider.send('evm_setNextBlockTimestamp', [now + 1000]);
      await expect(VestingEscrow['claim(address)'](to))
        .to.emit(VestingEscrow, 'Claimed')
        .withArgs(to, BigNumber.from('1000000000000000000'));
      expect(await StandardERC20.balanceOf(toAddress)).to.equal('3000000000000000000');
    });

    it('should be success with end time', async () => {
      now = await latestTimestamp();
      await ethers.provider.send('evm_setNextBlockTimestamp', [now + 100000]);
      await expect(VestingEscrow['claim(address)'](to)).to.emit(VestingEscrow, 'Claimed').withArgs(to, initialToken);
      expect(await StandardERC20.balanceOf(VestingEscrow.address)).to.equal('0');
    });
  });

  describe('#decreaseLockedOf()', () => {
    let to: string;
    let now: number;

    beforeEach(async () => {
      await VestingEscrow.initialize(StandardERC20.address, []);
      await StandardERC20.approve(VestingEscrow.address, initialToken);
      await VestingEscrow['fund(uint256)'](initialToken);
      to = await walletTo.getAddress();
      now = await latestTimestamp();
      await ethers.provider.send('evm_setNextBlockTimestamp', [now + 1]);
      await expect(VestingEscrow.lock(to, initialToken, now + 1, now + 100001))
        .to.emit(VestingEscrow, 'Locked')
        .withArgs(to, initialToken, now + 1);
    });

    it('should be success desc with claim', async () => {
      to = await walletTo.getAddress();
      now = await latestTimestamp();
      await ethers.provider.send('evm_setNextBlockTimestamp', [now + 1000]);
      await expect(VestingEscrow.decreaseLockedOf(to, initialToken.div('2')))
        .to.emit(VestingEscrow, 'Claimed')
        .withArgs(to, BigNumber.from('1000000000000000000')); // 99에서 49 됨
      expect(await VestingEscrow.unallocatedSupply()).to.equal(BigNumber.from('50000000000000000000'));
      expect(await StandardERC20.balanceOf(toAddress)).to.equal('1000000000000000000');

      now = await latestTimestamp();
      await ethers.provider.send('evm_setNextBlockTimestamp', [now + 2000]);
      await expect(VestingEscrow['claim(address)'](to))
        .to.emit(VestingEscrow, 'Claimed')
        .withArgs(to, BigNumber.from('500000000000000000'));
      expect(await StandardERC20.balanceOf(toAddress)).to.equal('1500000000000000000');
    });

    it('should be revert with over decrease', async () => {
      to = await walletTo.getAddress();
      now = await latestTimestamp();
      await ethers.provider.send('evm_setNextBlockTimestamp', [now + 1000]);
      await expect(VestingEscrow.decreaseLockedOf(to, initialToken.add('2'))).revertedWith('Not Enough');
    });
  });

  describe('#supportsInterface', () => {
    it('should be corrected return value from invalid interface', async () => {
      expect(await VestingEscrow.supportsInterface('0x00000001')).to.equal(false);
    });

    it('should be success implement ERC165', async () => {
      const iface = new Interface([
        // ERC165
        'function supportsInterface(bytes4 interfaceID) external view returns (bool)',
      ]);
      expect(await VestingEscrow.supportsInterface(iface.getSighash('supportsInterface'))).to.equal(true);
    });

    it('should be success implement ERC173', async () => {
      const iface = new Interface([
        // ERC173
        'function owner()',
        'function transferOwnership(address newOwner)',
      ]);
      const ERC173Selector = BigNumber.from(iface.getSighash('owner')).xor(iface.getSighash('transferOwnership'));
      expect(await VestingEscrow.supportsInterface(ERC173Selector.toHexString())).to.equal(true);
    });

    it('should be success implement IMulticall', async () => {
      const iface = new Interface([
        // Multicall
        'function multicall(bytes[] calldata callData)',
      ]);
      expect(await VestingEscrow.supportsInterface(iface.getSighash('multicall'))).to.equal(true);
    });
  });
});
