import { task } from 'hardhat/config';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-solhint';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import 'hardhat-deploy';

import { resolve } from 'path';

import { config as dotenvConfig } from 'dotenv';
import { HardhatUserConfig } from 'hardhat/config';
import { NetworkUserConfig } from 'hardhat/types';

if (process.env.NODE_ENV === 'production') {
  dotenvConfig({ path: resolve(__dirname, './.env.production') });
} else {
  dotenvConfig({ path: resolve(__dirname, './.env.development') });
}

task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log('address: ' + (await account.getAddress()));
  }
});

const providers = {
  rivet: 1,
  infura: 2,
};

const chainIds = {
  eth: 1,
  ropsten: 3,
  rinkeby: 4,
  goerli: 5,
  kovan: 42,
  optimism: 10,
  'optimism-kovan': 69,
  hardhat: 31337,
};

const mnemonic: string | undefined = process.env.MNEMONIC;
if (!mnemonic) {
  throw new Error('Please set your MNEMONIC in a .env file');
}

const infuraKey: string | undefined = process.env.INFURA_KEY;
if (!infuraKey) {
  throw new Error('Please set your INFURA_KEY in a .env file');
}

const rivetKey: string | undefined = process.env.RIVET_KEY;
if (!rivetKey) {
  throw new Error('Please set your RIVET_KEY in a .env file');
}

function getInfuraConfig(network: keyof typeof chainIds, mainnet = false): NetworkUserConfig {
  const url: string = `https://${network}.infura.io/v3/${infuraKey}`;
  return {
    accounts: {
      count: 10,
      mnemonic,
      path: mainnet ? "m/44'/60'/0'/0" : "m/44'/1'/0'/0",
    },
    chainId: chainIds[network],
    deploy: ['deploy_l1'],
    url,
  };
}

function getChainConfig(network: keyof typeof chainIds, mainnet = false): NetworkUserConfig {
  const url: string = 'https://' + rivetKey + '.' + network + '.rpc.rivet.cloud/';
  return {
    accounts: {
      count: 10,
      mnemonic,
      path: mainnet ? "m/44'/60'/0'/0" : "m/44'/1'/0'/0",
    },
    chainId: chainIds[network],
    deploy: ['deploy_l1'],
    url,
  };
}

function getOptimismConfig(network: keyof typeof chainIds, mainnet = false): NetworkUserConfig {
  // const url: string = `https://${mainnet ? `mainnet` : `kovan`}.optimism.io/`;
  const url: string = `https://${network}.infura.io/v3/${infuraKey}`;
  return {
    accounts: {
      count: 10,
      mnemonic,
      path: mainnet ? "m/44'/60'/0'/0" : "m/44'/1'/0'/0",
    },
    chainId: chainIds[network],
    deploy: ['deploy_l2'],
    url,
    companionNetworks: {
      l1: 'kovan',
    },
  };
}

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',

  namedAccounts: {
    deployer: 0,
  },

  gasReporter: {
    currency: 'USD',
    enabled: true,
    excludeContracts: [],
    src: './contracts',
  },

  networks: {
    hardhat: {
      initialBaseFeePerGas: 0,
      accounts: {
        mnemonic,
        path: "m/44'/1'/0'/0",
      },
      chainId: chainIds.hardhat,
    },
    coverage: {
      url: 'http://localhost:8555',
    },
    goerli: getChainConfig('goerli'),
    kovan: getInfuraConfig('kovan'),
    rinkeby: getChainConfig('rinkeby'),
    ropsten: getChainConfig('ropsten'),
    mainnet: getChainConfig('eth', true),
    'optimism-kovan': getOptimismConfig('optimism-kovan'),
  },

  solidity: {
    compilers: [
      {
        version: '0.8.11',
        settings: {
          optimizer: {
            enabled: true,
            runs: 42069,
            details: {
              yul: true,
            },
          },
        },
      },
    ],
  },

  external: {
    contracts: [
      {
        artifacts: 'node_modules/@beandao/contracts/build/contracts',
      },
      {
        artifacts: 'node_modules/@beandao/contracts/build/contracts',
      },
    ],
    deployments: {},
  },

  paths: {
    deploy: 'deploy',
    deployments: 'deployments',
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },

  etherscan: {
    apiKey: '',
  },

  mocha: {
    timeout: 0,
  },
};

export default config;
