import { readFileSync } from 'fs';

export const botVersion: string = JSON.parse(readFileSync('package.json', { encoding: 'utf8' })).version;
