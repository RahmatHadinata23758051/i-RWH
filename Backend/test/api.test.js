import { buildApp } from '../src/app.js';
import { config } from '../src/config/env.js';

async function runTests() {
  console.log('🧪 Memulai Pengujian Endpoint Backend i-RWH...\n');

  const app = await buildApp({ logger: false });

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  // 1. Test Healthcheck (Public)
  await test('GET /api/v1/health (Public endpoint)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/health'
    });
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
    const json = JSON.parse(res.payload);
    if (!json.success || !json.data.status) throw new Error('Invalid health payload structure');
  });

  // 2. Test Auth Guard - Missing API Key
  await test('GET /api/v1/sensors (Tanpa API Key - Harus 401)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/sensors'
    });
    if (res.statusCode !== 401) throw new Error(`Expected 401, got ${res.statusCode}`);
    const json = JSON.parse(res.payload);
    if (json.success !== false || json.error !== 'Unauthorized') {
      throw new Error('Invalid 401 error envelope');
    }
  });

  // 3. Test Auth Guard - Invalid API Key
  await test('GET /api/v1/sensors (Invalid API Key - Harus 403)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/sensors',
      headers: { 'x-api-key': 'wrong_key_123' }
    });
    if (res.statusCode !== 403) throw new Error(`Expected 403, got ${res.statusCode}`);
    const json = JSON.parse(res.payload);
    if (json.success !== false || json.error !== 'Forbidden') {
      throw new Error('Invalid 403 error envelope');
    }
  });

  // 4. Test Sensors Metadata (With Valid API Key)
  await test('GET /api/v1/sensors (Valid API Key - Harus 200 & List 5 Sensor)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/sensors',
      headers: { 'x-api-key': config.apiKey }
    });
    if (res.statusCode !== 200) throw new Error(`Expected 200, got ${res.statusCode}`);
    const json = JSON.parse(res.payload);
    if (!json.success || !Array.isArray(json.data) || json.data.length !== 5) {
      throw new Error(`Expected 5 sensors metadata, got ${json.data?.length}`);
    }
  });

  // 5. Test 404 Not Found Handling
  await test('GET /api/v1/unknown-endpoint (Harus 404 Not Found Envelope)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/unknown-endpoint',
      headers: { 'x-api-key': config.apiKey }
    });
    if (res.statusCode !== 404) throw new Error(`Expected 404, got ${res.statusCode}`);
    const json = JSON.parse(res.payload);
    if (json.success !== false || json.error !== 'Not Found') {
      throw new Error('Invalid 404 error envelope');
    }
  });

  console.log(`\n========================================================`);
  console.log(`Hasil Pengujian: ${passed} passed, ${failed} failed.`);
  console.log(`========================================================\n`);

  await app.close();
  if (failed > 0) process.exit(1);
}

runTests();
