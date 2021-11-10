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

const chainIds = {
  eth: 1,
  ropsten: 3,
  rinkeby: 4,
  goerli: 5,
  kovan: 42,
  hardhat: 31337,
};

const mnemonic: string | undefined = process.env.MNEMONIC;
if (!mnemonic) {
  throw new Error('Please set your MNEMONIC in a .env file');
}

const rivetKey: string | undefined = process.env.RIVET_KEY;
if (!rivetKey) {
  throw new Error('Please set your RIVET_KEY in a .env file');
}

// "m/44'/1'/0'/0"
// "test test test test test test test test test test test junk"
// const accounts = [
//   {
//     //0x22310Bf73bC88ae2D2c9a29Bd87bC38FBAc9e6b0
//     privateKey: '0x7c299dda7c704f9d474b6ca5d7fee0b490c8decca493b5764541fe5ec6b65114',
//     balance: '10000000000000000000000',
//   },
//   {
//     //0x5AEC774E6ae749DBB17A2EBA03648207A5bd7dDd
//     privateKey: '0x50064dccbc8b9d9153e340ee2759b0fc4936ffe70cb451dad5563754d33c34a8',
//     balance: '10000000000000000000000',
//   },
//   {
//     //0xb6857B2E965cFc4B7394c52df05F5E93a9e4e0Dd
//     privateKey: '0x95c674cabc4b9885d930d2c0f592fdde8dc24b4e6a43ae05c6ada58edb9f54ae',
//     balance: '10000000000000000000000',
//   },
//   {
//     //0x2E1eD4eEd20c338378800d8383a54E3329957c3d
//     privateKey: '0x24af27ccb29738cdaba736d8e35cb4d43ace56e1c83389f48feb746b38cf2a05',
//     balance: '10000000000000000000000',
//   },
//   {
//     //0x7DC241C040A66542139890Ff7872824f5440aFD3
//     privateKey: '0xb21deff810a52cded6c3f9a0f57184f1c70ff08cc3097bec420aa39c7693ed8c',
//     balance: '10000000000000000000000',
//   },
// ];

function getChainConfig(network: keyof typeof chainIds, mainnet = false): NetworkUserConfig {
  const url: string = 'https://' + rivetKey + '.' + network + '.rpc.rivet.cloud/';
  return {
    accounts: {
      count: 10,
      mnemonic,
      path: mainnet ? "m/44'/60'/0'/0" : "m/44'/1'/0'/0",
    },
    chainId: chainIds[network],
    url,
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
    kovan: getChainConfig('kovan'),
    rinkeby: getChainConfig('rinkeby'),
    ropsten: getChainConfig('ropsten'),
    mainnet: getChainConfig('eth', true),
  },

  solidity: {
    version: '0.8.9',
    settings: {
      optimizer: {
        enabled: true,
        runs: 999999999,
        details: {
          yul: true,
        },
      },
    },
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

  mocha: {
    timeout: 0,
  },
};

export default config;
