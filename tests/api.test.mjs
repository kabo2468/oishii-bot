import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import loadConfig from '../built/config.js';
import API from '../built/misskey/api.js';

const requests = [];
const server = createServer(async (request, response) => {
  let body = '';
  for await (const chunk of request) body += chunk;
  requests.push({
    url: request.url,
    headers: request.headers,
    body: JSON.parse(body),
  });
  response.setHeader('Content-Type', 'application/json');
  if (request.url === '/api/error') {
    response.writeHead(403).end('{"error":"denied"}');
  } else if (request.url === '/api/empty') {
    response.writeHead(204).end();
  } else if (request.url === '/api/invalid') {
    response.end('invalid json');
  } else if (request.url === '/api/users/show') {
    response.end('{"id":"owner"}');
  } else if (request.url === '/api/notes/create') {
    response.end('{"createdNote":{"id":"note"}}');
  } else {
    response.end('{"id":"bot","followingCount":3}');
  }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
after(() => new Promise((resolve) => server.close(resolve)));

const config = {
  apiUrl: `http://127.0.0.1:${server.address().port}/api`,
  apiKey: 'test-token',
};
const api = new API({ config });

test('API keeps JSON responses, credentials, and headers', async () => {
  assert.deepEqual(await api.call('i', { i: 'override' }), {
    body: { id: 'bot', followingCount: 3 },
    ok: true,
  });
  const request = requests.at(-1);
  assert.deepEqual(request.body, { i: 'test-token' });
  assert.equal(request.headers['content-type'], 'application/json');
  assert.match(request.headers['user-agent'], /^oishii-bot\//);
});

test('API accepts empty success responses', async () => {
  assert.deepEqual(await api.call('empty'), { body: '', ok: true });
});

test('API rejects HTTP errors, malformed JSON, and request failures', async (t) => {
  const log = t.mock.method(console, 'error', () => {});
  await assert.rejects(api.call('error'), /Misskey API error: HTTP 403/);
  await assert.rejects(api.call('invalid'), SyntaxError);
  const invalid = new API({ config: { ...config, apiUrl: 'invalid-url' } });
  await assert.rejects(invalid.call('i'), TypeError);
  assert.equal(log.mock.callCount(), 3);
});

test('configuration loads the account and owners through the API', async () => {
  const cwd = process.cwd();
  const dir = await mkdtemp(join(tmpdir(), 'oishii-config-'));
  try {
    await writeFile(
      join(dir, 'config.json5'),
      JSON.stringify({
        ...config,
        apiUrl: `${config.apiUrl}/`,
        url: 'https://example.com/',
        databaseUrl: 'postgresql://localhost/test',
        dbSSL: false,
        ownerUsernames: ['@owner'],
        post: {
          autoPostInterval: 60,
          tlPostProbability: 0.4,
          rateLimitSec: 60,
          rateLimitPost: 5,
        },
        mecab: { binPath: 'mecab' },
        denyRoleIds: ['role'],
      }),
    );
    process.chdir(dir);
    const loaded = await loadConfig();
    assert.equal(loaded.userId, 'bot');
    assert.equal(loaded.followings, 3);
    assert.deepEqual(loaded.ownerIds, ['owner']);
    assert.equal(loaded.apiUrl, config.apiUrl);
    assert.deepEqual(requests.at(-1).body, {
      username: 'owner',
      host: null,
      i: 'test-token',
    });
  } finally {
    process.chdir(cwd);
    await rm(dir, { recursive: true, force: true });
  }
});

test('reversi worker posts its result with the shared API', {
  timeout: 10000,
}, async (t) => {
  const child = fork(
    new URL('../built/modules/reversi/back.js', import.meta.url),
    [],
    {
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    },
  );
  t.after(() => child.kill());
  const exited = once(child, 'exit');
  child.send({
    type: 'init',
    body: {
      config: { ...config, userId: 'bot' },
      game: { id: 'game', user1Id: 'bot', user2: { username: 'opponent' } },
    },
  });
  child.send({ type: 'ended', body: {} });
  assert.deepEqual(await exited, [0, null]);
  const request = requests.at(-1);
  assert.equal(request.url, '/api/notes/create');
  assert.equal(request.body.i, 'test-token');
  assert.equal(request.body.visibility, 'home');
  assert.match(request.body.text, /@opponent/);
});
