// Compile-check all contracts without deploying — used by CI.
// Exits non-zero if solc reports any error.

import solc from 'solc';
import fs from 'fs';

const FILES = [
  'src/BlocksRun.sol',
  'src/BlocksSkin.sol',
  'src/BlocksDaily.sol',
];

let failed = false;

for (const file of FILES) {
  const input = {
    language: 'Solidity',
    sources: { [file]: { content: fs.readFileSync(new URL(file, import.meta.url), 'utf8') } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { '*': { '*': ['abi'] } },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (output.errors ?? []).filter((e) => e.severity === 'error');
  if (errors.length) {
    failed = true;
    for (const e of errors) console.error(e.formattedMessage);
  } else {
    console.log(`ok ${file}`);
  }
}

process.exit(failed ? 1 : 0);
