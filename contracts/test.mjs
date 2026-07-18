// Contract invariant tests for the three BLOCKS contracts.
//
// Each contract is compiled with solc and deployed into an in-memory EVM
// (@ethereumjs/vm), then exercised through real calls — no live network,
// no anvil, so it runs anywhere `npm run check` runs.
//
// Run: npm test  (exits non-zero on the first failed assertion)

import solc from 'solc';
import fs from 'fs';
import { VM } from '@ethereumjs/vm';
import { Account, Address, hexToBytes, bytesToHex } from '@ethereumjs/util';
import {
  encodeFunctionData,
  decodeFunctionResult,
  parseEther,
} from 'viem';

// --- tiny test harness ------------------------------------------------------

let passed = 0;
let failed = 0;

function eq(actual, expected, label) {
  if (actual === expected) {
    passed++;
    console.log(`  ok   ${label}`);
  } else {
    failed++;
    console.error(`  FAIL ${label}\n         expected ${expected}\n         got      ${actual}`);
  }
}

function ok(cond, label) {
  eq(Boolean(cond), true, label);
}

// --- solc compile (abi + bytecode) -----------------------------------------

function compile(file, contractName) {
  const input = {
    language: 'Solidity',
    sources: { [file]: { content: fs.readFileSync(new URL(file, import.meta.url), 'utf8') } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
    },
  };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (out.errors ?? []).filter((e) => e.severity === 'error');
  if (errors.length) {
    for (const e of errors) console.error(e.formattedMessage);
    throw new Error(`compile failed: ${file}`);
  }
  const c = out.contracts[file][contractName];
  return { abi: c.abi, bytecode: '0x' + c.evm.bytecode.object };
}

// --- minimal EVM deploy / call helpers -------------------------------------

const SENDER = new Address(hexToBytes('0x1111111111111111111111111111111111111111'));
const OTHER = new Address(hexToBytes('0x2222222222222222222222222222222222222222'));

async function makeVm() {
  const vm = await VM.create();
  // fund both test accounts (getAccount returns undefined for fresh accounts)
  for (const a of [SENDER, OTHER]) {
    const acct = (await vm.stateManager.getAccount(a)) ?? new Account();
    acct.balance = parseEther('100');
    await vm.stateManager.putAccount(a, acct);
  }
  return vm;
}

async function deploy(vm, bytecode, from = SENDER) {
  // runCall with no `to` runs the init code and creates the contract — no
  // signed tx needed, which keeps the harness free of key management.
  const res = await vm.evm.runCall({
    caller: from,
    to: undefined,
    gasLimit: 6_000_000n,
    data: hexToBytes(bytecode),
  });
  if (res.execResult.exceptionError) throw res.execResult.exceptionError;
  return new Address(res.createdAddress.bytes);
}

async function call(vm, to, abi, functionName, args = [], { from = SENDER, value = 0n } = {}) {
  const data = encodeFunctionData({ abi, functionName, args });
  const res = await vm.evm.runCall({
    caller: from,
    to,
    gasLimit: 3_000_000n,
    value,
    data: hexToBytes(data),
  });
  return res;
}

async function read(vm, to, abi, functionName, args = [], opts = {}) {
  const res = await call(vm, to, abi, functionName, args, opts);
  if (res.execResult.exceptionError) throw res.execResult.exceptionError;
  const ret = bytesToHex(res.execResult.returnValue);
  return decodeFunctionResult({ abi, functionName, data: ret });
}

function reverted(res) {
  return Boolean(res.execResult.exceptionError);
}

// --- BlocksRun --------------------------------------------------------------

async function testBlocksRun() {
  console.log('BlocksRun');
  const { abi, bytecode } = compile('src/BlocksRun.sol', 'BlocksRun');
  const vm = await makeVm();
  const c = await deploy(vm, bytecode);

  await call(vm, c, abi, 'recordRun', [100n, 5000n, 3]);
  eq(await read(vm, c, abi, 'bestScore', [SENDER.toString()]), 100n, 'first score stored');

  // best score only moves up
  await call(vm, c, abi, 'recordRun', [40n, 4000n, 3]);
  eq(await read(vm, c, abi, 'bestScore', [SENDER.toString()]), 100n, 'lower score ignored');
  await call(vm, c, abi, 'recordRun', [250n, 4000n, 3]);
  eq(await read(vm, c, abi, 'bestScore', [SENDER.toString()]), 250n, 'higher score wins');

  // best time only counts full clears (>=16)
  eq(await read(vm, c, abi, 'bestTime', [SENDER.toString()]), 0n, 'no time before a full clear');
  await call(vm, c, abi, 'recordRun', [10n, 9000n, 16]);
  eq(await read(vm, c, abi, 'bestTime', [SENDER.toString()]), 9000n, 'full clear sets time');
  await call(vm, c, abi, 'recordRun', [10n, 12000n, 16]);
  eq(await read(vm, c, abi, 'bestTime', [SENDER.toString()]), 9000n, 'slower full clear ignored');
  await call(vm, c, abi, 'recordRun', [10n, 7000n, 16]);
  eq(await read(vm, c, abi, 'bestTime', [SENDER.toString()]), 7000n, 'faster full clear wins');

  // partial clear never touches time even if faster
  await call(vm, c, abi, 'recordRun', [10n, 1n, 15]);
  eq(await read(vm, c, abi, 'bestTime', [SENDER.toString()]), 7000n, 'partial clear cannot set time');

  // per-player isolation
  eq(await read(vm, c, abi, 'bestScore', [OTHER.toString()]), 0n, 'other player starts empty');
}

// --- BlocksDaily ------------------------------------------------------------

async function testBlocksDaily() {
  console.log('BlocksDaily');
  const { abi, bytecode } = compile('src/BlocksDaily.sol', 'BlocksDaily');
  const vm = await makeVm();
  const c = await deploy(vm, bytecode);

  const D1 = 20260517;
  const D2 = 20260518;

  await call(vm, c, abi, 'recordDailyRun', [D1, 80n, 3000n, false]);
  eq(await read(vm, c, abi, 'bestScore', [D1, SENDER.toString()]), 80n, 'day1 score stored');
  eq(await read(vm, c, abi, 'bestTime', [D1, SENDER.toString()]), 0n, 'uncleared run leaves time at 0');

  await call(vm, c, abi, 'recordDailyRun', [D1, 200n, 2500n, true]);
  eq(await read(vm, c, abi, 'bestScore', [D1, SENDER.toString()]), 200n, 'day1 score raised');
  eq(await read(vm, c, abi, 'bestTime', [D1, SENDER.toString()]), 2500n, 'cleared run sets time');

  // days are independent buckets
  eq(await read(vm, c, abi, 'bestScore', [D2, SENDER.toString()]), 0n, 'day2 independent from day1');
  await call(vm, c, abi, 'recordDailyRun', [D2, 5n, 999n, true]);
  eq(await read(vm, c, abi, 'bestScore', [D1, SENDER.toString()]), 200n, 'day2 write does not touch day1');
}

// --- BlocksSkin -------------------------------------------------------------

async function testBlocksSkin() {
  console.log('BlocksSkin');
  const { abi, bytecode } = compile('src/BlocksSkin.sol', 'BlocksSkin');
  const vm = await makeVm();
  const c = await deploy(vm, bytecode); // SENDER is owner

  const PRICE = await read(vm, c, abi, 'PRICE', []);
  eq(PRICE, 11100000000000n, 'PRICE constant is 0.0000111 ether');

  // wrong price reverts
  ok(reverted(await call(vm, c, abi, 'mintSkin', [1], { value: PRICE + 1n })), 'wrong price reverts');
  eq(await read(vm, c, abi, 'isOwned', [SENDER.toString(), 1]), false, 'no skin after failed mint');

  // valid mint
  await call(vm, c, abi, 'mintSkin', [1], { value: PRICE });
  eq(await read(vm, c, abi, 'isOwned', [SENDER.toString(), 1]), true, 'skin 1 owned after paid mint');

  // double mint of same skin reverts
  ok(reverted(await call(vm, c, abi, 'mintSkin', [1], { value: PRICE })), 're-mint same skin reverts');

  // id 0 and id >= SKIN_COUNT(8) are invalid — valid range is 1..7
  ok(reverted(await call(vm, c, abi, 'mintSkin', [0], { value: PRICE })), 'skin id 0 invalid');
  ok(reverted(await call(vm, c, abi, 'mintSkin', [8], { value: PRICE })), 'skin id 8 invalid (range is 1..7)');
  await call(vm, c, abi, 'mintSkin', [7], { value: PRICE });
  eq(await read(vm, c, abi, 'isOwned', [SENDER.toString(), 7]), true, 'top valid skin id 7 mints');

  // ownedMask reflects owned ids 1 and 7 => bits 1 and 7 set
  const mask = await read(vm, c, abi, 'ownedMask', [SENDER.toString()]);
  eq(mask, (1n << 1n) | (1n << 7n), 'ownedMask has bits 1 and 7 set');

  // only owner withdraws
  ok(reverted(await call(vm, c, abi, 'withdraw', [OTHER.toString()], { from: OTHER })), 'non-owner withdraw reverts');
  ok(reverted(await call(vm, c, abi, 'transferOwnership', [OTHER.toString()], { from: OTHER })), 'non-owner transferOwnership reverts');
}

// --- runner -----------------------------------------------------------------

const suites = [testBlocksRun, testBlocksDaily, testBlocksSkin];

for (const suite of suites) {
  try {
    await suite();
  } catch (err) {
    failed++;
    console.error(`  FAIL ${suite.name} threw: ${err?.message ?? err}`);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
