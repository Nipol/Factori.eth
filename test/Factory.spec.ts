import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Contract, BigNumber, constants, Signer, ContractFactory } from 'ethers';
import { keccak256, defaultAbiCoder, parseEther, Interface } from 'ethers/lib/utils';
import { getMinimalCode } from './util';

describe('FactoryV1', () => {
  let Factory: Contract;

  let wallet: Signer;
  let Dummy: Signer;
  let deployer: Signer;

  let walletAddress: string;
  let dummyAddress: string;

  beforeEach(async () => {
    const accounts = await ethers.getSigners();
    [wallet, Dummy, deployer] = accounts;
    walletAddress = await wallet.getAddress();
    dummyAddress = await Dummy.getAddress();

    Factory = await (
      await ethers.getContractFactory('contracts/FactoryV1.sol:FactoryV1', deployer)
    ).deploy(parseEther('0.01'), walletAddress);
  });

  describe('#addTemplate()', () => {
    it('should be success add Template with Minimal.', async () => {
      const StandardERC20Template = await ethers.getContractFactory(
        'contracts/tokens/StandardERC20.sol:StandardERC20',
        deployer,
      );
      const StandardERC20 = await StandardERC20Template.deploy();

      const nonce = await Factory.nonce();

      const key = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [StandardERC20.address, nonce]));

      const txCount = await ethers.provider.getTransactionCount(Factory.address);
      const deployableBeaconAddr = ethers.utils.getContractAddress({ from: Factory.address, nonce: txCount });

      expect(await Factory.addTemplate(StandardERC20.address))
        .to.emit(Factory, 'NewTemplate')
        .withArgs(key, StandardERC20.address, deployableBeaconAddr);
    });

    it('should be revert already exist template added.', async () => {
      const StandardERC20Template = await ethers.getContractFactory(
        'contracts/tokens/StandardERC20.sol:StandardERC20',
        deployer,
      );
      const StandardERC20 = await StandardERC20Template.deploy();

      const nonce = await Factory.nonce();

      const key = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [StandardERC20.address, nonce]));

      const txCount = await ethers.provider.getTransactionCount(Factory.address);
      const deployableBeaconAddr = ethers.utils.getContractAddress({ from: Factory.address, nonce: txCount });

      expect(await Factory.addTemplate(StandardERC20.address))
        .to.emit(Factory, 'NewTemplate')
        .withArgs(key, StandardERC20.address, deployableBeaconAddr);

      await expect(Factory.addTemplate(StandardERC20.address)).to.be.revertedWith('Factory/Non-Valid');
    });
  });

  describe('#updateTemplate', () => {
    let StandardERC20: Contract;
    let StandardERC20Template: ContractFactory;
    let TemplateKey: String;

    beforeEach(async () => {
      StandardERC20Template = await ethers.getContractFactory(
        'contracts/tokens/StandardERC20.sol:StandardERC20',
        deployer,
      );
      StandardERC20 = await StandardERC20Template.deploy();
      let nonce = await Factory.nonce();
      TemplateKey = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [StandardERC20.address, nonce]));
      await Factory.addTemplate(StandardERC20.address);
    });

    it('should be success updated data', async () => {
      const NewStandardERC20 = await StandardERC20Template.deploy();

      await expect(Factory.updateTemplate(TemplateKey, NewStandardERC20.address))
        .to.emit(Factory, 'UpdatedTemplate')
        .withArgs(TemplateKey, NewStandardERC20.address);

      const TemplateInfo = await Factory.templates(TemplateKey);

      const returnedAddr = defaultAbiCoder.decode(
        ['address'],
        await wallet.call({
          to: TemplateInfo['btemplate'],
        }),
      )[0];

      expect(returnedAddr).to.equal(NewStandardERC20.address);
    });

    it('should be revert with Zero template Address', async () => {
      const updatableData = '0x0000000000000000000000000000000000000000';

      await expect(Factory.updateTemplate(TemplateKey, updatableData)).to.be.revertedWith('Factory/Non-Valid');
    });

    it('should be revert with none contract Address', async () => {
      const updatableData = '0x0000000000000000000000000000000000000001';

      await expect(Factory.updateTemplate(TemplateKey, updatableData)).to.be.revertedWith('Factory/is-not-Contract');
    });

    it('should be revert with already registered contract Address', async () => {
      await expect(Factory.updateTemplate(TemplateKey, StandardERC20.address)).to.be.revertedWith(
        'Factory/registered-before',
      );
    });

    it('should be success template upgrade on beacon', async () => {
      const DummyOneDeployer = await ethers.getContractFactory('contracts/mocks/DummyOne.sol:DummyOne', wallet);
      const DummyTwoDeployer = await ethers.getContractFactory('contracts/mocks/DummyTwo.sol:DummyTwo', wallet);
      const DummyOne = await DummyOneDeployer.deploy();
      const DummyTwo = await DummyTwoDeployer.deploy();

      const ABI = ['function initialize(bytes calldata data)'];
      const interfaces = new Interface(ABI);

      const data = interfaces.encodeFunctionData('initialize', [defaultAbiCoder.encode(['string'], ['factori.eth'])]);

      // 비콘을 등록하기 위해 비콘의 주소또한 확정
      let nonce = await Factory.nonce();
      const txCount = await ethers.provider.getTransactionCount(Factory.address);
      const deployableBeaconAddr = ethers.utils.getContractAddress({ from: Factory.address, nonce: txCount });
      const BeaconKey = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [DummyOne.address, nonce]));

      expect(await Factory.addTemplate(DummyOne.address))
        .to.emit(Factory, 'NewTemplate')
        .withArgs(BeaconKey, DummyOne.address, deployableBeaconAddr);

      // Dummy One Deploy
      const calculatedAddress = await Factory['compute(bool,bytes32,bytes)'](true, BeaconKey, data);
      await Factory['deploy(bool,bytes32,bytes,bytes[])'](true, BeaconKey, data, [], {
        value: parseEther('0.001'),
      });

      // check deployed contract
      expect(await DummyOneDeployer.attach(calculatedAddress).checkName()).to.equal('DummyOne factori.eth');

      // Beacon's template upgrade.
      await expect(Factory.updateTemplate(BeaconKey, DummyTwo.address))
        .to.emit(Factory, 'UpdatedTemplate')
        .withArgs(BeaconKey, DummyTwo.address);

      const TemplateInfo = await Factory.templates(BeaconKey);

      const returnedAddr = defaultAbiCoder.decode(
        ['address'],
        await wallet.call({
          to: TemplateInfo['btemplate'],
        }),
      )[0];

      expect(returnedAddr).to.equal(DummyTwo.address);

      // upgrade after check deployed contract
      expect(await DummyOneDeployer.attach(calculatedAddress).checkName()).to.equal('DummyTwo factori.eth');
    });
  });

  describe('#removeTemplate()', () => {
    let StandardERC20: Contract;
    let StandardERC20Template: ContractFactory;
    let MinimalKey: String;

    beforeEach(async () => {
      StandardERC20Template = await ethers.getContractFactory(
        'contracts/tokens/StandardERC20.sol:StandardERC20',
        wallet,
      );
      StandardERC20 = await StandardERC20Template.deploy();

      let nonce = await Factory.nonce();

      MinimalKey = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [StandardERC20.address, nonce]));
      await Factory.addTemplate(StandardERC20.address);
    });

    it('should be success with exist template', async () => {
      expect(await Factory.removeTemplate(MinimalKey))
        .to.emit(Factory, 'DeletedTemplate')
        .withArgs(MinimalKey);
    });

    it('should be revert with non exist template', async () => {
      const dummyKey = keccak256(
        defaultAbiCoder.encode(
          ['address', 'uint256'],
          ['0x0000000000000000000000000000000000000001', constants.MaxUint256],
        ),
      );
      await expect(Factory.removeTemplate(dummyKey)).to.be.revertedWith('Factory/Non-Exist');
    });
  });

  describe('#deploy()', () => {
    let StandardERC20: Contract;
    let StandardERC20Template: ContractFactory;
    let MinimalKey: String;

    beforeEach(async () => {
      StandardERC20Template = await ethers.getContractFactory(
        'contracts/tokens/StandardERC20.sol:StandardERC20',
        deployer,
      );
      StandardERC20 = await StandardERC20Template.deploy();

      let nonce = await Factory.nonce();
      MinimalKey = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [StandardERC20.address, nonce]));
      await Factory.addTemplate(StandardERC20.address);
    });

    it('should be success for new deploy with ordinary EOA', async () => {
      const ABI = ['function initialize(bytes calldata data)'];
      const interfaces = new Interface(ABI);

      const tokenName = 'SAMPLE';
      const tokenSymbol = 'SAM';
      const tokenDecimals = BigNumber.from('18');

      const data = interfaces.encodeFunctionData('initialize', [
        defaultAbiCoder.encode(['string', 'string', 'uint8'], [tokenName, tokenSymbol, tokenDecimals]),
      ]);

      const calculatedAddress = await Factory.connect(Dummy)['compute(bool,bytes32,bytes)'](false, MinimalKey, data);

      const prevBalance = await wallet.getBalance();

      await expect(
        Factory.connect(Dummy)['deploy(bool,bytes32,bytes,bytes[])'](false, MinimalKey, data, [], {
          value: parseEther('0.01'),
        }),
      )
        .to.emit(Factory, 'Deployed')
        .withArgs(calculatedAddress, dummyAddress);

      const afterBalance = await wallet.getBalance();
      expect(prevBalance.add(parseEther('0.01')).toString()).equal(afterBalance.toString());

      const DeployedToken = StandardERC20Template.attach(calculatedAddress);

      expect(await DeployedToken.symbol()).to.equal(tokenSymbol);
      expect(await DeployedToken.name()).to.equal(tokenName);
      expect(await DeployedToken.decimals()).to.equal(tokenDecimals);
    });

    it('should be revert from not payable deploy', async () => {
      await expect(
        Factory.connect(Dummy)['deploy(bool,bytes32,bytes,bytes[])'](false, MinimalKey, '0x00', [], {
          value: parseEther('0'),
        }),
      ).revertedWith('Factory/Incorrect-amounts');
    });

    it('should be success making new token contract with Minimal', async () => {
      const ABI = ['function initialize(bytes calldata data)'];
      const interfaces = new Interface(ABI);

      const tokenName = 'SAMPLE';
      const tokenSymbol = 'SAM';
      const tokenDecimals = BigNumber.from('18');

      const data = interfaces.encodeFunctionData('initialize', [
        defaultAbiCoder.encode(['string', 'string', 'uint8'], [tokenName, tokenSymbol, tokenDecimals]),
      ]);

      const calculatedAddress = await Factory.connect(Dummy)['compute(bool,bytes32,bytes)'](false, MinimalKey, data);

      const prevBalance = await wallet.getBalance();

      await expect(
        Factory.connect(Dummy)['deploy(bool,bytes32,bytes,bytes[])'](false, MinimalKey, data, [], {
          value: parseEther('0.01'),
        }),
      )
        .to.emit(Factory, 'Deployed')
        .withArgs(calculatedAddress, dummyAddress);

      const afterBalance = await wallet.getBalance();
      expect(prevBalance.add(parseEther('0.01')).toString()).equal(afterBalance.toString());

      const DeployedToken = await StandardERC20Template.attach(calculatedAddress);

      expect(await DeployedToken.symbol()).to.equal(tokenSymbol);
      expect(await DeployedToken.name()).to.equal(tokenName);
      expect(await DeployedToken.decimals()).to.equal(tokenDecimals);
    });

    it('should be success making new token contract with call', async () => {
      const ABI = [
        'function initialize(bytes calldata data)',
        'function mintTo(address to, uint256 value)',
        'function transferOwnership(address newOwner)',
      ];
      const interfaces = new Interface(ABI);

      const tokenName = 'SAMPLE';
      const tokenSymbol = 'SAM';
      const tokenDecimals = BigNumber.from('18');
      const initialToken = BigNumber.from('100000000000000000000');

      const data = interfaces.encodeFunctionData('initialize', [
        defaultAbiCoder.encode(['string', 'string', 'uint8'], [tokenName, tokenSymbol, tokenDecimals]),
      ]);
      const mintCallData = interfaces.encodeFunctionData('mintTo', [await wallet.getAddress(), initialToken]);
      const ownerCallData = interfaces.encodeFunctionData('transferOwnership', [await wallet.getAddress()]);

      const calculatedAddress = await Factory.connect(Dummy)['compute(bool,bytes32,bytes)'](false, MinimalKey, data);
      const prevBalance = await wallet.getBalance();

      expect(
        await Factory.connect(Dummy)['deploy(bool,bytes32,bytes,bytes[])'](
          false,
          MinimalKey,
          data,
          [mintCallData, ownerCallData],
          {
            value: parseEther('0.01'),
          },
        ),
      )
        .to.emit(Factory, 'Deployed')
        .withArgs(calculatedAddress, dummyAddress);
      // .to.emit(StandardERC20, 'Transfer')
      // .withArgs(constants.AddressZero, await wallet.getAddress(), initialToken);

      const afterBalance = await wallet.getBalance();
      expect(prevBalance.add(parseEther('0.01')).toString()).equal(afterBalance.toString());

      const DeployedToken = await StandardERC20Template.attach(calculatedAddress);

      expect(await DeployedToken.symbol()).to.equal(tokenSymbol);
      expect(await DeployedToken.name()).to.equal(tokenName);
      expect(await DeployedToken.decimals()).to.equal(tokenDecimals);
      expect(await DeployedToken.balanceOf(await wallet.getAddress())).to.equal(initialToken);
      expect(await DeployedToken.owner()).to.equal(await wallet.getAddress());
    });

    it('should be success with integrated smart contract', async () => {
      const StandardERC20Template = await ethers.getContractFactory(
        'contracts/tokens/StandardERC20.sol:StandardERC20',
        wallet,
      );
      const StandardERC20 = await StandardERC20Template.deploy();

      const nonce = await Factory.nonce();

      const key = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [StandardERC20.address, nonce]));

      const txCount = await ethers.provider.getTransactionCount(Factory.address);
      const deployableBeaconAddr = ethers.utils.getContractAddress({ from: Factory.address, nonce: txCount });

      expect(await Factory.addTemplate(StandardERC20.address))
        .to.emit(Factory, 'NewTemplate')
        .withArgs(key, StandardERC20.address, deployableBeaconAddr);

      const IntegrationDeployer = await ethers.getContractFactory(
        'contracts/mocks/IntegrationMock.sol:IntegrationMock',
        wallet,
      );
      const Integration = await IntegrationDeployer.deploy(Factory.address, key);

      const calculatedAddr = await Integration.calculateAddress('Sample', 'SAM');

      const price = await Factory.getPrice();
      const prevBalance = await wallet.getBalance();
      expect(
        await Integration.connect(Dummy).deployToken('Sample', 'SAM', BigNumber.from('100').mul('10').mul('18'), {
          value: price,
        }),
      )
        .to.emit(Integration, 'Sample')
        .withArgs(calculatedAddr);

      const afterBalance = await wallet.getBalance();
      expect(prevBalance.add(price).toString()).equal(afterBalance.toString());

      const deployedToken = await StandardERC20Template.attach(calculatedAddr);

      expect(await deployedToken.name()).to.equal('Sample');
      expect(await deployedToken.symbol()).to.equal('SAM');
      expect(await deployedToken.balanceOf(dummyAddress)).to.equal(BigNumber.from('100').mul('10').mul('18'));
    });
  });

  describe('#deployWithSeed(seed)', () => {
    let StandardERC20: Contract;
    let StandardERC20Template: ContractFactory;
    let MinimalKey: String;

    beforeEach(async () => {
      StandardERC20Template = await ethers.getContractFactory(
        'contracts/tokens/StandardERC20.sol:StandardERC20',
        wallet,
      );
      StandardERC20 = await StandardERC20Template.deploy();

      let nonce = await Factory.nonce();
      MinimalKey = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [StandardERC20.address, nonce]));
      await Factory.addTemplate(StandardERC20.address);
    });

    it('should be success for new deploy with ordinary EOA', async () => {
      const ABI = ['function initialize(bytes calldata data)'];
      const interfaces = new Interface(ABI);
      const seed = 'factorieth seed';

      const tokenName = 'SAMPLE';
      const tokenSymbol = 'SAM';
      const tokenDecimals = BigNumber.from('18');

      const data = interfaces.encodeFunctionData('initialize', [
        defaultAbiCoder.encode(['string', 'string', 'uint8'], [tokenName, tokenSymbol, tokenDecimals]),
      ]);

      const calculatedAddress = await Factory.connect(Dummy)['computeWithSeed(string,bool,bytes32,bytes)'](
        seed,
        false,
        MinimalKey,
        data,
      );

      const prevBalance = await wallet.getBalance();

      expect(
        await Factory.connect(Dummy)['deployWithSeed(string,bool,bytes32,bytes,bytes[])'](
          seed,
          false,
          MinimalKey,
          data,
          [],
          {
            value: parseEther('0.01'),
          },
        ),
      )
        .to.emit(Factory, 'Deployed')
        .withArgs(calculatedAddress, await Dummy.getAddress());

      const afterBalance = await wallet.getBalance();
      expect(prevBalance.add(parseEther('0.01')).toString()).equal(afterBalance.toString());

      const DeployedToken = StandardERC20Template.attach(calculatedAddress);

      expect(await DeployedToken.symbol()).to.equal(tokenSymbol);
      expect(await DeployedToken.name()).to.equal(tokenName);
      expect(await DeployedToken.decimals()).to.equal(tokenDecimals);
    });

    it('should be revert from not payable deploy', async () => {
      const seed = 'factorieth seed';

      await expect(
        Factory.connect(Dummy)['deployWithSeed(string,bool,bytes32,bytes,bytes[])'](
          seed,
          false,
          MinimalKey,
          '0x00',
          [],
          {
            value: parseEther('0'),
          },
        ),
      ).revertedWith('Factory/Incorrect-amounts');
    });

    it('should be success making new token contract with Minimal', async () => {
      const ABI = ['function initialize(bytes calldata data)'];
      const interfaces = new Interface(ABI);
      const seed = 'factorieth seed';

      const tokenName = 'SAMPLE';
      const tokenSymbol = 'SAM';
      const tokenDecimals = BigNumber.from('18');

      const data = interfaces.encodeFunctionData('initialize', [
        defaultAbiCoder.encode(['string', 'string', 'uint8'], [tokenName, tokenSymbol, tokenDecimals]),
      ]);

      const calculatedAddress = await Factory.connect(Dummy)['computeWithSeed(string,bool,bytes32,bytes)'](
        seed,
        false,
        MinimalKey,
        data,
      );

      const prevBalance = await wallet.getBalance();

      expect(
        await Factory.connect(Dummy)['deployWithSeed(string,bool,bytes32,bytes,bytes[])'](
          seed,
          false,
          MinimalKey,
          data,
          [],
          {
            value: parseEther('0.01'),
          },
        ),
      )
        .to.emit(Factory, 'Deployed')
        .withArgs(calculatedAddress, dummyAddress);

      const afterBalance = await wallet.getBalance();
      expect(prevBalance.add(parseEther('0.01')).toString()).equal(afterBalance.toString());

      const DeployedToken = await StandardERC20Template.attach(calculatedAddress);

      expect(await DeployedToken.symbol()).to.equal(tokenSymbol);
      expect(await DeployedToken.name()).to.equal(tokenName);
      expect(await DeployedToken.decimals()).to.equal(tokenDecimals);
    });

    it('should be success making new token contract with call', async () => {
      const seed = 'factorieth seed';
      const ABI = [
        'function initialize(bytes calldata data)',
        'function mintTo(address to, uint256 value)',
        'function transferOwnership(address newOwner)',
      ];
      const interfaces = new Interface(ABI);

      const tokenName = 'SAMPLE';
      const tokenSymbol = 'SAM';
      const tokenDecimals = BigNumber.from('18');
      const initialToken = BigNumber.from('100000000000000000000');

      const data = interfaces.encodeFunctionData('initialize', [
        defaultAbiCoder.encode(['string', 'string', 'uint8'], [tokenName, tokenSymbol, tokenDecimals]),
      ]);
      const mintCallData = interfaces.encodeFunctionData('mintTo', [await wallet.getAddress(), initialToken]);
      const ownerCallData = interfaces.encodeFunctionData('transferOwnership', [await wallet.getAddress()]);

      const calculatedAddress = await Factory.connect(Dummy)['computeWithSeed(string,bool,bytes32,bytes)'](
        seed,
        false,
        MinimalKey,
        data,
      );

      const prevBalance = await wallet.getBalance();

      expect(
        await Factory.connect(Dummy)['deployWithSeed(string,bool,bytes32,bytes,bytes[])'](
          seed,
          false,
          MinimalKey,
          data,
          [mintCallData, ownerCallData],
          {
            value: parseEther('0.01'),
          },
        ),
      )
        .to.emit(Factory, 'Deployed')
        .withArgs(calculatedAddress, dummyAddress);
      // .to.emit(StandardERC20, 'Transfer')
      // .withArgs(constants.AddressZero, await wallet.getAddress(), initialToken);

      const afterBalance = await wallet.getBalance();
      expect(prevBalance.add(parseEther('0.01')).toString()).equal(afterBalance.toString());

      const DeployedToken = await StandardERC20Template.attach(calculatedAddress);

      expect(await DeployedToken.symbol()).to.equal(tokenSymbol);
      expect(await DeployedToken.name()).to.equal(tokenName);
      expect(await DeployedToken.decimals()).to.equal(tokenDecimals);
      expect(await DeployedToken.balanceOf(await wallet.getAddress())).to.equal(initialToken);
      expect(await DeployedToken.owner()).to.equal(await wallet.getAddress());
    });

    it('should be success with integrated smart contract', async () => {
      const StandardERC20Template = await ethers.getContractFactory(
        'contracts/tokens/StandardERC20.sol:StandardERC20',
        wallet,
      );
      const StandardERC20 = await StandardERC20Template.deploy();

      const nonce = await Factory.nonce();

      const key = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [StandardERC20.address, nonce]));

      const txCount = await ethers.provider.getTransactionCount(Factory.address);
      const deployableBeaconAddr = ethers.utils.getContractAddress({ from: Factory.address, nonce: txCount });

      expect(await Factory.addTemplate(StandardERC20.address))
        .to.emit(Factory, 'NewTemplate')
        .withArgs(key, StandardERC20.address, deployableBeaconAddr);

      const IntegrationSeedDeployer = await ethers.getContractFactory(
        'contracts/mocks/IntegrationMock.sol:IntegrationSeedMock',
        wallet,
      );
      const IntegrationSeed = await IntegrationSeedDeployer.deploy('seed', Factory.address, key);

      const calculatedAddr = await IntegrationSeed.calculateAddress('Sample', 'SAM');

      const price = await Factory.getPrice();
      const prevBalance = await wallet.getBalance();

      expect(
        await IntegrationSeed.connect(Dummy).deployToken('Sample', 'SAM', BigNumber.from('100').mul('10').mul('18'), {
          value: price,
        }),
      )
        .to.emit(IntegrationSeed, 'Sample')
        .withArgs(calculatedAddr);

      const afterBalance = await wallet.getBalance();
      expect(prevBalance.add(price).toString()).equal(afterBalance.toString());

      const deployedToken = await StandardERC20Template.attach(calculatedAddr);

      expect(await deployedToken.name()).to.equal('Sample');
      expect(await deployedToken.symbol()).to.equal('SAM');
      expect(await deployedToken.balanceOf(dummyAddress)).to.equal(BigNumber.from('100').mul('10').mul('18'));
    });
  });

  describe('#clone', () => {
    let StandardERC20: Contract;
    let StandardERC20Template: ContractFactory;

    beforeEach(async () => {
      StandardERC20Template = await ethers.getContractFactory(
        'contracts/tokens/StandardERC20.sol:StandardERC20',
        wallet,
      );
      StandardERC20 = await StandardERC20Template.deploy();
    });

    it('should be deploy minimal proxy', async () => {
      const ABI = [
        'function initialize(bytes calldata data)',
        'function mintTo(address to, uint256 value)',
        'function transferOwnership(address newOwner)',
      ];
      const interfaces = new Interface(ABI);

      const tokenName = 'SAMPLE';
      const tokenSymbol = 'SAM';
      const tokenDecimals = BigNumber.from('18');
      const initialToken = BigNumber.from('100000000000000000000');

      const data = interfaces.encodeFunctionData('initialize', [
        defaultAbiCoder.encode(['string', 'string', 'uint8'], [tokenName, tokenSymbol, tokenDecimals]),
      ]);
      const mintCallData = interfaces.encodeFunctionData('mintTo', [await wallet.getAddress(), initialToken]);
      const ownerCallData = interfaces.encodeFunctionData('transferOwnership', [await wallet.getAddress()]);

      const deployed = await Factory.computeClone(StandardERC20.address, data);
      await Factory.clone(StandardERC20.address, data, [mintCallData, ownerCallData]);

      await expect(await ethers.provider.getCode(deployed)).to.equal(getMinimalCode(StandardERC20.address));
      const deployedToken = await StandardERC20Template.attach(deployed);

      expect(await deployedToken.name()).to.equal(tokenName);
      expect(await deployedToken.symbol()).to.equal(tokenSymbol);
    });

    it('should be deploy minimal proxy with ordinary EOA', async () => {
      const ABI = ['function initialize(bytes calldata data)'];
      const interfaces = new Interface(ABI);

      const tokenName = 'SAMPLE';
      const tokenSymbol = 'SAM';
      const tokenDecimals = BigNumber.from('18');

      const data = interfaces.encodeFunctionData('initialize', [
        defaultAbiCoder.encode(['string', 'string', 'uint8'], [tokenName, tokenSymbol, tokenDecimals]),
      ]);

      const deployed = await Factory.connect(Dummy).computeClone(StandardERC20.address, data);
      await Factory.connect(Dummy).clone(StandardERC20.address, data, [], {
        value: parseEther('0.01'),
      });

      await expect(await ethers.provider.getCode(deployed)).to.equal(getMinimalCode(StandardERC20.address));
      const deployedToken = await StandardERC20Template.attach(deployed);

      expect(await deployedToken.name()).to.equal(tokenName);
      expect(await deployedToken.symbol()).to.equal(tokenSymbol);
    });

    it('should be revert with ordinary EOA non-pay', async () => {
      const ABI = ['function initialize(bytes calldata data)'];
      const interfaces = new Interface(ABI);

      const tokenName = 'SAMPLE';
      const tokenSymbol = 'SAM';
      const tokenDecimals = BigNumber.from('18');

      const data = interfaces.encodeFunctionData('initialize', [
        defaultAbiCoder.encode(['string', 'string', 'uint8'], [tokenName, tokenSymbol, tokenDecimals]),
      ]);

      await expect(Factory.connect(Dummy).clone(StandardERC20.address, data, [])).revertedWith(
        'Factory/Incorrect-amounts',
      );
    });

    it('should be reverted with already registerd template', async () => {
      await Factory.addTemplate(StandardERC20.address);

      const ABI = ['function initialize(bytes calldata data)'];
      const interfaces = new Interface(ABI);
      const tokenName = 'SAMPLE';
      const tokenSymbol = 'SAM';
      const tokenDecimals = BigNumber.from('18');

      const data = interfaces.encodeFunctionData('initialize', [
        defaultAbiCoder.encode(['string', 'string', 'uint8'], [tokenName, tokenSymbol, tokenDecimals]),
      ]);

      await expect(Factory.clone(StandardERC20.address, data, [])).to.revertedWith('Factory/Registered-Template');
    });
  });

  describe('#changeFee()', () => {
    it('should be change fee', async () => {
      await expect(Factory.changeFee(parseEther('0.011')))
        .to.emit(Factory, 'FeeChanged')
        .withArgs(parseEther('0.01'), parseEther('0.011'));
    });
  });

  describe('#changeFeeTo()', () => {
    it('should be change fee to', async () => {
      await expect(Factory.changeFeeTo(dummyAddress))
        .to.emit(Factory, 'FeeToChanged')
        .withArgs(walletAddress, dummyAddress);
    });
  });

  describe('#collect()', () => {
    let tokenaddr: string;
    let StandardERC20: Contract;
    const initialToken = BigNumber.from('100000000000000000000');

    beforeEach(async () => {
      const StandardERC20Template = await ethers.getContractFactory(
        'contracts/tokens/StandardERC20.sol:StandardERC20',
        wallet,
      );
      StandardERC20 = await StandardERC20Template.deploy();
      tokenaddr = StandardERC20.address;

      await StandardERC20.initialize(
        defaultAbiCoder.encode(['string', 'string', 'uint8'], ['template', 'TEMP', BigNumber.from('18')]),
      );
      await StandardERC20.mintTo(Factory.address, initialToken);
    });

    it('should be collect token', async () => {
      await expect(Factory.collect(tokenaddr))
        .to.emit(StandardERC20, 'Transfer')
        .withArgs(Factory.address, walletAddress, initialToken);
    });
  });

  describe('#recoverOwnership()', () => {
    let StandardERC20: Contract;
    let StandardERC20Template: ContractFactory;

    beforeEach(async () => {
      StandardERC20Template = await ethers.getContractFactory(
        'contracts/tokens/StandardERC20.sol:StandardERC20',
        wallet,
      );
      StandardERC20 = await StandardERC20Template.deploy();
    });

    it('should be success recovered ownership', async () => {
      const ABI = [
        'function initialize(bytes calldata data)',
        'function mintTo(address to, uint256 value)',
        'function transferOwnership(address newOwner)',
      ];
      const interfaces = new Interface(ABI);

      const tokenName = 'SAMPLE';
      const tokenSymbol = 'SAM';
      const tokenDecimals = BigNumber.from('18');
      const initialToken = BigNumber.from('100000000000000000000');

      const data = interfaces.encodeFunctionData('initialize', [
        defaultAbiCoder.encode(['string', 'string', 'uint8'], [tokenName, tokenSymbol, tokenDecimals]),
      ]);
      const mintCallData = interfaces.encodeFunctionData('mintTo', [await wallet.getAddress(), initialToken]);

      const deployed = await Factory.computeClone(StandardERC20.address, data);
      await Factory.clone(StandardERC20.address, data, [mintCallData]);

      await expect(await ethers.provider.getCode(deployed)).to.equal(getMinimalCode(StandardERC20.address));
      const deployedToken = await StandardERC20Template.attach(deployed);

      await Factory.recoverOwnership(deployed, dummyAddress);
      expect(await deployedToken.owner()).to.equal(dummyAddress);
    });
  });
});
