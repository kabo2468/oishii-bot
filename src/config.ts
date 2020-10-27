import fetch from 'node-fetch';
import { readFileSync } from 'fs';
import JSON5 from 'json5';

type Post = {
    [key: string]: number;
    autoPostInterval: number;
    tlPostProbability: number;
    rateLimitSec: number;
    rateLimitPost: number;
};

type JsonConfig = {
    [key: string]: string | boolean | number | Post;
    url: string;
    apiKey: string;
    databaseUrl: string;
    dbSSL: boolean;
    ownerUsername: string;
    post: Post;
};

export type Config = {
    wsUrl: string;
    apiUrl: string;
    apiKey: string;
    databaseUrl: string;
    dbSSL: boolean;
    userId: string;
    ownerId: string;
    post: Post;
    followings: number;
};

export default async function loadConfig(): Promise<Config> {
    const json = readFileSync('./config.json5', { encoding: 'utf-8' });
    const jsonConfig = JSON5.parse(json) as JsonConfig;
    if (jsonConfig.url.endsWith('/')) jsonConfig.url.slice(0, -1);
    if (jsonConfig.ownerUsername.startsWith('@')) jsonConfig.url.slice(1);

    const errors: string[] = [];
    const keys: JsonConfig = {
        apiKey: '',
        databaseUrl: '',
        dbSSL: false,
        ownerUsername: '',
        url: '',
        post: {
            autoPostInterval: 0,
            rateLimitPost: 0,
            rateLimitSec: 0,
            tlPostProbability: 0,
        },
    };
    for (const key of Object.keys(keys)) {
        const _v = jsonConfig[key];
        if (key === 'post') {
            for (const pKey of Object.keys(keys.post)) {
                if (jsonConfig.post[pKey]) continue;
                errors.push(`post.${pKey}`);
            }
        } else {
            if (typeof _v === 'boolean') {
                if (_v !== undefined) continue;
            } else {
                if (_v) continue;
            }
            errors.push(key);
        }
    }
    if (errors.length > 0) {
        for (const idx in errors) console.error(`[Config]: ${errors[idx]} is not set.`);
        process.exit(1);
    }

    const config = JSON.parse(JSON.stringify(jsonConfig)) as Config;

    const url = jsonConfig.url.endsWith('/') ? jsonConfig.url.slice(0, -1) : jsonConfig.url;

    const wsUrl = url.replace('http', 'ws');
    const apiUrl = url + '/api';
    const [userId, follows] = await fetch(`${apiUrl}/i`, {
        method: 'post',
        body: JSON.stringify({
            i: jsonConfig.apiKey,
        }),
        headers: { 'Content-Type': 'application/json' },
    })
        .then((res) => res.json())
        .then((json: Record<string, string>) => [json.id, json.followingCount]);
    const ownerId = await fetch(`${apiUrl}/users/show`, {
        method: 'post',
        body: JSON.stringify({
            i: jsonConfig.apiKey,
            username: jsonConfig.ownerUsername,
            host: null,
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
        ownerId,
        followings: Number(follows),
    };
}
