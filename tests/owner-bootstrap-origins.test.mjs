import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getOwnerBootstrapOrigin } from '../src/lib/owner-bootstrap-origins.server.ts';

test('owner bootstrap uses exact server-side origins without external requests', () => {
  const previousMode = process.env.NODE_ENV;
  const previousOrigins = process.env.OWNER_BOOTSTRAP_ALLOWED_ORIGINS;
  try {
    delete process.env.OWNER_BOOTSTRAP_ALLOWED_ORIGINS;
    process.env.NODE_ENV = 'development';
    for (const origin of ['http://localhost:8080', 'http://127.0.0.1:8080']) {
      assert.equal(getOwnerBootstrapOrigin(origin), origin);
    }
    for (const origin of ['http://localhost:3000', 'http://127.0.0.1:8081', 'http://localhost.evil.test:8080', 'https://untrusted.test']) {
      assert.equal(getOwnerBootstrapOrigin(origin), null);
    }

    process.env.NODE_ENV = 'production';
    for (const origin of ['http://localhost:8080', 'http://127.0.0.1:8080', 'https://shop.example.test']) {
      assert.equal(getOwnerBootstrapOrigin(origin), null);
    }

    process.env.OWNER_BOOTSTRAP_ALLOWED_ORIGINS = ' https://SHOP.example.test:443/, https://www.example.test, http://localhost:8080, http://127.0.0.1:8080, https://localhost:8080';
    assert.equal(getOwnerBootstrapOrigin('https://shop.example.test'), 'https://shop.example.test');
    assert.equal(getOwnerBootstrapOrigin('https://SHOP.example.test:443/'), 'https://shop.example.test');
    assert.equal(getOwnerBootstrapOrigin('https://www.example.test'), 'https://www.example.test');
    for (const origin of [undefined, '', 'null', '*', 'https://shop.example.test.evil.test', 'https://sub.shop.example.test', 'https://shop.example.test:444', 'http://shop.example.test', 'http://localhost:8080', 'http://127.0.0.1:8080', 'https://localhost:8080', 'https://shop.example.test/path', 'https://shop.example.test?x=1', 'https://shop.example.test#fragment', 'https://user@shop.example.test', 'https://shop.example.test\\@evil.test']) {
      assert.equal(getOwnerBootstrapOrigin(origin), null, String(origin));
    }

    process.env.OWNER_BOOTSTRAP_ALLOWED_ORIGINS = '*, https://*.example.test, https://shop.example.test/path, https://user@shop.example.test, invalid';
    assert.equal(getOwnerBootstrapOrigin('https://shop.example.test'), null);

    delete process.env.NODE_ENV;
    assert.equal(getOwnerBootstrapOrigin('http://localhost:8080'), null);
  } finally {
    if (previousMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousMode;
    if (previousOrigins === undefined) delete process.env.OWNER_BOOTSTRAP_ALLOWED_ORIGINS;
    else process.env.OWNER_BOOTSTRAP_ALLOWED_ORIGINS = previousOrigins;
  }
});
