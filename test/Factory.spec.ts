import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Contract, BigNumber, constants, Signer, ContractFactory } from 'ethers';
import { keccak256, defaultAbiCoder, parseEther, Interface } from 'ethers/lib/utils';
import { getMinimalCode } from './util';

const AllowlistJson = require('@beandao/contracts/build/contracts/Allowlist.json');

describe('FactoryV1', () => {
  let AllowlistDeployer: ContractFactory;
  let FactoryDeployer: ContractFactory;

  let Factory: Contract;
  let Allowlist: Contract;

  let wallet: Signer;
  let Dummy: Signer;

  beforeEach(async () => {
    const accounts = await ethers.getSigners();
    [wallet, Dummy] = accounts;

    AllowlistDeployer = new ethers.ContractFactory(AllowlistJson.abi, AllowlistJson.bytecode, wallet);
    Allowlist = await AllowlistDeployer.deploy();

    FactoryDeployer = await ethers.getContractFactory('contracts/FactoryV1.sol:FactoryV1', wallet);
    Factory = await FactoryDeployer.deploy(Allowlist.address, parseEther('0.001'), await wallet.getAddress());

    await Factory.deployed();
  });

  describe('#addTemplate()', () => {
    it('should be success add Template with Minimal.', async () => {
      const StandardTokenTemplate = await ethers.getContractFactory(
        'contracts/tokens/StandardToken.sol:StandardToken',
        wallet,
      );
      const StandardToken = await StandardTokenTemplate.deploy();
      const contractVersion = '1';
      const tokenName = 'template';
      const tokenSymbol = 'TEMP';
      const tokenDecimals = BigNumber.from('18');
      await StandardToken.deployed();
      await StandardToken.initialize(contractVersion, tokenName, tokenSymbol, tokenDecimals);

      const nonce = await Factory.nonce();

      const key = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [StandardToken.address, nonce]));

      const txCount = await ethers.provider.getTransactionCount(Factory.address);
      const deployableBeaconAddr = ethers.utils.getContractAddress({ from: Factory.address, nonce: txCount });

      expect(await Factory.addTemplate(StandardToken.address, constants.AddressZero))
        .to.emit(Factory, 'NewTemplate')
        .withArgs(key, StandardToken.address, deployableBeaconAddr);
    });

    it('should be revert already exist template added.', async () => {
      const StandardTokenTemplate = await ethers.getContractFactory(
        'contracts/tokens/StandardToken.sol:StandardToken',
        wallet,
      );
      const StandardToken = await StandardTokenTemplate.deploy();
      const contractVersion = '1';
      const tokenName = 'template';
      const tokenSymbol = 'TEMP';
      const tokenDecimals = BigNumber.from('18');
      await StandardToken.deployed();
      await StandardToken.initialize(contractVersion, tokenName, tokenSymbol, tokenDecimals);

      const nonce = await Factory.nonce();

      const key = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [StandardToken.address, nonce]));

      const txCount = await ethers.provider.getTransactionCount(Factory.address);
      const deployableBeaconAddr = ethers.utils.getContractAddress({ from: Factory.address, nonce: txCount });

      expect(await Factory.addTemplate(StandardToken.address, constants.AddressZero))
        .to.emit(Factory, 'NewTemplate')
        .withArgs(key, StandardToken.address, deployableBeaconAddr);

      await expect(Factory.addTemplate(StandardToken.address, constants.AddressZero)).to.be.revertedWith(
        'Factory/Non-Valid',
      );
    });
  });

  describe('#updateTemplate', () => {
    let StandardToken: Contract;
    let StandardTokenTemplate: ContractFactory;
    let TemplateKey: String;

    beforeEach(async () => {
      StandardTokenTemplate = await ethers.getContractFactory(
        'contracts/tokens/StandardToken.sol:StandardToken',
        wallet,
      );
      StandardToken = await StandardTokenTemplate.deploy();
      let nonce = await Factory.nonce();
      TemplateKey = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [StandardToken.address, nonce]));
      await Factory.addTemplate(StandardToken.address, constants.AddressZero);
    });

    it('should be success updated data', async () => {
      StandardToken = await StandardTokenTemplate.deploy();

      const updatableData = defaultAbiCoder.encode(
        ['address', 'address'],
        [StandardToken.address, '0x0000000000000000000000000000000000000001'],
      );

      await expect(Factory.updateTemplate(TemplateKey, updatableData))
        .to.emit(Factory, 'UpdatedTemplate')
        .withArgs(TemplateKey, StandardToken.address, '0x0000000000000000000000000000000000000001');

      const TemplateInfo = await Factory.templates(TemplateKey);

      const returnedAddr = defaultAbiCoder.decode(
        ['address'],
        await wallet.call({
          to: TemplateInfo['btemplate'],
        }),
      )[0];

      expect(returnedAddr).to.equal(StandardToken.address);
    });

    it('should be revert with Zero template Address', async () => {
      const updatableData = defaultAbiCoder.encode(
        ['address', 'address'],
        [constants.AddressZero, '0x0000000000000000000000000000000000000001'],
      );

      await expect(Factory.updateTemplate(TemplateKey, updatableData)).to.be.revertedWith('Factory/Non-Valid');
    });

    it('should be success template upgrade on beacon', async () => {
      const DummyOneDeployer = await ethers.getContractFactory('contracts/mocks/DummyOne.sol:DummyOne', wallet);
      const DummyTwoDeployer = await ethers.getContractFactory('contracts/mocks/DummyTwo.sol:DummyTwo', wallet);
      const DummyOne = await DummyOneDeployer.deploy();
      const DummyTwo = await DummyTwoDeployer.deploy();

      const ABI = ['function initialize(string memory _name)'];
      const interfaces = new Interface(ABI);

      const data = interfaces.encodeFunctionData('initialize', ['factori.eth']);

      // 비콘을 등록하기 위해 비콘의 주소또한 확정
      let nonce = await Factory.nonce();
      const txCount = await ethers.provider.getTransactionCount(Factory.address);
      const deployableBeaconAddr = ethers.utils.getContractAddress({ from: Factory.address, nonce: txCount });
      const BeaconKey = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [DummyOne.address, nonce]));

      expect(await Factory.addTemplate(DummyOne.address, constants.AddressZero))
        .to.emit(Factory, 'NewTemplate')
        .withArgs(BeaconKey, DummyOne.address, deployableBeaconAddr);

      // Dummy One Deploy
      const calculatedAddress = await Factory['compute(bool,bytes32,bytes)'](true, BeaconKey, data);
      await Factory['deploy(bool,bytes32,bytes,bytes[])'](true, BeaconKey, data, [], {
        value: parseEther('0.001'),
      });

      // check deployed contract
      expect(await DummyOneDeployer.attach(calculatedAddress).checkName()).to.equal('DummyOne factori.eth');

      const updatableData = defaultAbiCoder.encode(
        ['address', 'address'],
        [DummyTwo.address, '0x0000000000000000000000000000000000000001'],
      );

      // Beacon's template upgrade.
      await expect(Factory.updateTemplate(BeaconKey, updatableData))
        .to.emit(Factory, 'UpdatedTemplate')
        .withArgs(BeaconKey, DummyTwo.address, '0x0000000000000000000000000000000000000001');

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
    let StandardToken: Contract;
    let StandardTokenTemplate: ContractFactory;
    let MinimalKey: String;

    beforeEach(async () => {
      StandardTokenTemplate = await ethers.getContractFactory(
        'contracts/tokens/StandardToken.sol:StandardToken',
        wallet,
      );
      StandardToken = await StandardTokenTemplate.deploy();
      const contractVersion = '1';
      const tokenName = 'template';
      const tokenSymbol = 'TEMP';
      const tokenDecimals = BigNumber.from('18');
      await StandardToken.deployed();
      await StandardToken.initialize(contractVersion, tokenName, tokenSymbol, tokenDecimals);

      let nonce = await Factory.nonce();

      MinimalKey = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [StandardToken.address, nonce]));
      await Factory.addTemplate(StandardToken.address, constants.AddressZero);
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
    let StandardToken: Contract;
    let StandardTokenTemplate: ContractFactory;
    let MinimalKey: String;

    beforeEach(async () => {
      StandardTokenTemplate = await ethers.getContractFactory(
        'contracts/tokens/StandardToken.sol:StandardToken',
        wallet,
      );
      StandardToken = await StandardTokenTemplate.deploy();
      const contractVersion = '1';
      const tokenName = 'template';
      const tokenSymbol = 'TEMP';
      const tokenDecimals = BigNumber.from('18');
      await StandardToken.deployed();
      await StandardToken.initialize(contractVersion, tokenName, tokenSymbol, tokenDecimals);

      let nonce = await Factory.nonce();
      MinimalKey = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [StandardToken.address, nonce]));
      await Factory.addTemplate(StandardToken.address, constants.AddressZero);
    });

    it('should be success for new deploy with ordinary EOA', async () => {
      const ABI = [
        'function initialize(string memory contractVersion, string memory tokenName, string memory tokenSymbol, uint8 tokenDecimals)',
      ];
      const interfaces = new Interface(ABI);

      const contractVersion = '1';
      const tokenName = 'SAMPLE';
      const tokenSymbol = 'SAM';
      const tokenDecimals = BigNumber.from('18');

      const data = interfaces.encodeFunctionData('initialize', [
        contractVersion,
        tokenName,
        tokenSymbol,
        tokenDecimals,
      ]);

      const calculatedAddress = await Factory.connect(Dummy)['compute(bool,bytes32,bytes)'](false, MinimalKey, data);

      await expect(
        Factory.connect(Dummy)['deploy(bool,bytes32,bytes,bytes[])'](false, MinimalKey, data, [], {
          value: parseEther('0.001'),
        }),
      )
        .to.emit(Factory, 'Deployed')
        .withArgs(calculatedAddress, await Dummy.getAddress());

      const DeployedToken = StandardTokenTemplate.attach(calculatedAddress);

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

    it('should be success for deploy from template owner EOA', async () => {
      StandardToken = await StandardTokenTemplate.deploy();

      const updatableData = defaultAbiCoder.encode(
        ['address', 'address', 'uint256'],
        [StandardToken.address, await Dummy.getAddress(), parseEther('0.001')],
      );

      await Factory.updateTemplate(MinimalKey, updatableData);

      const ABI = [
        'function initialize(string memory contractVersion, string memory tokenName, string memory tokenSymbol, uint8 tokenDecimals)',
      ];
      const interfaces = new Interface(ABI);

      const contractVersion = '1';
      const tokenName = 'SAMPLE';
      const tokenSymbol = 'SAM';
      const tokenDecimals = BigNumber.from('18');

      const data = interfaces.encodeFunctionData('initialize', [
        contractVersion,
        tokenName,
        tokenSymbol,
        tokenDecimals,
      ]);

      const calculatedAddress = await Factory.connect(Dummy)['compute(bool,bytes32,bytes)'](false, MinimalKey, data);

      await expect(
        Factory.connect(Dummy)['deploy(bool,bytes32,bytes,bytes[])'](false, MinimalKey, data, [], {
          value: parseEther('0'),
        }),
      )
        .to.emit(Factory, 'Deployed')
        .withArgs(calculatedAddress, await Dummy.getAddress());

      const DeployedToken = await StandardTokenTemplate.attach(calculatedAddress);

      expect(await DeployedToken.symbol()).to.equal(tokenSymbol);
      expect(await DeployedToken.name()).to.equal(tokenName);
      expect(await DeployedToken.decimals()).to.equal(tokenDecimals);
    });

    it('should be success for deploy from EOA on allowlist', async () => {
      await Allowlist.authorise(await Dummy.getAddress());

      const ABI = [
        'function initialize(string memory contractVersion, string memory tokenName, string memory tokenSymbol, uint8 tokenDecimals)',
      ];
      const interfaces = new Interface(ABI);

      const contractVersion = '1';
      const tokenName = 'SAMPLE';
      const tokenSymbol = 'SAM';
      const tokenDecimals = BigNumber.from('18');

      const data = interfaces.encodeFunctionData('initialize', [
        contractVersion,
        tokenName,
        tokenSymbol,
        tokenDecimals,
      ]);

      const calculatedAddress = await Factory.connect(Dummy)['compute(bool,bytes32,bytes)'](false, MinimalKey, data);

      await expect(
        Factory.connect(Dummy)['deploy(bool,bytes32,bytes,bytes[])'](false, MinimalKey, data, [], {
          value: parseEther('0'),
        }),
      )
        .to.emit(Factory, 'Deployed')
        .withArgs(calculatedAddress, await Dummy.getAddress());

      const DeployedToken = StandardTokenTemplate.attach(calculatedAddress);

      expect(await DeployedToken.symbol()).to.equal(tokenSymbol);
      expect(await DeployedToken.name()).to.equal(tokenName);
      expect(await DeployedToken.decimals()).to.equal(tokenDecimals);
    });

    it('should be success making new token contract with Minimal', async () => {
      const ABI = [
        'function initialize(string memory contractVersion, string memory tokenName, string memory tokenSymbol, uint8 tokenDecimals)',
      ];
      const interfaces = new Interface(ABI);

      const contractVersion = '1';
      const tokenName = 'SAMPLE';
      const tokenSymbol = 'SAM';
      const tokenDecimals = BigNumber.from('18');

      const data = interfaces.encodeFunctionData('initialize', [
        contractVersion,
        tokenName,
        tokenSymbol,
        tokenDecimals,
      ]);

      const calculatedAddress = await Factory['compute(bool,bytes32,bytes)'](false, MinimalKey, data);

      await expect(
        Factory['deploy(bool,bytes32,bytes,bytes[])'](false, MinimalKey, data, [], {
          value: parseEther('0.001'),
        }),
      )
        .to.emit(Factory, 'Deployed')
        .withArgs(calculatedAddress, await wallet.getAddress());

      const DeployedToken = await StandardTokenTemplate.attach(calculatedAddress);

      expect(await DeployedToken.symbol()).to.equal(tokenSymbol);
      expect(await DeployedToken.name()).to.equal(tokenName);
      expect(await DeployedToken.decimals()).to.equal(tokenDecimals);
    });

    it('should be success making new token contract with call', async () => {
      const ABI = [
        'function initialize(string memory contractVersion, string memory tokenName, string memory tokenSymbol, uint8 tokenDecimals)',
        'function mintTo(address to, uint256 value)',
        'function transferOwnership(address newOwner)',
      ];
      const interfaces = new Interface(ABI);

      const contractVersion = '1';
      const tokenName = 'SAMPLE';
      const tokenSymbol = 'SAM';
      const tokenDecimals = BigNumber.from('18');

      const data = interfaces.encodeFunctionData('initialize', [
        contractVersion,
        tokenName,
        tokenSymbol,
        tokenDecimals,
      ]);

      const initialToken = BigNumber.from('100000000000000000000');

      const mintCallData = interfaces.encodeFunctionData('mintTo', [await wallet.getAddress(), initialToken]);
      const ownerCallData = interfaces.encodeFunctionData('transferOwnership', [await wallet.getAddress()]);

      const calculatedAddress = await Factory['compute(bool,bytes32,bytes)'](false, MinimalKey, data);

      expect(
        await Factory['deploy(bool,bytes32,bytes,bytes[])'](false, MinimalKey, data, [mintCallData, ownerCallData], {
          value: parseEther('0.001'),
        }),
      )
        .to.emit(Factory, 'Deployed')
        .withArgs(calculatedAddress, await wallet.getAddress());
      // .to.emit(StandardToken, 'Transfer')
      // .withArgs(constants.AddressZero, await wallet.getAddress(), initialToken);

      const DeployedToken = await StandardTokenTemplate.attach(calculatedAddress);

      expect(await DeployedToken.symbol()).to.equal(tokenSymbol);
      expect(await DeployedToken.name()).to.equal(tokenName);
      expect(await DeployedToken.decimals()).to.equal(tokenDecimals);
      expect(await DeployedToken.balanceOf(await wallet.getAddress())).to.equal(initialToken);
      expect(await DeployedToken.owner()).to.equal(await wallet.getAddress());
    });

    it('should be success with integrated smart contract', async () => {
      const StandardTokenTemplate = await ethers.getContractFactory(
        'contracts/tokens/StandardToken.sol:StandardToken',
        wallet,
      );
      const StandardToken = await StandardTokenTemplate.deploy();
      const contractVersion = '1';
      const tokenName = 'template';
      const tokenSymbol = 'TEMP';
      const tokenDecimals = BigNumber.from('18');
      await StandardToken.deployed();
      await StandardToken.initialize(contractVersion, tokenName, tokenSymbol, tokenDecimals);

      const nonce = await Factory.nonce();

      const key = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [StandardToken.address, nonce]));

      const txCount = await ethers.provider.getTransactionCount(Factory.address);
      const deployableBeaconAddr = ethers.utils.getContractAddress({ from: Factory.address, nonce: txCount });

      expect(await Factory.addTemplate(StandardToken.address, constants.AddressZero))
        .to.emit(Factory, 'NewTemplate')
        .withArgs(key, StandardToken.address, deployableBeaconAddr);

      const IntegrationDeployer = await ethers.getContractFactory(
        'contracts/mocks/IntegrationMock.sol:IntegrationMock',
        wallet,
      );
      const Integration = await IntegrationDeployer.deploy(Factory.address, key);

      const calculatedAddr = await Integration.calculateAddress('Sample', 'SAM');

      const price = Factory.getPrice();
      expect(
        await Integration.deployToken('Sample', 'SAM', BigNumber.from('100').mul('10').mul('18'), { value: price }),
      )
        .to.emit(Integration, 'Sample')
        .withArgs(calculatedAddr);

      const deployedToken = await StandardTokenTemplate.attach(calculatedAddr);

      expect(await deployedToken.name()).to.equal('Sample');
      expect(await deployedToken.symbol()).to.equal('SAM');
      expect(await deployedToken.balanceOf(await wallet.getAddress())).to.equal(
        BigNumber.from('100').mul('10').mul('18'),
      );
    });
  });

  describe('#deployWithSeed(seed)', () => {
    let StandardToken: Contract;
    let StandardTokenTemplate: ContractFactory;
    let MinimalKey: String;

    beforeEach(async () => {
      StandardTokenTemplate = await ethers.getContractFactory(
        'contracts/tokens/StandardToken.sol:StandardToken',
        wallet,
      );
      StandardToken = await StandardTokenTemplate.deploy();
      const contractVersion = '1';
      const tokenName = 'template';
      const tokenSymbol = 'TEMP';
      const tokenDecimals = BigNumber.from('18');
      await StandardToken.deployed();
      await StandardToken.initialize(contractVersion, tokenName, tokenSymbol, tokenDecimals);

      let nonce = await Factory.nonce();
      MinimalKey = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [StandardToken.address, nonce]));
      await Factory.addTemplate(StandardToken.address, constants.AddressZero);
    });

    it('should be success for new deploy with ordinary EOA', async () => {
      const ABI = [
        'function initialize(string memory contractVersion, string memory tokenName, string memory tokenSymbol, uint8 tokenDecimals)',
      ];
      const interfaces = new Interface(ABI);
      const seed = 'factorieth seed';

      const contractVersion = '1';
      const tokenName = 'SAMPLE';
      const tokenSymbol = 'SAM';
      const tokenDecimals = BigNumber.from('18');

      const data = interfaces.encodeFunctionData('initialize', [
        contractVersion,
        tokenName,
        tokenSymbol,
        tokenDecimals,
      ]);

      const calculatedAddress = await Factory.connect(Dummy)['computeWithSeed(string,bool,bytes32,bytes)'](
        seed,
        false,
        MinimalKey,
        data,
      );

      expect(
        await Factory.connect(Dummy)['deployWithSeed(string,bool,bytes32,bytes,bytes[])'](
          seed,
          false,
          MinimalKey,
          data,
          [],
          {
            value: parseEther('0.001'),
          },
        ),
      )
        .to.emit(Factory, 'Deployed')
        .withArgs(calculatedAddress, await Dummy.getAddress());

      const DeployedToken = StandardTokenTemplate.attach(calculatedAddress);

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

    it('should be success for deploy from template owner EOA', async () => {
      const seed = 'factorieth seed';
      StandardToken = await StandardTokenTemplate.deploy();

      const updatableData = defaultAbiCoder.encode(
        ['address', 'address', 'uint256'],
        [StandardToken.address, await Dummy.getAddress(), parseEther('0.001')],
      );

      await Factory.updateTemplate(MinimalKey, updatableData);

      const ABI = [
        'function initialize(string memory contractVersion, string memory tokenName, string memory tokenSymbol, uint8 tokenDecimals)',
      ];
      const interfaces = new Interface(ABI);

      const contractVersion = '1';
      const tokenName = 'SAMPLE';
      const tokenSymbol = 'SAM';
      const tokenDecimals = BigNumber.from('18');

      const data = interfaces.encodeFunctionData('initialize', [
        contractVersion,
        tokenName,
        tokenSymbol,
        tokenDecimals,
      ]);

      const calculatedAddress = await Factory.connect(Dummy)['computeWithSeed(string,bool,bytes32,bytes)'](
        seed,
        false,
        MinimalKey,
        data,
      );

      expect(
        await Factory.connect(Dummy)['deployWithSeed(string,bool,bytes32,bytes,bytes[])'](
          seed,
          false,
          MinimalKey,
          data,
          [],
          {
            value: parseEther('0'),
          },
        ),
      )
        .to.emit(Factory, 'Deployed')
        .withArgs(calculatedAddress, await Dummy.getAddress());

      const DeployedToken = await StandardTokenTemplate.attach(calculatedAddress);

      expect(await DeployedToken.symbol()).to.equal(tokenSymbol);
      expect(await DeployedToken.name()).to.equal(tokenName);
      expect(await DeployedToken.decimals()).to.equal(tokenDecimals);
    });

    it('should be success for deploy from EOA on allowlist', async () => {
      const seed = 'factorieth seed';

      await Allowlist.authorise(await Dummy.getAddress());

      const ABI = [
        'function initialize(string memory contractVersion, string memory tokenName, string memory tokenSymbol, uint8 tokenDecimals)',
      ];
      const interfaces = new Interface(ABI);

      const contractVersion = '1';
      const tokenName = 'SAMPLE';
      const tokenSymbol = 'SAM';
      const tokenDecimals = BigNumber.from('18');

      const data = interfaces.encodeFunctionData('initialize', [
        contractVersion,
        tokenName,
        tokenSymbol,
        tokenDecimals,
      ]);

      const calculatedAddress = await Factory.connect(Dummy)['computeWithSeed(string,bool,bytes32,bytes)'](
        seed,
        false,
        MinimalKey,
        data,
      );

      expect(
        await Factory.connect(Dummy)['deployWithSeed(string,bool,bytes32,bytes,bytes[])'](
          seed,
          false,
          MinimalKey,
          data,
          [],
          {
            value: parseEther('0'),
          },
        ),
      )
        .to.emit(Factory, 'Deployed')
        .withArgs(calculatedAddress, await Dummy.getAddress());

      const DeployedToken = StandardTokenTemplate.attach(calculatedAddress);

      expect(await DeployedToken.symbol()).to.equal(tokenSymbol);
      expect(await DeployedToken.name()).to.equal(tokenName);
      expect(await DeployedToken.decimals()).to.equal(tokenDecimals);
    });

    it('should be success making new token contract with Minimal', async () => {
      const seed = 'factorieth seed';

      const ABI = [
        'function initialize(string memory contractVersion, string memory tokenName, string memory tokenSymbol, uint8 tokenDecimals)',
      ];
      const interfaces = new Interface(ABI);

      const contractVersion = '1';
      const tokenName = 'SAMPLE';
      const tokenSymbol = 'SAM';
      const tokenDecimals = BigNumber.from('18');

      const data = interfaces.encodeFunctionData('initialize', [
        contractVersion,
        tokenName,
        tokenSymbol,
        tokenDecimals,
      ]);

      const calculatedAddress = await Factory['computeWithSeed(string,bool,bytes32,bytes)'](
        seed,
        false,
        MinimalKey,
        data,
      );

      expect(
        await Factory['deployWithSeed(string,bool,bytes32,bytes,bytes[])'](seed, false, MinimalKey, data, [], {
          value: parseEther('0.001'),
        }),
      )
        .to.emit(Factory, 'Deployed')
        .withArgs(calculatedAddress, await wallet.getAddress());

      const DeployedToken = await StandardTokenTemplate.attach(calculatedAddress);

      expect(await DeployedToken.symbol()).to.equal(tokenSymbol);
      expect(await DeployedToken.name()).to.equal(tokenName);
      expect(await DeployedToken.decimals()).to.equal(tokenDecimals);
    });

    it('should be success making new token contract with call', async () => {
      const seed = 'factorieth seed';

      const ABI = [
        'function initialize(string memory contractVersion, string memory tokenName, string memory tokenSymbol, uint8 tokenDecimals)',
        'function mintTo(address to, uint256 value)',
        'function transferOwnership(address newOwner)',
      ];
      const interfaces = new Interface(ABI);

      const contractVersion = '1';
      const tokenName = 'SAMPLE';
      const tokenSymbol = 'SAM';
      const tokenDecimals = BigNumber.from('18');

      const data = interfaces.encodeFunctionData('initialize', [
        contractVersion,
        tokenName,
        tokenSymbol,
        tokenDecimals,
      ]);

      const initialToken = BigNumber.from('100000000000000000000');

      const mintCallData = interfaces.encodeFunctionData('mintTo', [await wallet.getAddress(), initialToken]);
      const ownerCallData = interfaces.encodeFunctionData('transferOwnership', [await wallet.getAddress()]);

      const calculatedAddress = await Factory['computeWithSeed(string,bool,bytes32,bytes)'](
        seed,
        false,
        MinimalKey,
        data,
      );

      expect(
        await Factory['deployWithSeed(string,bool,bytes32,bytes,bytes[])'](
          seed,
          false,
          MinimalKey,
          data,
          [mintCallData, ownerCallData],
          {
            value: parseEther('0.001'),
          },
        ),
      )
        .to.emit(Factory, 'Deployed')
        .withArgs(calculatedAddress, await wallet.getAddress());
      // .to.emit(StandardToken, 'Transfer')
      // .withArgs(constants.AddressZero, await wallet.getAddress(), initialToken);

      const DeployedToken = await StandardTokenTemplate.attach(calculatedAddress);

      expect(await DeployedToken.symbol()).to.equal(tokenSymbol);
      expect(await DeployedToken.name()).to.equal(tokenName);
      expect(await DeployedToken.decimals()).to.equal(tokenDecimals);
      expect(await DeployedToken.balanceOf(await wallet.getAddress())).to.equal(initialToken);
      expect(await DeployedToken.owner()).to.equal(await wallet.getAddress());
    });

    it('should be success with integrated smart contract', async () => {
      const StandardTokenTemplate = await ethers.getContractFactory(
        'contracts/tokens/StandardToken.sol:StandardToken',
        wallet,
      );
      const StandardToken = await StandardTokenTemplate.deploy();
      const contractVersion = '1';
      const tokenName = 'template';
      const tokenSymbol = 'TEMP';
      const tokenDecimals = BigNumber.from('18');
      await StandardToken.deployed();
      await StandardToken.initialize(contractVersion, tokenName, tokenSymbol, tokenDecimals);

      const nonce = await Factory.nonce();

      const key = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [StandardToken.address, nonce]));

      const txCount = await ethers.provider.getTransactionCount(Factory.address);
      const deployableBeaconAddr = ethers.utils.getContractAddress({ from: Factory.address, nonce: txCount });

      expect(await Factory.addTemplate(StandardToken.address, constants.AddressZero))
        .to.emit(Factory, 'NewTemplate')
        .withArgs(key, StandardToken.address, deployableBeaconAddr);

      const IntegrationSeedDeployer = await ethers.getContractFactory(
        'contracts/mocks/IntegrationMock.sol:IntegrationSeedMock',
        wallet,
      );
      const IntegrationSeed = await IntegrationSeedDeployer.deploy('seed', Factory.address, key);

      const calculatedAddr = await IntegrationSeed.calculateAddress('Sample', 'SAM');

      const price = Factory.getPrice();
      expect(
        await IntegrationSeed.deployToken('Sample', 'SAM', BigNumber.from('100').mul('10').mul('18'), { value: price }),
      )
        .to.emit(IntegrationSeed, 'Sample')
        .withArgs(calculatedAddr);

      const deployedToken = await StandardTokenTemplate.attach(calculatedAddr);

      expect(await deployedToken.name()).to.equal('Sample');
      expect(await deployedToken.symbol()).to.equal('SAM');
      expect(await deployedToken.balanceOf(await wallet.getAddress())).to.equal(
        BigNumber.from('100').mul('10').mul('18'),
      );
    });
  });

  describe('#clone', () => {
    let StandardToken: Contract;
    let StandardTokenTemplate: ContractFactory;

    beforeEach(async () => {
      StandardTokenTemplate = await ethers.getContractFactory(
        'contracts/tokens/StandardToken.sol:StandardToken',
        wallet,
      );
      StandardToken = await StandardTokenTemplate.deploy();
      const contractVersion = '1';
      const tokenName = 'template';
      const tokenSymbol = 'TEMP';
      const tokenDecimals = BigNumber.from('18');
      await StandardToken.deployed();
      await StandardToken.initialize(contractVersion, tokenName, tokenSymbol, tokenDecimals);
    });

    it('should be deploy minimal proxy', async () => {
      const ABI = [
        'function initialize(string memory contractVersion, string memory tokenName, string memory tokenSymbol, uint8 tokenDecimals)',
      ];
      const interfaces = new Interface(ABI);

      const contractVersion = '1';
      const tokenName = 'SAMPLE';
      const tokenSymbol = 'SAM';
      const tokenDecimals = BigNumber.from('18');

      const data = interfaces.encodeFunctionData('initialize', [
        contractVersion,
        tokenName,
        tokenSymbol,
        tokenDecimals,
      ]);

      const deployed = await Factory.computeClone(StandardToken.address, data);
      await Factory.clone(StandardToken.address, data, []);

      await expect(await ethers.provider.getCode(deployed)).to.equal(getMinimalCode(StandardToken.address));
      const deployedToken = await StandardTokenTemplate.attach(deployed);

      expect(await deployedToken.name()).to.equal(tokenName);
      expect(await deployedToken.symbol()).to.equal(tokenSymbol);
    });

    it('should be reverted with already registerd template', async () => {
      await Factory.addTemplate(StandardToken.address, constants.AddressZero);

      const ABI = [
        'function initialize(string memory contractVersion, string memory tokenName, string memory tokenSymbol, uint8 tokenDecimals)',
      ];
      const interfaces = new Interface(ABI);

      const contractVersion = '1';
      const tokenName = 'SAMPLE';
      const tokenSymbol = 'SAM';
      const tokenDecimals = BigNumber.from('18');

      const data = interfaces.encodeFunctionData('initialize', [
        contractVersion,
        tokenName,
        tokenSymbol,
        tokenDecimals,
      ]);

      await expect(Factory.clone(StandardToken.address, data, [])).to.revertedWith('Factory/Registered-Template');
    });
  });
});
