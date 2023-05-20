import { readFileSync } from 'fs';
import got from 'got';
import JSON5 from 'json5';
import { ClientConfig } from 'pg';

type Post = {
    [key: string]: number;
    autoPostInterval: number;
    tlPostProbability: number;
    rateLimitSec: number;
    rateLimitPost: number;
};

export type MecabType = {
    binPath: string;
    dicPath?: string;
};

type JsonConfig = {
    [key: string]: string | string[] | boolean | number | Post | MecabType | ClientConfig['ssl'];
    url: string;
    apiKey: string;
    databaseUrl: string;
    dbSSL: ClientConfig['ssl'];
    ownerUsernames: string[];
    post: Post;
    mecab: MecabType;
};

export type Config = {
    host: string;
    wsUrl: string;
    apiUrl: string;
    apiKey: string;
    databaseUrl: string;
    dbSSL: boolean;
    userId: string;
    ownerIds: string[];
    post: Post;
    followings: number;
    mecab: MecabType;
};

export default async function loadConfig(): Promise<Config> {
    const json = readFileSync('./config.json5', { encoding: 'utf-8' });
    const jsonConfig = JSON5.parse(json) as JsonConfig;
    jsonConfig.ownerUsernames.forEach((username) => {
        if (username.startsWith('@')) username.slice(1);
    });

    const errors: string[] = [];
    const keys: JsonConfig = {
        apiKey: '',
        databaseUrl: '',
        dbSSL: false,
        ownerUsernames: [''],
        url: '',
        post: {
            autoPostInterval: 0,
            rateLimitPost: 0,
            rateLimitSec: 0,
            tlPostProbability: 0,
        },
        mecab: {
            binPath: '',
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
            } else if (Array.isArray(_v)) {
                if (_v.length) continue;
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

    const api = async (endpoint: string, data: Record<string, unknown>): Promise<Record<string, string>> => {
        return await got
            .post(`${apiUrl}/${endpoint}`, {
                json: {
                    i: jsonConfig.apiKey,
                    ...data,
                },
            })
            .json<Record<string, string>>();
    };

    const [userId, follows] = await api('i', {}).then((json) => [json.id, json.followingCount]);
    const getOwners = Array.from(jsonConfig.ownerUsernames, async (username) => {
        return await api('users/show', {
            username,
            host: null,
        }).then((json) => json.id);
    });
    const ownerIds = await Promise.all(getOwners);

    return {
        host: url,
        apiKey: config.apiKey,
        apiUrl,
        wsUrl,
        databaseUrl: config.databaseUrl,
        dbSSL: config.dbSSL,
        userId,
        ownerIds,
        post: config.post,
        followings: Number(follows),
        mecab: config.mecab,
    };
}
