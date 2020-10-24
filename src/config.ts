import fetch from 'node-fetch';
import { readFileSync } from 'fs';

type JsonConfig = {
    [key: string]: string | boolean | number;
    url: string;
    apiKey: string;
    databaseUrl: string;
    dbSSL: boolean;
    ownerUsername: string;
    autoPostInterval: number;
};

export type Config = {
    wsUrl: string;
    apiUrl: string;
    apiKey: string;
    databaseUrl: string;
    dbSSL: boolean;
    userId: string;
    ownerUsername: string;
    autoPostInterval: number;
};

export default async function loadConfig(): Promise<Config> {
    const json = readFileSync('./config.json', { encoding: 'utf-8' });
    const jsonConfig = JSON.parse(json) as JsonConfig;
    if (jsonConfig.url.endsWith('/')) jsonConfig.url.slice(0, -1);
    if (jsonConfig.ownerUsername.startsWith('@')) jsonConfig.url.slice(1);

    const errors: string[] = [];
    const keys: JsonConfig = {
        apiKey: '',
        autoPostInterval: 0,
        databaseUrl: '',
        dbSSL: false,
        ownerUsername: '',
        url: '',
    };
    for (const key of Object.keys(keys)) {
        const _v = jsonConfig[key];
        if (typeof _v === 'boolean') {
            if (_v !== undefined) continue;
        } else {
            if (_v) continue;
        }
        errors.push(key);
    }
    if (errors.length > 0) {
        for (const idx in errors) console.error(`[Config]: ${errors[idx]} is not set.`);
        process.exit(1);
    }

    const config = JSON.parse(JSON.stringify(jsonConfig)) as Config;

    const url = jsonConfig.url.endsWith('/') ? jsonConfig.url.slice(0, -1) : jsonConfig.url;

    const wsUrl = url.replace('http', 'ws');
    const apiUrl = url + '/api';
    const userId = await fetch(`${apiUrl}/i`, {
        method: 'post',
        body: JSON.stringify({
            i: jsonConfig.apiKey,
        }),
        headers: { 'Content-Type': 'application/json' },
    })
        .then((res) => res.json())
        .then((json: Record<string, string>) => json.id);

    return {
        ...config,
        wsUrl,
        apiUrl,
        userId,
    };
}
