const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function request(method, path, body) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const opts = {
            method,
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            headers: { 'Content-Type': 'application/json' }
        };
        const req = http.request(opts, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTests() {
    let passed = 0;
    let failed = 0;

    function assert(condition, name) {
        if (condition) { passed++; console.log(`  PASS: ${name}`); }
        else { failed++; console.error(`  FAIL: ${name}`); }
    }

    console.log('\n=== API Tests ===\n');

    // Track without data
    const trackRes = await request('POST', '/api/track', { applicantName: 'Test', cnicNumber: '00000-0000000-0' });
    assert(trackRes.status === 200, 'POST /api/track returns 200');
    assert(Array.isArray(trackRes.body), 'POST /api/track returns array');

    // Apply with missing fields
    const applyMissing = await request('POST', '/api/apply', {});
    assert(applyMissing.status === 400, 'POST /api/apply with missing fields returns 400');

    // Apply with valid data
    const applyRes = await request('POST', '/api/apply', {
        serviceName: 'Passport Application',
        applicantName: 'Test User',
        cnicNumber: '12345-1234567-1'
    });
    assert(applyRes.status === 200, 'POST /api/apply with valid data returns 200');
    assert(applyRes.body.success === true, 'POST /api/apply returns success true');
    assert(typeof applyRes.body.id === 'number', 'POST /api/apply returns numeric id');

    // Admin login with wrong creds
    const badLogin = await request('POST', '/api/admin/login', { username: 'bad', password: 'bad' });
    assert(badLogin.status === 401, 'POST /api/admin/login with bad creds returns 401');

    // Admin login with correct creds
    const goodLogin = await request('POST', '/api/admin/login', { username: 'admin', password: 'admin1234' });
    assert(goodLogin.status === 200, 'POST /api/admin/login returns 200');
    assert(goodLogin.body.authenticated === true, 'POST /api/admin/login authenticates');

    // Get applications
    const appsRes = await request('GET', '/api/admin/applications');
    assert(appsRes.status === 200, 'GET /api/admin/applications returns 200');
    assert(Array.isArray(appsRes.body), 'GET /api/admin/applications returns array');

    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
