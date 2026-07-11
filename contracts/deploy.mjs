// BLOCKS — deploy 3 contracts on Base Mainnet (chain 8453):
//   BlocksRun     · run-results leaderboard (used by the live game)
//   BlocksSkin    · paid skin minting at 0.0000111 ETH (future shop)
//   BlocksDaily   · daily-challenge ranking (future daily-onchain feature)
//
// Run with: PRIVATE_KEY=0x... node deploy.mjs
// Writes deployed.json with all 3 addresses, ABIs, tx hashes, deploy block.

import solc from 'solc';
import fs from 'fs';
import { createPublicClient, createWalletClient, http, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('PRIVATE_KEY env var is required.');
  process.exit(1);
}

const FILES = [
  'src/BlocksRun.sol',
  'src/BlocksSkin.sol',
  'src/BlocksDaily.sol',
];

function compile(filename) {
  const source = fs.readFileSync(new URL(filename, import.meta.url), 'utf8');
  const input = {
    language: 'Solidity',
    sources: { [filename]: { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (output.errors?.some((e) => e.severity === 'error')) {
    output.errors.filter((e) => e.severity === 'error').forEach((e) => console.error(e.formattedMessage));
    process.exit(1);
  }
  const contracts = output.contracts[filename];
  const name = Object.keys(contracts).find((n) => contracts[n].evm.bytecode.object.length > 0);
  return {
    name,
    abi: contracts[name].abi,
    bytecode: '0x' + contracts[name].evm.bytecode.object,
  };
}

async function main() {
  const account = privateKeyToAccount(PRIVATE_KEY);
  const publicClient = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') });
  const walletClient = createWalletClient({ account, chain: base, transport: http('https://mainnet.base.org') });

  console.log('Deployer:', account.address);
  const balance = await publicClient.getBalance({ address: account.address });
  console.log('Balance: ', formatEther(balance), 'ETH');
  if (balance === 0n) {
    console.error('Deployer has no ETH on Base. Top up before deploying.');
    process.exit(1);
  }

  const deployedAt = new Date().toISOString();
  const startBlock = await publicClient.getBlockNumber();
  console.log('Start block:', startBlock.toString());

  const deployments = [];

  for (const file of FILES) {
    console.log('\nCompiling', file, '...');
    const c = compile(file);
    console.log('  Compiled:', c.name);

    console.log('Deploying', c.name, '...');
    const hash = await walletClient.deployContract({
      abi: c.abi,
      bytecode: c.bytecode,
      args: [],
    });
    console.log('  tx:', hash);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    const address = receipt.contractAddress;
    console.log('  ', c.name, '=>', address);
    console.log('  block:', receipt.blockNumber.toString(), '  gas:', receipt.gasUsed.toString());

    deployments.push({
      file,
      name: c.name,
      address,
      txHash: hash,
      block: receipt.blockNumber.toString(),
      gasUsed: receipt.gasUsed.toString(),
      abi: c.abi,
    });

    const balAfter = await publicClient.getBalance({ address: account.address });
    console.log('  balance left:', formatEther(balAfter), 'ETH');
  }

  const endBlock = await publicClient.getBlockNumber();
  const out = {
    network: 'base',
    chainId: 8453,
    deployer: account.address,
    deployedAt,
    deployBlockStart: startBlock.toString(),
    deployBlockEnd: endBlock.toString(),
    contracts: deployments,
  };
  fs.writeFileSync(new URL('deployed.json', import.meta.url), JSON.stringify(out, null, 2));
  console.log('\n✓ Wrote deployed.json');

  // Compact summary table
  console.log('\nSUMMARY');
  for (const d of deployments) {
    console.log(`  ${d.name.padEnd(14)} ${d.address}  (block ${d.block})`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
