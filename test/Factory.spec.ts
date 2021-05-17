import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Contract, BigNumber, constants, Signer, ContractFactory } from 'ethers';
import { keccak256, defaultAbiCoder, parseEther, Interface } from 'ethers/lib/utils';

describe('Factory', () => {
  let Factory: Contract;

  let wallet: Signer;
  let Dummy: Signer;

  beforeEach(async () => {
    const accounts = await ethers.getSigners();
    [wallet, Dummy] = accounts;

    const FactoryDeployer = await ethers.getContractFactory('contracts/FactoryV1.sol:FactoryV1', wallet);
    Factory = await FactoryDeployer.deploy(constants.AddressZero);

    await Factory.deployed();
  });

  describe('#addTemplate()', () => {
    it('should be success add Template', async () => {
      const StandardTokenTemplate = await ethers.getContractFactory(
        'contracts/StandardToken.sol:StandardToken',
        wallet,
      );
      const StandardToken = await StandardTokenTemplate.deploy();
      const contractVersion = '1';
      const tokenName = 'template';
      const tokenSymbol = 'TEMP';
      const tokenDecimals = BigNumber.from('18');
      await StandardToken.deployed();
      await StandardToken.initialize(contractVersion, tokenName, tokenSymbol, tokenDecimals);

      const key = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [StandardToken.address, '0']));

      expect(await Factory.addTemplate(StandardToken.address, parseEther('0.001')))
        .to.emit(Factory, 'NewTemplate')
        .withArgs(key, StandardToken.address, parseEther('0.001'));
    });
  });

  describe('#deploy()', () => {
    let StandardToken: Contract;
    let StandardTokenTemplate: ContractFactory;

    beforeEach(async () => {
      StandardTokenTemplate = await ethers.getContractFactory('contracts/StandardToken.sol:StandardToken', wallet);
      StandardToken = await StandardTokenTemplate.deploy();
      const contractVersion = '1';
      const tokenName = 'template';
      const tokenSymbol = 'TEMP';
      const tokenDecimals = BigNumber.from('18');
      await StandardToken.deployed();
      await StandardToken.initialize(contractVersion, tokenName, tokenSymbol, tokenDecimals);

      const key = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [StandardToken.address, '0']));

      await Factory.addTemplate(StandardToken.address, parseEther('0.001'));
    });

    it('should be success making new token contract', async () => {
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

      const key = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [StandardToken.address, '0']));

      const calculatedAddress = await Factory.calculateDeployableAddress(key, data);

      expect(await Factory.deploy(key, data, { value: parseEther('0.001') }))
        .to.emit(Factory, 'Deployed')
        .withArgs(calculatedAddress, await wallet.getAddress());

      const DeployedToken = await StandardTokenTemplate.attach(calculatedAddress);

      expect(await DeployedToken.symbol()).to.equal(tokenSymbol);
      expect(await DeployedToken.name()).to.equal(tokenName);
      expect(await DeployedToken.decimals()).to.equal(tokenDecimals);
    });
  });

  describe('#deployWithCall()', () => {
    let StandardToken: Contract;
    let StandardTokenTemplate: ContractFactory;

    beforeEach(async () => {
      StandardTokenTemplate = await ethers.getContractFactory('contracts/StandardToken.sol:StandardToken', wallet);
      StandardToken = await StandardTokenTemplate.deploy();
      const contractVersion = '1';
      const tokenName = 'template';
      const tokenSymbol = 'TEMP';
      const tokenDecimals = BigNumber.from('18');
      await StandardToken.deployed();
      await StandardToken.initialize(contractVersion, tokenName, tokenSymbol, tokenDecimals);

      const key = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [StandardToken.address, '0']));

      await Factory.addTemplate(StandardToken.address, parseEther('0.001'));
    });

    it('should be success making new token contract with call', async () => {
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

      const initialToken = BigNumber.from('100000000000000000000');

      const callData = interfaces.encodeFunctionData('mintTo', [await wallet.getAddress(), initialToken]);

      const key = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [StandardToken.address, '0']));

      const calculatedAddress = await Factory.calculateDeployableAddress(key, data);

      expect(await Factory.deployWithCall(key, data, callData, { value: parseEther('0.001') }))
        .to.emit(Factory, 'Deployed')
        .withArgs(calculatedAddress, await wallet.getAddress());
      // .to.emit(StandardToken, 'Transfer')
      // .withArgs(constants.AddressZero, await wallet.getAddress(), initialToken);

      const DeployedToken = await StandardTokenTemplate.attach(calculatedAddress);

      expect(await DeployedToken.symbol()).to.equal(tokenSymbol);
      expect(await DeployedToken.name()).to.equal(tokenName);
      expect(await DeployedToken.decimals()).to.equal(tokenDecimals);
      expect(await DeployedToken.balanceOf(await wallet.getAddress())).to.equal(initialToken);
    });
  });

  describe('#deployWithCalls()', () => {
    let StandardToken: Contract;
    let StandardTokenTemplate: ContractFactory;

    beforeEach(async () => {
      StandardTokenTemplate = await ethers.getContractFactory('contracts/StandardToken.sol:StandardToken', wallet);
      StandardToken = await StandardTokenTemplate.deploy();
      const contractVersion = '1';
      const tokenName = 'template';
      const tokenSymbol = 'TEMP';
      const tokenDecimals = BigNumber.from('18');
      await StandardToken.deployed();
      await StandardToken.initialize(contractVersion, tokenName, tokenSymbol, tokenDecimals);

      const key = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [StandardToken.address, '0']));

      await Factory.addTemplate(StandardToken.address, parseEther('0.001'));
    });

    it('should be success making new token contract with call', async () => {
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

      const initialToken = BigNumber.from('100000000000000000000');

      const callData = interfaces.encodeFunctionData('mintTo', [await wallet.getAddress(), initialToken]);

      const key = keccak256(defaultAbiCoder.encode(['address', 'uint256'], [StandardToken.address, '0']));

      const calculatedAddress = await Factory.calculateDeployableAddress(key, data);

      expect(await Factory.deployWithCalls(key, data, [callData], { value: parseEther('0.001') }))
        .to.emit(Factory, 'Deployed')
        .withArgs(calculatedAddress, await wallet.getAddress());
      // .to.emit(StandardToken, 'Transfer')
      // .withArgs(constants.AddressZero, await wallet.getAddress(), initialToken);

      const DeployedToken = await StandardTokenTemplate.attach(calculatedAddress);

      expect(await DeployedToken.symbol()).to.equal(tokenSymbol);
      expect(await DeployedToken.name()).to.equal(tokenName);
      expect(await DeployedToken.decimals()).to.equal(tokenDecimals);
      expect(await DeployedToken.balanceOf(await wallet.getAddress())).to.equal(initialToken);
    });
  });
});
