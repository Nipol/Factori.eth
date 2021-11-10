import { ethers } from 'hardhat';
import { Contract, BigNumber } from 'ethers';
import { keccak256, defaultAbiCoder, toUtf8Bytes, solidityPack, getCreate2Address } from 'ethers/lib/utils';

export const EIP712DOMAIN_TYPEHASH = keccak256(
  toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
);

export const PERMIT_TYPEHASH = keccak256(
  toUtf8Bytes('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)'),
);

export function getDomainSeparator(name: string, version: string, chainId: number, address: string) {
  return keccak256(
    defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [EIP712DOMAIN_TYPEHASH, keccak256(toUtf8Bytes(name)), keccak256(toUtf8Bytes(version)), chainId, address],
    ),
  );
}

export async function getApprovalDigest(
  chainId: number,
  token: Contract,
  approve: {
    owner: string;
    spender: string;
    value: BigNumber;
  },
  nonce: BigNumber,
  deadline: BigNumber,
): Promise<string> {
  // const name = await token.name();
  // const version = await token.version();
  const DOMAIN_SEPARATOR = await token.DOMAIN_SEPARATOR();
  // const DOMAIN_SEPARATOR = getDomainSeparator(name, version, chainId, token.address);
  return keccak256(
    solidityPack(
      ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
      [
        '0x19',
        '0x01',
        DOMAIN_SEPARATOR,
        keccak256(
          defaultAbiCoder.encode(
            ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
            [PERMIT_TYPEHASH, approve.owner, approve.spender, approve.value, nonce, deadline],
          ),
        ),
      ],
    ),
  );
}

export function getMinimalCode(address: string): string {
  return `0x363d3d373d3d3d363d73${address.substr(2).toLowerCase()}5af43d82803e903d91602b57fd5bf3`;
}

export async function latestTimestamp(): Promise<number> {
  return (await ethers.provider.getBlock('latest')).timestamp;
}

export function getCalcCreate(from: string, nonce: number): string {
  return ethers.utils.getContractAddress({ from, nonce });
}

export function getCalcCreate2(creatorAddress: string, saltHex: string, byteCode: string): string {
  const elements = ['ff', creatorAddress.slice(2), saltHex.slice(2), keccak256(byteCode).slice(2)];
  const hash = keccak256(`0x${elements.join('')}`);
  return `0x${hash.slice(2)}`;
}
