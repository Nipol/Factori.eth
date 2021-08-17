import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Contract, BigNumber, constants, Signer, ContractFactory } from 'ethers';
import { keccak256, defaultAbiCoder, parseEther, Interface } from 'ethers/lib/utils';

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
    Factory = await FactoryDeployer.deploy(Allowlist.address);

    await Factory.deployed();
  });

  describe('#addTemplate()', () => {
    it('should be success add Template with Minimal.', async () => {
      const StandardTokenTemplate = await ethers.getContractFactory(
        'contracts/templates/StandardToken.sol:StandardToken',
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

      expect(await Factory.addTemplate(StandardToken.address, constants.AddressZero, parseEther('0.001')))
        .to.emit(Factory, 'NewTemplate')
        .withArgs(key, StandardToken.address, parseEther('0.001'));
    });

    it('should be revert already exist template added.', async () => {
      const StandardTokenTemplate = await ethers.getContractFactory(
        'contracts/templates/StandardToken.sol:StandardToken',
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

      expect(await Factory.addTemplate(StandardToken.address, constants.AddressZero, parseEther('0.001')))
        .to.emit(Factory, 'NewTemplate')
        .withArgs(key, StandardToken.address, parseEther('0.001'));

      await expect(
        Factory.addTemplate(StandardToken.address, constants.AddressZero, parseEther('0.001')),
      ).to.be.revertedWith('Factory/Non-Valid');
    });
  });

  describe('#addBeacon()', () => {
    let StandardToken: Contract;
    let StandardTokenTemplate: ContractFactory;
    let BeaconKey: String;

    it('should be success add Template with Beacon', async () => {
      StandardTokenTemplate = await ethers.getContractFactory(
        'contracts/templates/StandardToken.sol:StandardToken',
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

      const txCount = await ethers.provider.getTransactionCount(Factory.address);
      const deployableBeaconAddr = ethers.utils.getContractAddress({ from: Factory.address, nonce: txCount });

      BeaconKey = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [deployableBeaconAddr, nonce]));
      expect(await Factory.addBeacon(StandardToken.address, constants.AddressZero, parseEther('0.001')))
        .to.emit(Factory, 'NewTemplate')
        .withArgs(BeaconKey, deployableBeaconAddr, parseEther('0.001'));
    });

    it('should be revert already exist template added.', async () => {
      StandardTokenTemplate = await ethers.getContractFactory(
        'contracts/templates/StandardToken.sol:StandardToken',
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

      const txCount = await ethers.provider.getTransactionCount(Factory.address);
      const deployableBeaconAddr = ethers.utils.getContractAddress({ from: Factory.address, nonce: txCount });

      BeaconKey = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [deployableBeaconAddr, nonce]));
      expect(await Factory.addBeacon(StandardToken.address, constants.AddressZero, parseEther('0.001')))
        .to.emit(Factory, 'NewTemplate')
        .withArgs(BeaconKey, deployableBeaconAddr, parseEther('0.001'));

      await expect(
        Factory.addBeacon(StandardToken.address, constants.AddressZero, parseEther('0.001')),
      ).to.be.revertedWith('Factory/Non-Valid');
    });
  });

  describe('#updateTemplate', () => {
    let StandardToken: Contract;
    let StandardTokenTemplate: ContractFactory;
    let MinimalKey: String;
    let BeaconKey: String;

    beforeEach(async () => {
      StandardTokenTemplate = await ethers.getContractFactory(
        'contracts/templates/StandardToken.sol:StandardToken',
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
      await Factory.addTemplate(StandardToken.address, constants.AddressZero, parseEther('0.001'));

      const txCount = await ethers.provider.getTransactionCount(Factory.address);
      const deployableBeaconAddr = ethers.utils.getContractAddress({ from: Factory.address, nonce: txCount });

      nonce = await Factory.nonce();

      BeaconKey = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [deployableBeaconAddr, nonce]));
      await Factory.addBeacon(StandardToken.address, constants.AddressZero, parseEther('0.001'));
    });

    it('should be update with minimal template', async () => {
      const updatableData = defaultAbiCoder.encode(
        ['address', 'address', 'uint256'],
        [constants.AddressZero, '0x0000000000000000000000000000000000000001', parseEther('0.002')],
      );

      expect(await Factory.updateTemplate(MinimalKey, updatableData))
        .to.emit(Factory, 'UpdatedTemplate')
        .withArgs(MinimalKey, StandardToken.address, '0x0000000000000000000000000000000000000001', parseEther('0.002'));
    });

    it('should be revert with update minimal template with non zero address template', async () => {
      const AnotherStandardToken = await StandardTokenTemplate.deploy();

      const updatableData = defaultAbiCoder.encode(
        ['address', 'address', 'uint256'],
        [AnotherStandardToken.address, '0x0000000000000000000000000000000000000001', parseEther('0.002')],
      );

      await expect(Factory.updateTemplate(MinimalKey, updatableData)).to.be.revertedWith('Factory/Non-Valid');
    });

    it('should be update with beacon template', async () => {
      const AnotherStandardToken = await StandardTokenTemplate.deploy();
      const beaconAddr = await Factory.templates(BeaconKey);

      const updatableData = defaultAbiCoder.encode(
        ['address', 'address', 'uint256'],
        [AnotherStandardToken.address, '0x0000000000000000000000000000000000000001', parseEther('0.002')],
      );

      expect(await Factory.updateTemplate(BeaconKey, updatableData))
        .to.emit(Factory, 'UpdatedTemplate')
        .withArgs(
          BeaconKey,
          beaconAddr['template'], //beacon addr은 그대로임
          '0x0000000000000000000000000000000000000001',
          parseEther('0.002'),
        );
    });

    it('should be revert with update beacon template with zero address template', async () => {
      const updatableData = defaultAbiCoder.encode(
        ['address', 'address', 'uint256'],
        [constants.AddressZero, '0x0000000000000000000000000000000000000001', parseEther('0.002')],
      );

      await expect(Factory.updateTemplate(BeaconKey, updatableData)).to.be.revertedWith('Factory/Non-Valid');
    });

    it('should be success template upgrade for beacon', async () => {
      const DummyOneDeployer = await ethers.getContractFactory('contracts/mocks/DummyOne.sol:DummyOne', wallet);
      const DummyTwoDeployer = await ethers.getContractFactory('contracts/mocks/DummyTwo.sol:DummyTwo', wallet);
      const DummyOne = await DummyOneDeployer.deploy();
      const DummyTwo = await DummyTwoDeployer.deploy();

      const ABI = ['function initialize(string memory _name)'];
      const interfaces = new Interface(ABI);

      const data = interfaces.encodeFunctionData('initialize', ['factori.eth']);

      // add beacon template
      let nonce = await Factory.nonce();
      const txCount = await ethers.provider.getTransactionCount(Factory.address);
      const deployableBeaconAddr = ethers.utils.getContractAddress({ from: Factory.address, nonce: txCount });
      const BeaconKey = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [deployableBeaconAddr, nonce]));

      expect(await Factory.addBeacon(DummyOne.address, constants.AddressZero, parseEther('0.001')))
        .to.emit(Factory, 'NewTemplate')
        .withArgs(BeaconKey, deployableBeaconAddr, parseEther('0.001'));

      // Dummy One Deploy
      const calculatedAddress = await Factory['calculateDeployableAddress(bytes32,bytes)'](BeaconKey, data);
      await Factory['deploy(bytes32,bytes,bytes[])'](BeaconKey, data, [], { value: parseEther('0.001') });

      // check deployed contract
      expect(await DummyOneDeployer.attach(calculatedAddress).checkName()).to.equal('DummyOne factori.eth');

      const beaconAddr = await Factory.templates(BeaconKey);

      const updatableData = defaultAbiCoder.encode(
        ['address', 'address', 'uint256'],
        [DummyTwo.address, '0x0000000000000000000000000000000000000001', parseEther('0.002')],
      );

      // Beacon's template upgrade.
      expect(await Factory.updateTemplate(BeaconKey, updatableData))
        .to.emit(Factory, 'UpdatedTemplate')
        .withArgs(BeaconKey, beaconAddr['template'], '0x0000000000000000000000000000000000000001', parseEther('0.002'));

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
        'contracts/templates/StandardToken.sol:StandardToken',
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
      await Factory.addTemplate(StandardToken.address, constants.AddressZero, parseEther('0.001'));
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
        'contracts/templates/StandardToken.sol:StandardToken',
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
      await Factory.addTemplate(StandardToken.address, constants.AddressZero, parseEther('0.001'));
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

      const calculatedAddress = await Factory.connect(Dummy)['calculateDeployableAddress(bytes32,bytes)'](
        MinimalKey,
        data,
      );

      expect(
        await Factory.connect(Dummy)['deploy(bytes32,bytes,bytes[])'](MinimalKey, data, [], {
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
        Factory.connect(Dummy)['deploy(bytes32,bytes,bytes[])'](MinimalKey, '0x00', [], { value: parseEther('0') }),
      ).revertedWith('Factory/Incorrect-amounts');
    });

    it('should be success for deploy from template owner EOA', async () => {
      const updatableData = defaultAbiCoder.encode(
        ['address', 'address', 'uint256'],
        [constants.AddressZero, await Dummy.getAddress(), parseEther('0.001')],
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

      const calculatedAddress = await Factory.connect(Dummy)['calculateDeployableAddress(bytes32,bytes)'](
        MinimalKey,
        data,
      );

      expect(
        await Factory.connect(Dummy)['deploy(bytes32,bytes,bytes[])'](MinimalKey, data, [], { value: parseEther('0') }),
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

      const calculatedAddress = await Factory.connect(Dummy)['calculateDeployableAddress(bytes32,bytes)'](
        MinimalKey,
        data,
      );

      expect(
        await Factory.connect(Dummy)['deploy(bytes32,bytes,bytes[])'](MinimalKey, data, [], { value: parseEther('0') }),
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

      const calculatedAddress = await Factory['calculateDeployableAddress(bytes32,bytes)'](MinimalKey, data);

      expect(await Factory['deploy(bytes32,bytes,bytes[])'](MinimalKey, data, [], { value: parseEther('0.001') }))
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

      const calculatedAddress = await Factory['calculateDeployableAddress(bytes32,bytes)'](MinimalKey, data);

      expect(
        await Factory['deploy(bytes32,bytes,bytes[])'](MinimalKey, data, [mintCallData, ownerCallData], {
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

    it('should be accumulated price after deployed token', async () => {
      const ABI = [
        'function initialize(string memory contractVersion, string memory tokenName, string memory tokenSymbol, uint8 tokenDecimals)',
        'function mintTo(address to, uint256 value)',
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

      const calculatedAddress = await Factory['calculateDeployableAddress(bytes32,bytes)'](MinimalKey, data);

      expect(await Factory['deploy(bytes32,bytes,bytes[])'](MinimalKey, data, [], { value: parseEther('0.001') }))
        .to.emit(Factory, 'Deployed')
        .withArgs(calculatedAddress, await wallet.getAddress());

      expect(await Factory.getPrice(MinimalKey)).to.be.equal(
        parseEther('0.001').add(parseEther('0.001').div('10000').mul('30')),
      );
    });

    it('should be success with integrated smart contract', async () => {
      const StandardTokenTemplate = await ethers.getContractFactory(
        'contracts/templates/StandardToken.sol:StandardToken',
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

      expect(await Factory.addTemplate(StandardToken.address, constants.AddressZero, parseEther('0.001')))
        .to.emit(Factory, 'NewTemplate')
        .withArgs(key, StandardToken.address, parseEther('0.001'));

      const IntegrationDeployer = await ethers.getContractFactory(
        'contracts/mocks/IntegrationMock.sol:IntegrationMock',
        wallet,
      );
      const Integration = await IntegrationDeployer.deploy(Factory.address, key);

      const ABI = [
        'function initialize(string memory contractVersion, string memory tokenName, string memory tokenSymbol, uint8 tokenDecimals)',
      ];
      const interfaces = new Interface(ABI);
      // const data = interfaces.encodeFunctionData('initialize', ['1', 'Sample', 'SAM', BigNumber.from('18')]);
      const calculatedAddr = await Integration.calculateAddress('Sample', 'SAM');

      const price = Factory.getPrice(key);
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

  describe('#deploy(seed)', () => {
    let StandardToken: Contract;
    let StandardTokenTemplate: ContractFactory;
    let MinimalKey: String;

    beforeEach(async () => {
      StandardTokenTemplate = await ethers.getContractFactory(
        'contracts/templates/StandardToken.sol:StandardToken',
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
      await Factory.addTemplate(StandardToken.address, constants.AddressZero, parseEther('0.001'));
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

      const calculatedAddress = await Factory.connect(Dummy)['calculateDeployableAddress(string,bytes32,bytes)'](
        seed,
        MinimalKey,
        data,
      );

      expect(
        await Factory.connect(Dummy)['deploy(string,bytes32,bytes,bytes[])'](seed, MinimalKey, data, [], {
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
      const seed = 'factorieth seed';

      await expect(
        Factory.connect(Dummy)['deploy(string,bytes32,bytes,bytes[])'](seed, MinimalKey, '0x00', [], {
          value: parseEther('0'),
        }),
      ).revertedWith('Factory/Incorrect-amounts');
    });

    it('should be success for deploy from template owner EOA', async () => {
      const seed = 'factorieth seed';

      const updatableData = defaultAbiCoder.encode(
        ['address', 'address', 'uint256'],
        [constants.AddressZero, await Dummy.getAddress(), parseEther('0.001')],
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

      const calculatedAddress = await Factory.connect(Dummy)['calculateDeployableAddress(string,bytes32,bytes)'](
        seed,
        MinimalKey,
        data,
      );

      expect(
        await Factory.connect(Dummy)['deploy(string,bytes32,bytes,bytes[])'](seed, MinimalKey, data, [], {
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

      const calculatedAddress = await Factory.connect(Dummy)['calculateDeployableAddress(string,bytes32,bytes)'](
        seed,
        MinimalKey,
        data,
      );

      expect(
        await Factory.connect(Dummy)['deploy(string,bytes32,bytes,bytes[])'](seed, MinimalKey, data, [], {
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

      const calculatedAddress = await Factory['calculateDeployableAddress(string,bytes32,bytes)'](
        seed,
        MinimalKey,
        data,
      );

      expect(
        await Factory['deploy(string,bytes32,bytes,bytes[])'](seed, MinimalKey, data, [], {
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

      const calculatedAddress = await Factory['calculateDeployableAddress(string,bytes32,bytes)'](
        seed,
        MinimalKey,
        data,
      );

      expect(
        await Factory['deploy(string,bytes32,bytes,bytes[])'](seed, MinimalKey, data, [mintCallData, ownerCallData], {
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

    it('should be accumulated price after deployed token', async () => {
      const seed = 'factorieth seed';

      const ABI = [
        'function initialize(string memory contractVersion, string memory tokenName, string memory tokenSymbol, uint8 tokenDecimals)',
        'function mintTo(address to, uint256 value)',
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

      const calculatedAddress = await Factory['calculateDeployableAddress(string,bytes32,bytes)'](
        seed,
        MinimalKey,
        data,
      );

      expect(
        await Factory['deploy(string,bytes32,bytes,bytes[])'](seed, MinimalKey, data, [], {
          value: parseEther('0.001'),
        }),
      )
        .to.emit(Factory, 'Deployed')
        .withArgs(calculatedAddress, await wallet.getAddress());

      expect(await Factory.getPrice(MinimalKey)).to.be.equal(
        parseEther('0.001').add(parseEther('0.001').div('10000').mul('30')),
      );
    });

    it('should be success with integrated smart contract', async () => {
      const StandardTokenTemplate = await ethers.getContractFactory(
        'contracts/templates/StandardToken.sol:StandardToken',
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

      expect(await Factory.addTemplate(StandardToken.address, constants.AddressZero, parseEther('0.001')))
        .to.emit(Factory, 'NewTemplate')
        .withArgs(key, StandardToken.address, parseEther('0.001'));

      const IntegrationSeedDeployer = await ethers.getContractFactory(
        'contracts/mocks/IntegrationMock.sol:IntegrationSeedMock',
        wallet,
      );
      const IntegrationSeed = await IntegrationSeedDeployer.deploy('seed', Factory.address, key);

      const ABI = [
        'function initialize(string memory contractVersion, string memory tokenName, string memory tokenSymbol, uint8 tokenDecimals)',
      ];
      const interfaces = new Interface(ABI);
      // const data = interfaces.encodeFunctionData('initialize', ['1', 'Sample', 'SAM', BigNumber.from('18')]);
      const calculatedAddr = await IntegrationSeed.calculateAddress('Sample', 'SAM');

      const price = Factory.getPrice(key);
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
});
