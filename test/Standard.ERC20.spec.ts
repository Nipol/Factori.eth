import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Contract, BigNumber, constants, Signer } from 'ethers';
import { defaultAbiCoder, Interface } from 'ethers/lib/utils';

describe('Standard/ERC20', () => {
  let StandardERC20: Contract;

  const tokenName = 'template';
  const tokenSymbol = 'TEMP';
  const tokenDecimals = BigNumber.from('18');
  const initialToken = BigNumber.from('100000000000000000000');

  let wallet: Signer;
  let walletTo: Signer;
  let Dummy: Signer;

  let walletAddress: string;
  let toAddress: string;
  let dummyAddress: string;

  beforeEach(async () => {
    const accounts = await ethers.getSigners();
    [wallet, walletTo, Dummy] = accounts;
    walletAddress = await wallet.getAddress();
    toAddress = await walletTo.getAddress();
    dummyAddress = await Dummy.getAddress();

    StandardERC20 = await (
      await ethers.getContractFactory('contracts/tokens/StandardERC20.sol:StandardERC20', wallet)
    ).deploy();

    await StandardERC20.initialize(
      defaultAbiCoder.encode(['string', 'string', 'uint8'], [tokenName, tokenSymbol, tokenDecimals]),
    );
    await StandardERC20.mint(initialToken);
  });

  describe('#name()', () => {
    it('should be correct name', async () => {
      expect(await StandardERC20.name()).to.equal(tokenName);
    });
  });

  describe('#symbol()', () => {
    it('should be correct symbol', async () => {
      expect(await StandardERC20.symbol()).to.equal(tokenSymbol);
    });
  });

  describe('#decimals()', () => {
    it('should be correct decimals', async () => {
      expect(await StandardERC20.decimals()).to.equal(tokenDecimals);
    });
  });

  describe('#totalSupply()', () => {
    it('should be correct decimals', async () => {
      expect(await StandardERC20.totalSupply()).to.be.equal(initialToken);
    });
  });

  describe('#balanceOf()', () => {
    it('should be initial Value, at Deployer Address', async () => {
      expect(await StandardERC20.balanceOf(walletAddress)).to.be.equal(initialToken);
    });

    it('should be Zero, at Zero Address', async () => {
      expect(await StandardERC20.balanceOf(constants.AddressZero)).to.be.equal('0');
    });
  });

  describe('#allowance()', () => {
    it('should be allowance value is Zero', async () => {
      expect(await StandardERC20.allowance(walletAddress, toAddress)).to.be.equal('0');
    });
  });

  describe('#approve()', () => {
    it('should be success, Approval.', async () => {
      const value = BigNumber.from('5000000000000000000');

      await expect(StandardERC20.approve(toAddress, value))
        .to.emit(StandardERC20, 'Approval')
        .withArgs(walletAddress, toAddress, value);
      expect(await StandardERC20.allowance(walletAddress, toAddress)).to.be.equal(value);
      const value2 = BigNumber.from('0');
      await expect(StandardERC20.approve(toAddress, value2))
        .to.emit(StandardERC20, 'Approval')
        .withArgs(walletAddress, toAddress, value2);
      expect(await StandardERC20.allowance(walletAddress, toAddress)).to.be.equal(value2);
    });

    it('should be success over Total Supply', async () => {
      const value = constants.MaxUint256;

      await expect(StandardERC20.approve(toAddress, value))
        .to.emit(StandardERC20, 'Approval')
        .withArgs(walletAddress, toAddress, value);
      expect(await StandardERC20.allowance(walletAddress, toAddress)).to.be.equal(value);
    });

    it('should be revert approve to token address', async () => {
      const value = constants.MaxUint256;
      const contractAddress = StandardERC20.address;

      await expect(StandardERC20.approve(contractAddress, value)).to.be.revertedWith(
        'ERC20/Impossible-Approve-to-Self',
      );
    });
  });

  describe('#transfer()', () => {
    it('should be reverted, over Transfer Value', async () => {
      const value = initialToken.add('1');
      await expect(StandardERC20.transfer(walletAddress, value)).to.be.revertedWith('');
    });

    it('should be reverted, to token contract transfer', async () => {
      const value = initialToken.add('1');
      await expect(StandardERC20.transfer(StandardERC20.address, value)).to.be.revertedWith('');
    });

    it('should be successfully Transfer', async () => {
      const value = BigNumber.from('1000000000000000000');

      await expect(StandardERC20.transfer(toAddress, value))
        .to.emit(StandardERC20, 'Transfer')
        .withArgs(walletAddress, toAddress, value);
      expect(await StandardERC20.balanceOf(toAddress)).to.equal(value);
      const balance = initialToken.sub(value);
      expect(await StandardERC20.balanceOf(walletAddress)).to.equal(balance);
    });
  });

  describe('#transferFrom()', () => {
    it('should be reverted, not Allow with value transfer', async () => {
      const value = BigNumber.from('5000000000000000000');

      await expect(StandardERC20.approve(toAddress, value))
        .to.emit(StandardERC20, 'Approval')
        .withArgs(walletAddress, toAddress, value);
      expect(await StandardERC20.allowance(walletAddress, toAddress)).to.be.equal(value);

      await StandardERC20.connect(walletTo);

      const newValue = value.add('1');
      await expect(StandardERC20.transferFrom(walletAddress, dummyAddress, newValue)).to.be.revertedWith('');
    });

    it('should be reverted, over transfer value', async () => {
      const value = constants.MaxUint256;
      await expect(StandardERC20.approve(toAddress, value))
        .to.emit(StandardERC20, 'Approval')
        .withArgs(walletAddress, toAddress, value);
      expect(await StandardERC20.allowance(walletAddress, toAddress)).to.be.equal(value);

      StandardERC20 = await StandardERC20.connect(walletTo);

      const newValue = initialToken.add('1');
      await expect(StandardERC20.transferFrom(walletAddress, dummyAddress, newValue)).to.be.revertedWith('');
    });

    it('should be reverted, to token contract transfer', async () => {
      const value = BigNumber.from('5000000000000000000');

      await expect(StandardERC20.approve(toAddress, value))
        .to.emit(StandardERC20, 'Approval')
        .withArgs(walletAddress, toAddress, value);
      expect(await StandardERC20.allowance(walletAddress, toAddress)).to.be.equal(value);

      await StandardERC20.connect(walletTo);

      const newValue = value.add('1');
      await expect(StandardERC20.transferFrom(walletAddress, StandardERC20.address, newValue)).to.be.revertedWith('');
    });

    it('should be success, over transfer value', async () => {
      const value = BigNumber.from('1000000000000000000');

      await expect(StandardERC20.approve(toAddress, value))
        .to.emit(StandardERC20, 'Approval')
        .withArgs(walletAddress, toAddress, value);
      expect(await StandardERC20.allowance(walletAddress, toAddress)).to.be.equal(value);

      StandardERC20 = await StandardERC20.connect(walletTo);

      await expect(StandardERC20.transferFrom(walletAddress, dummyAddress, value))
        .to.emit(StandardERC20, 'Transfer')
        .withArgs(walletAddress, dummyAddress, value);
      expect(await StandardERC20.balanceOf(walletAddress)).to.be.equal(initialToken.sub(value));
      expect(await StandardERC20.balanceOf(toAddress)).to.be.equal('0');
      expect(await StandardERC20.balanceOf(dummyAddress)).to.be.equal(value);
    });
  });

  describe('#mint', () => {
    it('should be success minting token', async () => {
      expect(await StandardERC20.mint(initialToken))
        .to.emit(StandardERC20, 'Transfer')
        .withArgs(constants.AddressZero, walletAddress, initialToken);
      expect(await StandardERC20.balanceOf(walletAddress)).to.equal(initialToken.mul('2'));
      expect(await StandardERC20.totalSupply()).to.equal(initialToken.mul('2'));
    });

    it('should be revert minting maximum amount uint256', async () => {
      await expect(StandardERC20.mint(constants.MaxUint256)).to.revertedWith('');
    });

    it('should be revert from not owner call', async () => {
      await expect(StandardERC20.connect(Dummy).mint(constants.MaxUint256)).to.revertedWith('Ownership/Not-Authorized');
    });
  });

  describe('#mintTo', () => {
    it('should be success minting token for dummy', async () => {
      expect(await StandardERC20.mintTo(dummyAddress, initialToken))
        .to.emit(StandardERC20, 'Transfer')
        .withArgs(constants.AddressZero, dummyAddress, initialToken);
      expect(await StandardERC20.balanceOf(dummyAddress)).to.equal(initialToken);
      expect(await StandardERC20.totalSupply()).to.equal(initialToken.mul('2'));
    });

    it('should be revert minting token for self', async () => {
      const TokenAddress = StandardERC20.address;
      await expect(StandardERC20.mintTo(TokenAddress, initialToken)).to.revertedWith('');
    });

    it('should be revert minting maximum amount uint256', async () => {
      await expect(StandardERC20.mintTo(dummyAddress, constants.MaxUint256)).to.revertedWith('');
    });

    it('should be revert from not owner call', async () => {
      await expect(StandardERC20.connect(Dummy).mintTo(dummyAddress, constants.MaxUint256)).to.revertedWith(
        'Ownership/Not-Authorized',
      );
    });
  });

  describe('#burn', () => {
    it('should be success self burn', async () => {
      expect(await StandardERC20.burn(initialToken))
        .to.emit(StandardERC20, 'Transfer')
        .withArgs(walletAddress, constants.AddressZero, initialToken);
      expect(await StandardERC20.balanceOf(walletAddress)).to.equal('0');
      expect(await StandardERC20.totalSupply()).to.equal('0');
    });

    it('should be revert at balance zero', async () => {
      expect(await StandardERC20.burn(initialToken))
        .to.emit(StandardERC20, 'Transfer')
        .withArgs(walletAddress, constants.AddressZero, initialToken);
      await expect(StandardERC20.burn(initialToken)).to.revertedWith('');
    });

    it('shoule be revert from not owner call', async () => {
      await expect(StandardERC20.connect(Dummy).burn(initialToken)).revertedWith('Ownership/Not-Authorized');
    });
  });

  describe('#burnFrom', () => {
    it('should be success burn another account balance', async () => {
      await StandardERC20.transfer(dummyAddress, initialToken);

      await StandardERC20.connect(Dummy).approve(walletAddress, constants.MaxUint256);

      expect(await StandardERC20.burnFrom(dummyAddress, initialToken))
        .to.emit(StandardERC20, 'Transfer')
        .withArgs(dummyAddress, constants.AddressZero, initialToken);

      expect(await StandardERC20.balanceOf(walletAddress)).to.equal('0');
      expect(await StandardERC20.balanceOf(dummyAddress)).to.equal('0');
      expect(await StandardERC20.totalSupply()).to.equal('0');
    });

    it('should be revert at balance zero', async () => {
      await StandardERC20.connect(Dummy).approve(walletAddress, constants.MaxUint256);

      await expect(StandardERC20.burnFrom(dummyAddress, initialToken)).revertedWith('');
    });

    it('should be revert at not approved', async () => {
      await StandardERC20.transfer(dummyAddress, initialToken);
      await expect(StandardERC20.burnFrom(dummyAddress, initialToken)).revertedWith('');
    });

    it('shoule be revert from not owner call', async () => {
      await expect(StandardERC20.connect(Dummy).burnFrom(dummyAddress, initialToken)).revertedWith(
        'Ownership/Not-Authorized',
      );
    });
  });

  describe('#supportsInterface', () => {
    it('should be corrected return value from invalid interface', async () => {
      expect(await StandardERC20.supportsInterface('0x00000001')).to.equal(false);
    });

    it('should be success implement ERC20', async () => {
      const iface = new Interface([
        // ERC20
        'function name()',
        'function symbol()',
        'function decimals()',
        'function totalSupply()',
        'function transfer(address to, uint256 value)',
        'function transferFrom(address from,address to,uint256 value)',
        'function approve(address spender, uint256 value)',
        'function balanceOf(address target)',
        'function allowance(address owner, address spender)',
      ]);
      const ERC20Selector = BigNumber.from(iface.getSighash('name'))
        .xor(iface.getSighash('symbol'))
        .xor(iface.getSighash('decimals'))
        .xor(iface.getSighash('totalSupply'))
        .xor(iface.getSighash('transfer'))
        .xor(iface.getSighash('transferFrom'))
        .xor(iface.getSighash('approve'))
        .xor(iface.getSighash('balanceOf'))
        .xor(iface.getSighash('allowance'));
      expect(await StandardERC20.supportsInterface(ERC20Selector.toHexString())).to.equal(true);
    });

    it('should be success implement IMint', async () => {
      const iface = new Interface([
        // IMint
        'function mint(uint256 value) external returns (bool)',
        'function mintTo(address to, uint256 value) external returns (bool)',
      ]);
      const IMintSelector = BigNumber.from(iface.getSighash('mint')).xor(iface.getSighash('mintTo'));
      expect(await StandardERC20.supportsInterface(IMintSelector.toHexString())).to.equal(true);
    });

    it('should be success implement IBurn', async () => {
      const iface = new Interface([
        // IBurn
        'function burn(uint256 value) external returns (bool)',
        'function burnFrom(address from, uint256 value) external returns (bool)',
      ]);
      const IBurnSelector = BigNumber.from(iface.getSighash('burn')).xor(iface.getSighash('burnFrom'));
      expect(await StandardERC20.supportsInterface(IBurnSelector.toHexString())).to.equal(true);
    });

    it('should be success implement ERC2612', async () => {
      const iface = new Interface([
        // ERC2612
        'function permit(address owner,address spender,uint256 value,uint256 deadline,uint8 v,bytes32 r,bytes32 s)',
      ]);
      expect(await StandardERC20.supportsInterface(iface.getSighash('permit'))).to.equal(true);
    });

    it('should be success implement ERC165', async () => {
      const iface = new Interface([
        // ERC165
        'function supportsInterface(bytes4 interfaceID) external view returns (bool)',
      ]);
      expect(await StandardERC20.supportsInterface(iface.getSighash('supportsInterface'))).to.equal(true);
    });

    it('should be success implement ERC173', async () => {
      const iface = new Interface([
        // ERC173
        'function owner()',
        'function transferOwnership(address newOwner)',
      ]);
      const ERC173Selector = BigNumber.from(iface.getSighash('owner')).xor(iface.getSighash('transferOwnership'));
      expect(await StandardERC20.supportsInterface(ERC173Selector.toHexString())).to.equal(true);
    });

    it('should be success implement IMulticall', async () => {
      const iface = new Interface([
        // Multicall
        'function multicall(bytes[] calldata callData)',
      ]);
      expect(await StandardERC20.supportsInterface(iface.getSighash('multicall'))).to.equal(true);
    });
  });
});
