import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Contract, BigNumber, constants, Signer } from 'ethers';
import { Interface } from 'ethers/lib/utils';

describe('StandardToken/ERC20', () => {
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

    const StandardTokenTemplate = await ethers.getContractFactory(
      'contracts/templates/StandardToken.sol:StandardToken',
      wallet,
    );
    StandardToken = await StandardTokenTemplate.deploy();

    await StandardToken.deployed();
    await StandardToken.initialize(contractVersion, tokenName, tokenSymbol, tokenDecimals);
    await StandardToken.mint(initialToken);
  });

  describe('#name()', () => {
    it('should be correct name', async () => {
      expect(await StandardToken.name()).to.equal(tokenName);
    });
  });

  describe('#symbol()', () => {
    it('should be correct symbol', async () => {
      expect(await StandardToken.symbol()).to.equal(tokenSymbol);
    });
  });

  describe('#decimals()', () => {
    it('should be correct decimals', async () => {
      expect(await StandardToken.decimals()).to.equal(tokenDecimals);
    });
  });

  describe('#totalSupply()', () => {
    it('should be correct decimals', async () => {
      expect(await StandardToken.totalSupply()).to.be.equal(initialToken);
    });
  });

  describe('#balanceOf()', () => {
    it('should be initial Value, at Deployer Address', async () => {
      const walletAddress = await wallet.getAddress();
      expect(await StandardToken.balanceOf(walletAddress)).to.be.equal(initialToken);
    });

    it('should be Zero, at Zero Address', async () => {
      expect(await StandardToken.balanceOf(constants.AddressZero)).to.be.equal('0');
    });
  });

  describe('#allowance()', () => {
    it('should be allowance value is Zero', async () => {
      const walletAddress = await wallet.getAddress();
      const walletToAddress = await walletTo.getAddress();
      expect(await StandardToken.allowance(walletAddress, walletToAddress)).to.be.equal('0');
    });
  });

  describe('#approve()', () => {
    it('should be success, Approval.', async () => {
      const value = BigNumber.from('5000000000000000000');
      const walletAddress = await wallet.getAddress();
      const walletToAddress = await walletTo.getAddress();

      await expect(StandardToken.approve(walletToAddress, value))
        .to.emit(StandardToken, 'Approval')
        .withArgs(walletAddress, walletToAddress, value);
      expect(await StandardToken.allowance(walletAddress, walletToAddress)).to.be.equal(value);
      const value2 = BigNumber.from('0');
      await expect(StandardToken.approve(walletToAddress, value2))
        .to.emit(StandardToken, 'Approval')
        .withArgs(walletAddress, walletToAddress, value2);
      expect(await StandardToken.allowance(walletAddress, walletToAddress)).to.be.equal(value2);
    });

    it('should be success over Total Supply', async () => {
      const value = constants.MaxUint256;
      const walletAddress = await wallet.getAddress();
      const walletToAddress = await walletTo.getAddress();

      await expect(StandardToken.approve(walletToAddress, value))
        .to.emit(StandardToken, 'Approval')
        .withArgs(walletAddress, walletToAddress, value);
      expect(await StandardToken.allowance(walletAddress, walletToAddress)).to.be.equal(value);
    });

    it('should be revert approve to token address', async () => {
      const value = constants.MaxUint256;
      const contractAddress = StandardToken.address;

      await expect(StandardToken.approve(contractAddress, value)).to.be.revertedWith(
        'ERC20/Impossible-Approve-to-Self',
      );
    });
  });

  describe('#transfer()', () => {
    it('should be reverted, over Transfer Value', async () => {
      const value = initialToken.add('1');
      const walletAddress = await wallet.getAddress();
      await expect(StandardToken.transfer(walletAddress, value)).to.be.revertedWith('');
    });

    it('should be reverted, to token contract transfer', async () => {
      const value = initialToken.add('1');
      await expect(StandardToken.transfer(StandardToken.address, value)).to.be.revertedWith('');
    });

    it('should be successfully Transfer', async () => {
      const value = BigNumber.from('1000000000000000000');
      const walletAddress = await wallet.getAddress();
      const walletToAddress = await walletTo.getAddress();

      await expect(StandardToken.transfer(walletToAddress, value))
        .to.emit(StandardToken, 'Transfer')
        .withArgs(walletAddress, walletToAddress, value);
      expect(await StandardToken.balanceOf(walletToAddress)).to.equal(value);
      const balance = initialToken.sub(value);
      expect(await StandardToken.balanceOf(walletAddress)).to.equal(balance);
    });
  });

  describe('#transferFrom()', () => {
    it('should be reverted, not Allow with value transfer', async () => {
      const value = BigNumber.from('5000000000000000000');
      const walletAddress = await wallet.getAddress();
      const walletToAddress = await walletTo.getAddress();
      const DummyAddress = await Dummy.getAddress();

      await expect(StandardToken.approve(walletToAddress, value))
        .to.emit(StandardToken, 'Approval')
        .withArgs(walletAddress, walletToAddress, value);
      expect(await StandardToken.allowance(walletAddress, walletToAddress)).to.be.equal(value);

      await StandardToken.connect(walletTo);

      const newValue = value.add('1');
      await expect(StandardToken.transferFrom(walletAddress, DummyAddress, newValue)).to.be.revertedWith('');
    });

    it('should be reverted, over transfer value', async () => {
      const value = constants.MaxUint256;
      const walletAddress = await wallet.getAddress();
      const walletToAddress = await walletTo.getAddress();
      const DummyAddress = await Dummy.getAddress();

      await expect(StandardToken.approve(walletToAddress, value))
        .to.emit(StandardToken, 'Approval')
        .withArgs(walletAddress, walletToAddress, value);
      expect(await StandardToken.allowance(walletAddress, walletToAddress)).to.be.equal(value);

      StandardToken = await StandardToken.connect(walletTo);

      const newValue = initialToken.add('1');
      await expect(StandardToken.transferFrom(walletAddress, DummyAddress, newValue)).to.be.revertedWith('');
    });

    it('should be reverted, to token contract transfer', async () => {
      const value = BigNumber.from('5000000000000000000');
      const walletAddress = await wallet.getAddress();
      const walletToAddress = await walletTo.getAddress();
      const DummyAddress = await Dummy.getAddress();

      await expect(StandardToken.approve(walletToAddress, value))
        .to.emit(StandardToken, 'Approval')
        .withArgs(walletAddress, walletToAddress, value);
      expect(await StandardToken.allowance(walletAddress, walletToAddress)).to.be.equal(value);

      await StandardToken.connect(walletTo);

      const newValue = value.add('1');
      await expect(StandardToken.transferFrom(walletAddress, StandardToken.address, newValue)).to.be.revertedWith('');
    });

    it('should be success, over transfer value', async () => {
      const value = BigNumber.from('1000000000000000000');
      const walletAddress = await wallet.getAddress();
      const walletToAddress = await walletTo.getAddress();
      const DummyAddress = await Dummy.getAddress();

      await expect(StandardToken.approve(walletToAddress, value))
        .to.emit(StandardToken, 'Approval')
        .withArgs(walletAddress, walletToAddress, value);
      expect(await StandardToken.allowance(walletAddress, walletToAddress)).to.be.equal(value);

      StandardToken = await StandardToken.connect(walletTo);

      await expect(StandardToken.transferFrom(walletAddress, DummyAddress, value))
        .to.emit(StandardToken, 'Transfer')
        .withArgs(walletAddress, DummyAddress, value);
      expect(await StandardToken.balanceOf(walletAddress)).to.be.equal(initialToken.sub(value));
      expect(await StandardToken.balanceOf(walletToAddress)).to.be.equal('0');
      expect(await StandardToken.balanceOf(DummyAddress)).to.be.equal(value);
    });
  });

  describe('#mint', () => {
    it('should be success minting token', async () => {
      const walletAddress = await wallet.getAddress();
      expect(await StandardToken.mint(initialToken))
        .to.emit(StandardToken, 'Transfer')
        .withArgs(constants.AddressZero, walletAddress, initialToken);
      expect(await StandardToken.balanceOf(walletAddress)).to.equal(initialToken.mul('2'));
      expect(await StandardToken.totalSupply()).to.equal(initialToken.mul('2'));
    });

    it('should be revert minting maximum amount uint256', async () => {
      await expect(StandardToken.mint(constants.MaxUint256)).to.revertedWith('');
    });

    it('should be revert from not owner call', async () => {
      await expect(StandardToken.connect(Dummy).mint(constants.MaxUint256)).to.revertedWith('Ownership/Not-Authorized');
    });
  });

  describe('#mintTo', () => {
    it('should be success minting token for dummy', async () => {
      const DummyAddress = await Dummy.getAddress();
      expect(await StandardToken.mintTo(DummyAddress, initialToken))
        .to.emit(StandardToken, 'Transfer')
        .withArgs(constants.AddressZero, DummyAddress, initialToken);
      expect(await StandardToken.balanceOf(DummyAddress)).to.equal(initialToken);
      expect(await StandardToken.totalSupply()).to.equal(initialToken.mul('2'));
    });

    it('should be revert minting token for self', async () => {
      const TokenAddress = StandardToken.address;
      await expect(StandardToken.mintTo(TokenAddress, initialToken)).to.revertedWith('');
    });

    it('should be revert minting maximum amount uint256', async () => {
      const DummyAddress = await Dummy.getAddress();
      await expect(StandardToken.mintTo(DummyAddress, constants.MaxUint256)).to.revertedWith('');
    });

    it('should be revert from not owner call', async () => {
      const DummyAddress = await Dummy.getAddress();
      await expect(StandardToken.connect(Dummy).mintTo(DummyAddress, constants.MaxUint256)).to.revertedWith(
        'Ownership/Not-Authorized',
      );
    });
  });

  describe('#burn', () => {
    it('should be success self burn', async () => {
      const walletAddress = await wallet.getAddress();
      expect(await StandardToken.burn(initialToken))
        .to.emit(StandardToken, 'Transfer')
        .withArgs(walletAddress, constants.AddressZero, initialToken);
      expect(await StandardToken.balanceOf(walletAddress)).to.equal('0');
      expect(await StandardToken.totalSupply()).to.equal('0');
    });

    it('should be revert at balance zero', async () => {
      const walletAddress = await wallet.getAddress();
      expect(await StandardToken.burn(initialToken))
        .to.emit(StandardToken, 'Transfer')
        .withArgs(walletAddress, constants.AddressZero, initialToken);
      await expect(StandardToken.burn(initialToken)).to.revertedWith('');
    });

    it('shoule be revert from not owner call', async () => {
      await expect(StandardToken.connect(Dummy).burn(initialToken)).revertedWith('Ownership/Not-Authorized');
    });
  });

  describe('#burnFrom', () => {
    it('should be success burn another account balance', async () => {
      const walletAddress = await wallet.getAddress();
      const DummyAddress = await Dummy.getAddress();

      await StandardToken.transfer(DummyAddress, initialToken);

      await StandardToken.connect(Dummy).approve(walletAddress, constants.MaxUint256);

      expect(await StandardToken.burnFrom(DummyAddress, initialToken))
        .to.emit(StandardToken, 'Transfer')
        .withArgs(DummyAddress, constants.AddressZero, initialToken);

      expect(await StandardToken.balanceOf(walletAddress)).to.equal('0');
      expect(await StandardToken.balanceOf(DummyAddress)).to.equal('0');
      expect(await StandardToken.totalSupply()).to.equal('0');
    });

    it('should be revert at balance zero', async () => {
      const walletAddress = await wallet.getAddress();
      const DummyAddress = await Dummy.getAddress();

      await StandardToken.connect(Dummy).approve(walletAddress, constants.MaxUint256);

      await expect(StandardToken.burnFrom(DummyAddress, initialToken)).revertedWith('');
    });

    it('should be revert at not approved', async () => {
      const DummyAddress = await Dummy.getAddress();
      await StandardToken.transfer(DummyAddress, initialToken);
      await expect(StandardToken.burnFrom(DummyAddress, initialToken)).revertedWith('');
    });

    it('shoule be revert from not owner call', async () => {
      const DummyAddress = await Dummy.getAddress();
      await expect(StandardToken.connect(Dummy).burnFrom(DummyAddress, initialToken)).revertedWith(
        'Ownership/Not-Authorized',
      );
    });
  });

  describe('#supportsInterface', () => {
    it('should be corrected return value from invalid interface', async () => {
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
        // ERC2612
        'function permit(address owner,address spender,uint256 value,uint256 deadline,uint8 v,bytes32 r,bytes32 s)',
        // Multicall
        'function multicall(bytes[] calldata callData)',
        // ERC173
        'function owner()',
        'function transferOwnership(address newOwner)',
        // ERC165
        'function supportsInterface(bytes4 interfaceID) external view returns (bool)',
        // IMint
        'function mint(uint256 value) external returns (bool)',
        'function mintTo(address to, uint256 value) external returns (bool)',
        // IBurn
        'function burn(uint256 value) external returns (bool)',
        'function burnFrom(address from, uint256 value) external returns (bool)',
      ]);

      expect(await StandardToken.supportsInterface('0x00000001')).to.equal(false);
      // expect(await StandardToken.supportsInterface(iface.getSighash('permit'))).to.equal(true);
      // expect(await StandardToken.supportsInterface(iface.getSighash('name'))).to.equal(true);
      // expect(await StandardToken.supportsInterface(iface.getSighash('symbol'))).to.equal(true);
      // expect(await StandardToken.supportsInterface(iface.getSighash('decimals'))).to.equal(true);
      // expect(await StandardToken.supportsInterface(iface.getSighash('totalSupply'))).to.equal(true);
      // expect(await StandardToken.supportsInterface(iface.getSighash('transfer'))).to.equal(true);
      // expect(await StandardToken.supportsInterface(iface.getSighash('transferFrom'))).to.equal(true);
      // expect(await StandardToken.supportsInterface(iface.getSighash('approve'))).to.equal(true);
      // expect(await StandardToken.supportsInterface(iface.getSighash('balanceOf'))).to.equal(true);
      // expect(await StandardToken.supportsInterface(iface.getSighash('allowance'))).to.equal(true);
      // expect(await StandardToken.supportsInterface(iface.getSighash('multicall'))).to.equal(true);
      // expect(await StandardToken.supportsInterface(iface.getSighash('supportsInterface'))).to.equal(true);
      // expect(await StandardToken.supportsInterface(iface.getSighash('owner'))).to.equal(true);
      // expect(await StandardToken.supportsInterface(iface.getSighash('transferOwnership'))).to.equal(true);
      // expect(await StandardToken.supportsInterface(iface.getSighash('mint'))).to.equal(true);
      // expect(await StandardToken.supportsInterface(iface.getSighash('mintTo'))).to.equal(true);
      // expect(await StandardToken.supportsInterface(iface.getSighash('burn'))).to.equal(true);
      // expect(await StandardToken.supportsInterface(iface.getSighash('burnFrom'))).to.equal(true);
    });
  });
});
