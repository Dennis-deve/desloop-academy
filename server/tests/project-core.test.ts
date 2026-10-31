import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { PNG } from 'pngjs';
import { buildApi } from '../src/api.js';
import { loadConfig } from '../src/config.js';
import { loadCatalog } from '../src/catalog.js';
import { createDatabase, migrate } from '../src/db.js';
import { migrateGuardianGroundwork } from '../src/guardian/readiness.js';
import { migrateProjectCore, verifyProjectCore } from '../src/project-core/migrate.js';
import { normalizeDocument, normalizePng, sha256 } from '../src/project-core/contract.js';
import { hexHash } from '../src/security.js';

const origin = 'http://127.0.0.1:5173';
const base = '/api/pilot/project-core/v1';
const databaseUrl = process.env.PROJECT_CORE_TEST_DATABASE_URL;
const catalog = loadCatalog();
type Actor = { id: string; cookie: string; csrf: string };

function tinyPng(color = 32) {
  const png = new PNG({ width: 2, height: 2 });
  png.data.fill(color);
  return PNG.sync.write(png);
}

function crc32(bytes: Buffer) {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ -1) >>> 0;
}
function addMetadata(original: Buffer) {
  const text = Buffer.from('Description\0private synthetic note');
  const body = Buffer.concat([Buffer.from('tEXt'), text]);
  const chunk = Buffer.alloc(body.length + 8);
  chunk.writeUInt32BE(text.length, 0);
  body.copy(chunk, 4);
  chunk.writeUInt32BE(crc32(body), chunk.length - 4);
  // IHDR has an exact 25-byte chunk following the eight-byte PNG signature.
  return Buffer.concat([original.subarray(0, 33), chunk, original.subarray(33)]);
}

// A test with a DB must never point at Railway, a normal developer DB or a named live environment.
if (databaseUrl) {
  const parsed = new URL(databaseUrl);
  if (parsed.hostname !== '127.0.0.1' ||
      !parsed.pathname.startsWith('/desloop_project_core_disposable_'))
    throw new Error('Project-core integration test requires a distinct disposable loopback DB named desloop_project_core_disposable_*');
}

test('project-core data and PNG validators are bounded and reject unsafe inputs', () => {
  const a = normalizeDocument({ zebra: [3, { two: true }], alpha: 'sample' });
  const b = normalizeDocument({ alpha: 'sample', zebra: [3, { two: true }] });
  assert.equal(a.canonical, b.canonical);
  assert.deepEqual(JSON.parse(a.canonical), { alpha: 'sample', zebra: [3, { two: true }] });
  for (const document of [[], null, { a: undefined }, { a: () => 1 }, { a: 'a'.repeat(2001) },
    { nested: JSON.parse('{"__proto__":{"admin":true}}') }, { x: 'x'.repeat(16500) }]) {
    assert.throws(() => normalizeDocument(document));
  }
  const original = tinyPng();
  const normalized = normalizePng(original.toString('base64'), sha256(original));
  assert.equal(normalized.width, 2);
  assert.equal(normalized.height, 2);
  assert.deepEqual(PNG.sync.read(normalized.content).data, PNG.sync.read(original).data);
  assert.equal(normalized.contentSha256, sha256(normalized.content));
  const withMetadata = addMetadata(original);
  const scrubbed = normalizePng(withMetadata.toString('base64'), sha256(withMetadata));
  assert.notEqual(scrubbed.sourceSha256, scrubbed.contentSha256);
  assert.equal(scrubbed.content.includes(Buffer.from('private synthetic note')), false);
  assert.deepEqual(PNG.sync.read(scrubbed.content).data, PNG.sync.read(original).data);
  assert.throws(() => normalizePng(original.toString('base64'), sha256('different')));
  assert.throws(() => normalizePng('<script>alert(1)</script>', sha256('different')));
  const badCrc = Buffer.from(original);
  badCrc[badCrc.length - 5] ^= 1;
  assert.throws(() => normalizePng(badCrc.toString('base64'), sha256(badCrc)));
  const oversizedHeader = Buffer.from(original);
  oversizedHeader.writeUInt32BE(4096, 16);
  assert.throws(() => normalizePng(oversizedHeader.toString('base64'), sha256(oversizedHeader)));
});

test('project core stays closed by default and cannot be enabled in a remote/prod service', async () => {
  const config = loadConfig({ NODE_ENV: 'test', PILOT_ENABLED: 'false', APP_ORIGIN: origin });
  assert.equal(config.projectCoreEnabled, false);
  const app = await buildApi(config);
  try {
    assert.equal((await app.inject(`${base}/projects`)).statusCode, 404);
    assert.equal((await app.inject({ method: 'POST', url: `${base}/projects`, payload: {} })).statusCode, 404);
  } finally {
    await app.close();
  }
  const guarded = {
    NODE_ENV: 'test', PILOT_ENABLED: 'true', PILOT_DRAFT_ACKNOWLEDGED: 'true',
    PROJECT_CORE_ENABLED: 'true', PROJECT_CORE_LOCAL_ACKNOWLEDGED: 'true',
    DATABASE_URL: 'postgresql://user@127.0.0.1:55437/desloop_project_core_disposable_local',
    APP_ORIGIN: origin, HOST: '127.0.0.1',
  };
  assert.equal(loadConfig(guarded).projectCoreEnabled, true);
  for (const changes of [
    { NODE_ENV: 'production', APP_ORIGIN: 'https://private.example.invalid' },
    { HOST: '0.0.0.0' },
    { APP_ORIGIN: 'https://external.example.invalid' },
    { DATABASE_URL: 'postgresql://user@db.railway.internal:5432/desloop_project_core_disposable_local' },
    { DATABASE_URL: 'postgresql://user@127.0.0.1:55437/ordinary_developer_data' },
    { PROJECT_CORE_LOCAL_ACKNOWLEDGED: 'false' },
    { PILOT_ENABLED: 'false' },
    { PROJECT_CORE_ENABLED: 'maybe' },
  ]) assert.throws(() => loadConfig({ ...guarded, ...changes }));
  assert.throws(() => loadConfig({ ...guarded, CHILD_ACCOUNTS_ENABLED: 'true' }));
});

test('disposable PostgreSQL: real revisions/assets, ownership, replay, conflict, immutability and no credit',
  { skip: !databaseUrl, timeout: 120_000 }, async () => {
    const config = loadConfig({
      NODE_ENV: 'test', PILOT_ENABLED: 'true', PILOT_DRAFT_ACKNOWLEDGED: 'true',
      PROJECT_CORE_ENABLED: 'true', PROJECT_CORE_LOCAL_ACKNOWLEDGED: 'true',
      APP_ORIGIN: origin, HOST: '127.0.0.1', DATABASE_URL: databaseUrl,
    });
    const db = createDatabase(config);
    await migrate(db, catalog);
    await db.query('TRUNCATE pilot.users,pilot.invitations,pilot.audit_events RESTART IDENTITY CASCADE');
    await migrateGuardianGroundwork(db);
    await migrateProjectCore(db, catalog);
    await migrateProjectCore(db, catalog); // additive and re-runnable, no destructive migration
    const verified = await verifyProjectCore(db);
    assert.equal(verified.version, 'project-core-1');
    const app = await buildApi(config, db, catalog);
    const password = 'disposable-adult-test-password-not-real';
    async function actor(role: 'learner' | 'reviewer', label: string): Promise<Actor> {
      const address = `${label.toLowerCase()}-${randomUUID().slice(0, 8)}@example.invalid`;
      const invitation = randomUUID() + randomUUID();
      await db.query(
        "INSERT INTO pilot.invitations(email,role,token_hash,expires_at,created_by) VALUES($1,$2,$3,now()+interval '1 day','test')",
        [address, role, hexHash(invitation)],
      );
      const response = await app.inject({
        method: 'POST', url: '/api/pilot/auth/register',
        headers: { origin, 'content-type': 'application/json' },
        payload: { invitation, name: label, password, adultAttested: true },
      });
      assert.equal(response.statusCode, 201, response.body);
      const lines = response.headers['set-cookie'];
      const cookies = (Array.isArray(lines) ? lines : [lines!]).map((x) => x.split(';')[0]);
      const csrf = cookies.find((x) => x.includes('desloop_pilot_csrf='))?.split('=')[1];
      assert.ok(csrf);
      return { id: response.json().user.id, cookie: cookies.join('; '), csrf: decodeURIComponent(csrf) };
    }
    const get = (url: string, user?: Actor) =>
      app.inject({ method: 'GET', url, headers: user ? { cookie: user.cookie } : {} });
    const post = (url: string, user: Actor | undefined, payload: object,
      options: { origin?: string; noCsrf?: boolean; contentType?: string; remoteAddress?: string } = {}) =>
      app.inject({
        method: 'POST', url, remoteAddress: options.remoteAddress ?? '127.0.0.1',
        headers: {
          origin: options.origin ?? origin,
          'content-type': options.contentType ?? 'application/json',
          ...(user ? { cookie: user.cookie, ...(!options.noCsrf ? { 'x-csrf-token': user.csrf } : {}) } : {}),
        },
        payload,
      });
    try {
      const alice = await actor('learner', 'Alice');
      const bob = await actor('learner', 'Bobby');
      const reviewer = await actor('reviewer', 'Sofia');
      assert.equal((await get(`${base}/projects`)).statusCode, 401);
      assert.equal((await get(`${base}/projects`, reviewer)).statusCode, 403);
      assert.equal((await get(`${base}/projects`, alice)).json().projects.length, 0);
      const initialDoc = { scene: 'local data only', nodes: [{ label: 'immutable-first' }] };
      const createPayload = { title: 'Private practice', document: initialDoc, requestId: randomUUID() };
      assert.equal((await post(`${base}/projects`, alice, createPayload, { origin: 'https://evil.invalid' })).statusCode, 403);
      assert.equal((await post(`${base}/projects`, alice, createPayload, { noCsrf: true })).statusCode, 403);
      assert.equal((await post(`${base}/projects`, alice, createPayload, { contentType: 'text/plain' })).statusCode, 415);
      assert.equal((await post(`${base}/projects`, reviewer, createPayload)).statusCode, 403);
      assert.equal((await post(`${base}/projects`, undefined, createPayload)).statusCode, 401);
      assert.equal((await post(`${base}/projects`, alice, { ...createPayload, unexpected: 'role' })).statusCode, 422);
      const first = await post(`${base}/projects`, alice, createPayload);
      assert.equal(first.statusCode, 201, first.body);
      const id = first.json().id as string;
      assert.equal(first.json().latestRevisionNo, 1);
      assert.equal(first.json().repeated, false);
      assert.equal((await post(`${base}/projects`, alice, createPayload)).statusCode, 200);
      assert.equal((await post(`${base}/projects`, alice,
        { ...createPayload, title: 'Changed after request' })).json().error, 'REQUEST_REUSED');
      const reopened = await get(`${base}/projects/${id}`, alice);
      assert.equal(reopened.statusCode, 200, reopened.body);
      assert.deepEqual(reopened.json().revision.document, initialDoc);
      assert.equal(reopened.json().authority, 'storage-only; never course completion or assessed credit');
      assert.match(String(reopened.headers['cache-control']), /no-store/);
      assert.equal((await get(`${base}/projects/${id}`, bob)).statusCode, 404);
      assert.equal((await post(`${base}/projects/${id}/revisions`, bob,
        { baseRevisionNo: 1, document: initialDoc, assetIds: [], requestId: randomUUID() })).statusCode, 404);
      assert.equal((await get(`${base}/projects/${id}`, reviewer)).statusCode, 403);
      assert.equal((await get(`${base}/projects`, bob)).json().projects.length, 0);
      const bobProject = await post(`${base}/projects`, bob,
        { title: 'Unrelated private file', document: { score: 100 }, requestId: randomUUID() });
      assert.equal(bobProject.statusCode, 201);
      const bobId = bobProject.json().id as string;
      assert.equal((await get(`${base}/projects/${bobId}`, alice)).statusCode, 404);

      const original = tinyPng();
      const imagePayload = {
        dataBase64: original.toString('base64'), expectedSha256: sha256(original), requestId: randomUUID(),
      };
      const imagePath = `${base}/projects/${id}/assets`;
      const wrongHash = await post(imagePath, alice, { ...imagePayload, expectedSha256: sha256('wrong') });
      assert.equal(wrongHash.statusCode, 422, wrongHash.body);
      assert.equal(wrongHash.json().error, 'ASSET_HASH_MISMATCH');
      const svg = Buffer.from('<svg onload="alert(1)"/>');
      assert.equal((await post(imagePath, alice, { ...imagePayload, dataBase64: svg.toString('base64'), expectedSha256: sha256(svg) })).statusCode, 422);
      assert.equal((await post(`${base}/projects/${bobId}/assets`, alice, imagePayload)).statusCode, 404);
      const uploaded = await post(imagePath, alice, imagePayload);
      assert.equal(uploaded.statusCode, 201, uploaded.body);
      const assetId = uploaded.json().id as string;
      assert.equal(uploaded.json().mediaType, 'image/png');
      assert.equal((await post(imagePath, alice, imagePayload)).statusCode, 200);
      const maliciousOriginal = addMetadata(original);
      const metadataUpload = await post(imagePath, alice, {
        dataBase64: maliciousOriginal.toString('base64'),
        expectedSha256: sha256(maliciousOriginal), requestId: randomUUID(),
      });
      assert.equal(metadataUpload.statusCode, 201, metadataUpload.body);
      const scrubbedImage = await get(`${base}/projects/${id}/assets/${metadataUpload.json().id}`, alice);
      assert.equal(scrubbedImage.statusCode, 200);
      assert.equal(scrubbedImage.rawPayload.includes(Buffer.from('private synthetic note')), false);
      const noisyPng = new PNG({ width: 128, height: 128 });
      noisyPng.data.set(randomBytes(noisyPng.data.length));
      const largerImage = PNG.sync.write(noisyPng);
      assert.ok(largerImage.length > 32768 && largerImage.length < 98304);
      const largerUpload = await post(imagePath, alice, {
        dataBase64: largerImage.toString('base64'), expectedSha256: sha256(largerImage),
        requestId: randomUUID(),
      });
      assert.equal(largerUpload.statusCode, 201, largerUpload.body); // route overrides 32 KiB global body limit
      assert.equal((await get(`${base}/projects/${id}/assets/${largerUpload.json().id}`, alice)).statusCode, 200);
      const imageData = await get(`${base}/projects/${id}/assets/${assetId}`, alice);
      assert.equal(imageData.statusCode, 200);
      assert.equal(imageData.headers['content-type'], 'image/png');
      assert.match(String(imageData.headers['content-disposition']), /attachment/);
      assert.equal(sha256(imageData.rawPayload), uploaded.json().sha256);
      assert.deepEqual(PNG.sync.read(imageData.rawPayload).data, PNG.sync.read(original).data);
      assert.equal((await get(`${base}/projects/${id}/assets/${assetId}`, bob)).statusCode, 404);
      assert.equal((await get(`${base}/projects/${bobId}/assets/${assetId}`, bob)).statusCode, 404);
      const bobImage = await post(`${base}/projects/${bobId}/assets`, bob,
        { ...imagePayload, requestId: randomUUID() });
      assert.equal(bobImage.statusCode, 201, bobImage.body);
      const foreignAssetId = bobImage.json().id as string;
      assert.equal((await get(`${base}/projects/${id}/assets/${foreignAssetId}`, alice)).statusCode, 404);
      assert.equal((await get(`${base}/projects/${bobId}/assets/${foreignAssetId}`, bob)).statusCode, 200);

      const secondDoc = { scene: 'second real revision', assetsAreListedInManifest: true };
      const revision = { baseRevisionNo: 1, document: secondDoc, assetIds: [assetId], requestId: randomUUID() };
      const revisionPath = `${base}/projects/${id}/revisions`;
      const foreign = await post(revisionPath, alice,
        { ...revision, assetIds: [assetId, foreignAssetId], requestId: randomUUID() });
      assert.equal(foreign.statusCode, 422);
      assert.equal((await post(revisionPath, alice,
        { ...revision, assetIds: [assetId, assetId], requestId: randomUUID() })).statusCode, 422);
      assert.equal((await post(revisionPath, alice,
        { ...revision, document: { notes: Array(15).fill('z'.repeat(1200)) },
          requestId: randomUUID() })).statusCode, 413);
      assert.equal((await post(revisionPath, alice,
        { ...revision, document: JSON.parse('{"__proto__":{"admin":true}}'),
          requestId: randomUUID() })).statusCode, 400); // Fastify rejects before the contract runs
      const second = await post(revisionPath, alice, revision);
      assert.equal(second.statusCode, 201, second.body);
      assert.equal(second.json().revisionNo, 2);
      assert.equal((await post(revisionPath, alice, revision)).json().repeated, true);
      const stale = await post(revisionPath, alice, { ...revision, requestId: randomUUID() });
      assert.equal(stale.statusCode, 409);
      assert.equal(stale.json().error, 'REVISION_CONFLICT');
      assert.equal((await post(revisionPath, alice, { ...revision, document: { changed: true } })).json().error, 'REQUEST_REUSED');
      const historical = await get(`${base}/projects/${id}/revisions/1`, alice);
      assert.equal(historical.statusCode, 200);
      assert.deepEqual(historical.json().revision.document, initialDoc);
      const loaded = await get(`${base}/projects/${id}`, alice);
      assert.equal(loaded.json().project.latestRevisionNo, 2);
      assert.deepEqual(loaded.json().revision.document, secondDoc);
      assert.equal(loaded.json().revision.assets[0].id, assetId);
      assert.equal(loaded.json().revision.contentSha256, second.json().contentSha256);
      const lateCreateRetry = await post(`${base}/projects`, alice, createPayload);
      assert.equal(lateCreateRetry.statusCode, 200);
      assert.equal(lateCreateRetry.json().latestRevisionNo, 1); // original response, not a false latest hash
      assert.equal((await get(`${base}/projects/${id}`, alice)).json().project.latestRevisionNo, 2);
      const rawProject = await db.query<{ count: string }>(
        'SELECT count(*) FROM project_core.revisions WHERE project_id=$1', [id],
      );
      assert.equal(rawProject.rows[0].count, '2');
      const forbiddenUpdate = db.query(
        "UPDATE project_core.revisions SET content_sha256=repeat('0',64) WHERE project_id=$1", [id],
      );
      await assert.rejects(forbiddenUpdate, /Immutable project evidence/);
      await assert.rejects(db.query('DELETE FROM project_core.assets WHERE id=$1', [assetId]),
        /Immutable project evidence/);
      await assert.rejects(db.query('DELETE FROM project_core.revision_assets WHERE project_id=$1', [id]),
        /Immutable project evidence/);
      await assert.rejects(db.query('UPDATE project_core.projects SET owner_id=$2 WHERE id=$1',
        [id, bob.id]), /ownership\/state cannot be reassigned/);
      await assert.rejects(db.query('UPDATE project_core.projects SET latest_revision_no=1 WHERE id=$1',
        [id]), /ownership\/state cannot be reassigned/);
      await assert.rejects(db.query('DELETE FROM project_core.projects WHERE id=$1', [id]),
        /ownership\/state cannot be deleted/);

      // A privileged DB actor can bypass a trigger: read must still detect changed bytes.
      await db.query('ALTER TABLE project_core.revisions DISABLE TRIGGER immutable_revisions');
      try {
        await db.query('UPDATE project_core.revisions SET document=$2 WHERE project_id=$1 AND revision_no=2',
          [id, JSON.stringify({ forged: true })]);
        const tampered = await get(`${base}/projects/${id}/revisions/2`, alice);
        assert.equal(tampered.statusCode, 409);
        assert.equal(tampered.json().error, 'INTEGRITY_FAILURE');
      } finally {
        await db.query('UPDATE project_core.revisions SET document=$2 WHERE project_id=$1 AND revision_no=2',
          [id, JSON.stringify(secondDoc)]);
        await db.query('ALTER TABLE project_core.revisions ENABLE TRIGGER immutable_revisions');
      }
      await db.query('ALTER TABLE project_core.assets DISABLE TRIGGER immutable_assets');
      try {
        await db.query('UPDATE project_core.assets SET content=$2 WHERE id=$1',
          [assetId, Buffer.from('changed')]);
        const tampered = await get(`${base}/projects/${id}/assets/${assetId}`, alice);
        assert.equal(tampered.statusCode, 409);
        assert.equal(tampered.json().error, 'INTEGRITY_FAILURE');
      } finally {
        await db.query('UPDATE project_core.assets SET content=$2 WHERE id=$1',
          [assetId, imageData.rawPayload]);
        await db.query('ALTER TABLE project_core.assets ENABLE TRIGGER immutable_assets');
      }
      assert.equal((await get(`${base}/projects/${id}`, alice)).statusCode, 200);

      // Two actual HTTP requests with the same base race under row locks: no lost update.
      const concurrent = await Promise.all([
        post(revisionPath, alice,
          { baseRevisionNo: 2, document: { version: 'A' }, assetIds: [], requestId: randomUUID() }),
        post(revisionPath, alice,
          { baseRevisionNo: 2, document: { version: 'B' }, assetIds: [], requestId: randomUUID() }),
      ]);
      assert.deepEqual(concurrent.map((r) => r.statusCode).sort(), [201, 409]);
      assert.equal((await get(`${base}/projects/${id}`, alice)).json().project.latestRevisionNo, 3);
      assert.deepEqual((await get(`${base}/projects/${id}/revisions/2`, alice)).json().revision.document, secondDoc);
      assert.equal((await db.query('SELECT count(*) FROM pilot.course_completions')).rows[0].count, '0');
      assert.equal((await db.query('SELECT count(*) FROM pilot.quiz_attempts')).rows[0].count, '0');
      const log = await db.query<{ detail: object }>(
        "SELECT detail FROM pilot.audit_events WHERE action LIKE 'project_core.%' AND actor_id=$1", [alice.id],
      );
      assert.ok(log.rows.length >= 3);
      assert.doesNotMatch(JSON.stringify(log.rows), /immutable-first|second real revision|Private practice/);
      assert.equal((await app.inject({ method: 'DELETE', url: `${base}/projects/${id}` })).statusCode, 404);

      // Bounded local storage: 10 projects/account and 8 normalized images/project.
      for (let i = 2; i <= 10; i++) {
        const additional = await post(`${base}/projects`, bob,
          { title: `Private project ${i}`, document: { i }, requestId: randomUUID() },
          { remoteAddress: '127.0.0.2' });
        assert.equal(additional.statusCode, 201, additional.body);
      }
      assert.equal((await get(`${base}/projects`, bob)).json().projects.length, 10);
      const excessProject = await post(`${base}/projects`, bob,
        { title: 'Eleventh', document: {}, requestId: randomUUID() },
        { remoteAddress: '127.0.0.2' });
      assert.equal(excessProject.statusCode, 429);
      assert.equal(excessProject.json().error, 'PROJECT_LIMIT');
      for (let i = 2; i <= 8; i++) {
        const additional = await post(`${base}/projects/${bobId}/assets`, bob,
          { ...imagePayload, requestId: randomUUID() });
        assert.equal(additional.statusCode, 201, additional.body);
      }
      const excessImage = await post(`${base}/projects/${bobId}/assets`, bob,
        { ...imagePayload, requestId: randomUUID() });
      assert.equal(excessImage.statusCode, 429);
      assert.equal(excessImage.json().error, 'ASSET_LIMIT');

      // A changed migration checksum or a disabled protection fails local startup verification.
      await db.query("UPDATE project_core.schema_versions SET source_sha256=repeat('0',64)");
      try {
        await assert.rejects(verifyProjectCore(db), /missing or has changed/);
        await assert.rejects(migrateProjectCore(db, catalog), /changed without an approved/);
      } finally {
        await db.query('UPDATE project_core.schema_versions SET source_sha256=$1', [verified.migrationSha256]);
      }
      await db.query('ALTER TABLE project_core.assets DISABLE TRIGGER immutable_assets');
      try {
        await assert.rejects(verifyProjectCore(db), /disabled/);
      } finally {
        await db.query('ALTER TABLE project_core.assets ENABLE TRIGGER immutable_assets');
      }
      assert.equal((await verifyProjectCore(db)).version, 'project-core-1');
      await db.query("UPDATE pilot.users SET status='disabled' WHERE id=$1", [alice.id]);
      assert.equal((await get(`${base}/projects/${id}`, alice)).statusCode, 401);
      assert.equal((await post(revisionPath, alice,
        { baseRevisionNo: 3, document: { x: 1 }, requestId: randomUUID() })).statusCode, 401);
    } finally {
      await app.close();
      await db.end();
    }
  });
