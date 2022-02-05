import { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import { Contract, BigNumber, constants, Signer } from 'ethers';
import { defaultAbiCoder, Interface } from 'ethers/lib/utils';

describe('L2Standard/ERC20', () => {
  let L2StandardERC20: Contract;

  const tokenName = 'template';
  const tokenSymbol = 'TEMP';
  const tokenDecimals = BigNumber.from('18');
  const initialToken = BigNumber.from('100000000000000000000');

  let wallet: Signer;
  let walletTo: Signer;
  let Dummy: Signer;
  let l2Bridge: Signer;
  let l1Token: Signer;

  let walletAddress: string;
  let toAddress: string;
  let dummyAddress: string;
  let l2Address: string;
  let l1Address: string;

  beforeEach(async () => {
    /// impersonate address
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: ['0x4200000000000000000000000000000000000010'],
    });
    await hre.network.provider.send('hardhat_setBalance', [
      '0x4200000000000000000000000000000000000010',
      '0x10000000000000000000000',
    ]);
    /// impersonate address

    const accounts = await ethers.getSigners();
    [wallet, walletTo, Dummy, l1Token] = accounts;
    walletAddress = await wallet.getAddress();
    toAddress = await walletTo.getAddress();
    dummyAddress = await Dummy.getAddress();
    l1Address = await l1Token.getAddress();
    /// impersonate address
    l2Bridge = await ethers.getSigner('0x4200000000000000000000000000000000000010');
    /// impersonate address
    l2Address = await l2Bridge.getAddress();

    L2StandardERC20 = await (
      await ethers.getContractFactory('contracts/tokens/L2StandardERC20.sol:L2StandardERC20', wallet)
    ).deploy();

    await L2StandardERC20.initialize(
      defaultAbiCoder.encode(
        ['string', 'string', 'uint8', 'address'],
        [tokenName, tokenSymbol, tokenDecimals, l1Address],
      ),
    );
    await L2StandardERC20.connect(l2Bridge).mint(walletAddress, initialToken);
  });

  describe('#name()', () => {
    it('should be correct name', async () => {
      expect(await L2StandardERC20.name()).to.equal(tokenName);
    });
  });

  describe('#symbol()', () => {
    it('should be correct symbol', async () => {
      expect(await L2StandardERC20.symbol()).to.equal(tokenSymbol);
    });
  });

  describe('#decimals()', () => {
    it('should be correct decimals', async () => {
      expect(await L2StandardERC20.decimals()).to.equal(tokenDecimals);
    });
  });

  describe('#totalSupply()', () => {
    it('should be correct decimals', async () => {
      expect(await L2StandardERC20.totalSupply()).to.be.equal(initialToken);
    });
  });

  describe('#balanceOf()', () => {
    it('should be initial Value, at Deployer Address', async () => {
      const walletAddress = await wallet.getAddress();
      expect(await L2StandardERC20.balanceOf(walletAddress)).to.be.equal(initialToken);
    });

    it('should be Zero, at Zero Address', async () => {
      expect(await L2StandardERC20.balanceOf(constants.AddressZero)).to.be.equal('0');
    });
  });

  describe('#allowance()', () => {
    it('should be allowance value is Zero', async () => {
      const walletAddress = await wallet.getAddress();
      const toAddress = await walletTo.getAddress();
      expect(await L2StandardERC20.allowance(walletAddress, toAddress)).to.be.equal('0');
    });
  });

  describe('#approve()', () => {
    it('should be success, Approval.', async () => {
      const value = BigNumber.from('5000000000000000000');

      await expect(L2StandardERC20.approve(toAddress, value))
        .to.emit(L2StandardERC20, 'Approval')
        .withArgs(walletAddress, toAddress, value);
      expect(await L2StandardERC20.allowance(walletAddress, toAddress)).to.be.equal(value);
      const value2 = BigNumber.from('0');
      await expect(L2StandardERC20.approve(toAddress, value2))
        .to.emit(L2StandardERC20, 'Approval')
        .withArgs(walletAddress, toAddress, value2);
      expect(await L2StandardERC20.allowance(walletAddress, toAddress)).to.be.equal(value2);
    });

    it('should be success over Total Supply', async () => {
      const value = constants.MaxUint256;

      await expect(L2StandardERC20.approve(toAddress, value))
        .to.emit(L2StandardERC20, 'Approval')
        .withArgs(walletAddress, toAddress, value);
      expect(await L2StandardERC20.allowance(walletAddress, toAddress)).to.be.equal(value);
    });

    it('should be revert approve to token address', async () => {
      const value = constants.MaxUint256;
      const contractAddress = L2StandardERC20.address;

      await expect(L2StandardERC20.approve(contractAddress, value)).to.be.revertedWith(
        'ERC20/Impossible-Approve-to-Self',
      );
    });
  });

  describe('#transfer()', () => {
    it('should be reverted, over Transfer Value', async () => {
      const value = initialToken.add('1');
      await expect(L2StandardERC20.transfer(walletAddress, value)).to.be.revertedWith('');
    });

    it('should be reverted, to token contract transfer', async () => {
      const value = initialToken.add('1');
      await expect(L2StandardERC20.transfer(L2StandardERC20.address, value)).to.be.revertedWith('');
    });

    it('should be successfully Transfer', async () => {
      const value = BigNumber.from('1000000000000000000');

      await expect(L2StandardERC20.transfer(toAddress, value))
        .to.emit(L2StandardERC20, 'Transfer')
        .withArgs(walletAddress, toAddress, value);
      expect(await L2StandardERC20.balanceOf(toAddress)).to.equal(value);
      const balance = initialToken.sub(value);
      expect(await L2StandardERC20.balanceOf(walletAddress)).to.equal(balance);
    });
  });

  describe('#transferFrom()', () => {
    it('should be reverted, not Allow with value transfer', async () => {
      const value = BigNumber.from('5000000000000000000');

      await expect(L2StandardERC20.approve(toAddress, value))
        .to.emit(L2StandardERC20, 'Approval')
        .withArgs(walletAddress, toAddress, value);
      expect(await L2StandardERC20.allowance(walletAddress, toAddress)).to.be.equal(value);

      await L2StandardERC20.connect(walletTo);

      const newValue = value.add('1');
      await expect(L2StandardERC20.transferFrom(walletAddress, dummyAddress, newValue)).to.be.revertedWith('');
    });

    it('should be reverted, over transfer value', async () => {
      const value = constants.MaxUint256;

      await expect(L2StandardERC20.approve(toAddress, value))
        .to.emit(L2StandardERC20, 'Approval')
        .withArgs(walletAddress, toAddress, value);
      expect(await L2StandardERC20.allowance(walletAddress, toAddress)).to.be.equal(value);

      L2StandardERC20 = await L2StandardERC20.connect(walletTo);

      const newValue = initialToken.add('1');
      await expect(L2StandardERC20.transferFrom(walletAddress, dummyAddress, newValue)).to.be.revertedWith('');
    });

    it('should be reverted, to token contract transfer', async () => {
      const value = BigNumber.from('5000000000000000000');

      await expect(L2StandardERC20.approve(toAddress, value))
        .to.emit(L2StandardERC20, 'Approval')
        .withArgs(walletAddress, toAddress, value);
      expect(await L2StandardERC20.allowance(walletAddress, toAddress)).to.be.equal(value);

      await L2StandardERC20.connect(walletTo);

      const newValue = value.add('1');
      await expect(L2StandardERC20.transferFrom(walletAddress, L2StandardERC20.address, newValue)).to.be.revertedWith(
        '',
      );
    });

    it('should be success, over transfer value', async () => {
      const value = BigNumber.from('1000000000000000000');

      await expect(L2StandardERC20.approve(toAddress, value))
        .to.emit(L2StandardERC20, 'Approval')
        .withArgs(walletAddress, toAddress, value);
      expect(await L2StandardERC20.allowance(walletAddress, toAddress)).to.be.equal(value);

      L2StandardERC20 = await L2StandardERC20.connect(walletTo);

      await expect(L2StandardERC20.transferFrom(walletAddress, dummyAddress, value))
        .to.emit(L2StandardERC20, 'Transfer')
        .withArgs(walletAddress, dummyAddress, value);
      expect(await L2StandardERC20.balanceOf(walletAddress)).to.be.equal(initialToken.sub(value));
      expect(await L2StandardERC20.balanceOf(toAddress)).to.be.equal('0');
      expect(await L2StandardERC20.balanceOf(dummyAddress)).to.be.equal(value);
    });
  });

  describe('#mint', () => {
    it('should be success minting token for dummy', async () => {
      expect(await L2StandardERC20.connect(l2Bridge).mint(dummyAddress, initialToken))
        .to.emit(L2StandardERC20, 'Mint')
        .withArgs(dummyAddress, initialToken);
      expect(await L2StandardERC20.balanceOf(dummyAddress)).to.equal(initialToken);
      expect(await L2StandardERC20.totalSupply()).to.equal(initialToken.mul('2'));
    });

    it('should be revert minting token for self', async () => {
      const TokenAddress = L2StandardERC20.address;
      await expect(L2StandardERC20.mint(TokenAddress, initialToken)).to.revertedWith('');
    });

    it('should be revert minting maximum amount uint256', async () => {
      const dummyAddress = await Dummy.getAddress();
      await expect(L2StandardERC20.mint(dummyAddress, constants.MaxUint256)).to.revertedWith('');
    });

    it('should be revert from not L2 Bridge call', async () => {
      const dummyAddress = await Dummy.getAddress();
      await expect(L2StandardERC20.connect(Dummy).mint(dummyAddress, constants.MaxUint256)).to.revertedWith(
        'Only L2 Bridge can mint and burn',
      );
    });
  });

  describe('#burn', () => {
    it('should be success from l2 Bridge', async () => {
      await expect(L2StandardERC20.connect(l2Bridge).burn(walletAddress, initialToken))
        .to.emit(L2StandardERC20, 'Burn')
        .withArgs(walletAddress, initialToken);
    });
    it('should be revert at balance zero', async () => {
      await L2StandardERC20.connect(Dummy).approve(walletAddress, constants.MaxUint256);
      await expect(L2StandardERC20.burn(dummyAddress, initialToken)).revertedWith('');
    });

    it('should be revert at not approved', async () => {
      await L2StandardERC20.transfer(dummyAddress, initialToken);
      await expect(L2StandardERC20.burn(dummyAddress, initialToken)).revertedWith('');
    });

    it('shoule be revert from not L2 Bridge call', async () => {
      await expect(L2StandardERC20.connect(Dummy).burn(dummyAddress, initialToken)).revertedWith(
        'Only L2 Bridge can mint and burn',
      );
    });
  });

  describe('#supportsInterface', () => {
    it('should be corrected return value from invalid interface', async () => {
      expect(await L2StandardERC20.supportsInterface('0x00000001')).to.equal(false);
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
      expect(await L2StandardERC20.supportsInterface(ERC20Selector.toHexString())).to.equal(true);
    });

    it('should be success implement ERC2612', async () => {
      const iface = new Interface([
        // ERC2612
        'function permit(address owner,address spender,uint256 value,uint256 deadline,uint8 v,bytes32 r,bytes32 s)',
      ]);
      expect(await L2StandardERC20.supportsInterface(iface.getSighash('permit'))).to.equal(true);
    });

    it('should be success implement ERC165', async () => {
      const iface = new Interface([
        // ERC165
        'function supportsInterface(bytes4 interfaceID) external view returns (bool)',
      ]);
      expect(await L2StandardERC20.supportsInterface(iface.getSighash('supportsInterface'))).to.equal(true);
    });

    it('should be success implement IMulticall', async () => {
      const iface = new Interface([
        // Multicall
        'function multicall(bytes[] calldata callData)',
      ]);
      expect(await L2StandardERC20.supportsInterface(iface.getSighash('multicall'))).to.equal(true);
    });

    it('should be success implement IL2StandardERC20', async () => {
      const iface = new Interface([
        // IL2StandardERC20
        'function l1Token() external returns (address)',
        'function mint(address _to, uint256 _amount) external',
        'function burn(address _from, uint256 _amount) external',
      ]);
      const L2ERC20Selector = BigNumber.from(iface.getSighash('l1Token'))
        .xor(iface.getSighash('mint'))
        .xor(iface.getSighash('burn'));
      expect(await L2StandardERC20.supportsInterface(L2ERC20Selector.toHexString())).to.equal(true);
    });
  });
});
