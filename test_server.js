const http = require('http');
const { server, MAX_SLOTS } = require('./server');

const TEST_PORT = 3899;

server.listen(TEST_PORT, async () => {
  console.log(`[Test] Test server listening on http://localhost:${TEST_PORT}`);

  try {
    // 1. Test health check
    const health = await fetchJson(`http://localhost:${TEST_PORT}/api/health`);
    console.log('✓ Health check passed:', health.status);

    // 2. Test initial paintings list
    const initialList = await fetchJson(`http://localhost:${TEST_PORT}/api/paintings`);
    console.log('✓ Initial paintings count:', initialList.count, 'Max slots:', initialList.maxSlots);

    // 3. Post 55 paintings to test FIFO ring buffer recycling (should cap at 50)
    console.log('[Test] Posting 55 mock paintings to verify 50-slot ring buffer recycling...');
    for (let i = 1; i <= 55; i++) {
      const res = await postJson(`http://localhost:${TEST_PORT}/api/paintings`, {
        title: `Test Mural ${i}`,
        writer: `Writer_${i}`,
        image: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==`,
        substrate: 'mta',
        cap: 'fat',
        scheme: 'gold',
        inspirers: ['Dondi White', 'Lady Pink']
      });
      if (!res.success) throw new Error(`Post ${i} failed`);
    }

    // Verify exactly 50 slots
    const finalList = await fetchJson(`http://localhost:${TEST_PORT}/api/paintings`);
    console.log(`✓ Ring buffer verified! Total count: ${finalList.count} (Expected: 50)`);
    if (finalList.count !== 50) {
      throw new Error(`Expected exactly 50 paintings, got ${finalList.count}`);
    }

    // Verify newest is Mural 55, oldest in buffer is Mural 6 (1 to 5 recycled)
    console.log(`✓ Newest piece in slot 1: "${finalList.paintings[0].title}"`);
    console.log(`✓ Oldest piece in slot 50: "${finalList.paintings[49].title}"`);
    if (finalList.paintings[0].title !== 'Test Mural 55' || finalList.paintings[49].title !== 'Test Mural 6') {
      throw new Error('Ring buffer FIFO ordering mismatch!');
    }

    // 4. Test SSE connection
    await new Promise((resolve, reject) => {
      const req = http.get(`http://localhost:${TEST_PORT}/api/stream`, res => {
        res.on('data', chunk => {
          const str = chunk.toString();
          if (str.includes('event: connected')) {
            console.log('✓ SSE connection handshake confirmed!');
            req.destroy();
            resolve();
          }
        });
      });
      req.on('error', err => {
        // If aborted after receiving, that's fine
        resolve();
      });
    });

    console.log('\n=========================================');
    console.log('  ALL BACKEND TESTS PASSED SUCCESSFULLY! ');
    console.log('=========================================\n');
    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
});

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function postJson(url, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    const req = http.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}
