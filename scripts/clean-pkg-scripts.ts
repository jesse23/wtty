#!/usr/bin/env bun

import fs from 'node:fs';

const PKG_PATH = 'package.json';
const original = fs.readFileSync(PKG_PATH, 'utf8');

const restore = () => {
  try {
    fs.writeFileSync(PKG_PATH, original);
  } catch {}
};

process.on('exit', restore);
process.on('SIGINT', () => {
  restore();
  process.exit(1);
});
process.on('SIGTERM', () => {
  restore();
  process.exit(1);
});

const pkg = JSON.parse(original);

delete pkg.scripts;
delete pkg.devDependencies;

fs.writeFileSync(PKG_PATH, `${JSON.stringify(pkg, null, 2)}\n`);
