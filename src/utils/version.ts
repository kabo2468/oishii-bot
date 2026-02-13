import { readFileSync } from 'node:fs';

export const botVersion: string = JSON.parse(
  readFileSync('package.json', { encoding: 'utf8' }),
).version;
