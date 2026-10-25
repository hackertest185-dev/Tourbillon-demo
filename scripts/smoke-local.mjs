import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = process.env.SMOKE_ORIGIN || 'http://localhost:3000';
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('This smoke test is for local development only.');
const base = `${origin}/api/backend`;
const report = [];
let cookie = '';
async function request(route, { method = 'GET', body, status = 200, authenticated = true } = {}) {
  const response = await fetch(`${base}/${route}`, {
    method, headers: { ...(authenticated && cookie && { Cookie: cookie }), ...(body && !(body instanceof FormData) && { 'Content-Type': 'application/json' }) },
    ...(body && { body: body instanceof FormData ? body : JSON.stringify(body) }),
    signal: AbortSignal.timeout(60000),
  });
  const text = await response.text();
  assert.equal(response.status, status, `${method} ${route}: expected ${status}, received ${response.status}: ${text.slice(0, 300)}`);
  const cookies = response.headers.getSetCookie().map(value => value.split(';')[0]);
  if (cookies.length) cookie = cookies.join('; ');
  report.push({ method, route, status: response.status });
  return text ? JSON.parse(text) : null;
}
fs.mkdirSync(path.join(root, '.local'), { recursive: true });
const accountPath = path.join(root, '.local/qa-account.json');
if (process.argv.includes('--cleanup-account')) {
  const account = JSON.parse(fs.readFileSync(accountPath, 'utf8'));
  await request('authentication/login', { method: 'POST', body: account });
  await request('account/delete', { method: 'DELETE', body: { currentPassword: account.password, confirmPassword: account.password } });
  fs.unlinkSync(accountPath);
  console.log('Temporary QA account deleted.');
  process.exit(0);
}
if (fs.existsSync(accountPath)) throw new Error('Clean up the previous QA account with --cleanup-account before starting another write test.');

const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'data/catalogue.json'), 'utf8').replace(/^\uFEFF/, ''));
const brands = await request('brand');
const collections = await request('collection');
const watches = await request('watch');
assert.ok(brands.length >= 3 && collections.length >= 8 && watches.length >= 12);
const ordered = await request('watch/ordered');
assert.equal(ordered.length, watches.length);
assert.equal(new Set(ordered.map(w => w.id)).size, watches.length);
const featured = await request('watch/featured');
assert.equal(featured.length, 6);
for (const record of catalogue.watches) {
  const detail = await request(`watch/by-slug/${record.slug}`);
  assert.equal(detail.currentPrice, record.price);
  assert.ok(JSON.parse(detail.specs).catalogueSource.url === record.sourceUrl);
  const response = await fetch(detail.imageUrl, { signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200, `Product photo: ${record.reference}`);
  assert.match(response.headers.get('content-type'), /^image\//);
  await response.arrayBuffer();
}
for (const brand of brands) {
  await request(`brand/by-slug/${brand.slug}`);
  assert.ok((await request(`watch/brand/by-slug/${brand.slug}`)).length > 0);
  assert.ok((await request(`collection/brand/by-slug/${brand.slug}`)).length > 0);
}
for (const collection of collections) {
  await request(`collection/by-slug/${collection.slug}`);
  assert.ok((await request(`watch/collection/by-slug/${collection.slug}`)).length > 0);
}
const search = await request('search?q=PRX');
assert.ok(search.watches.length >= 2);
const typoSearch = await request('search?q=Tisot');
assert.ok(typoSearch.totalResults > 0);
const options = await request('watch/filter-options');
assert.ok(options.dialColors.includes('Blue') && options.movementTypes.includes('Quartz'));
const smart = await request('watch/find', { method: 'POST', body: { query: 'Tissot under 900' } });
assert.ok(JSON.stringify(smart).includes('PRX'), 'Deterministic search should work without AI');
await request('favourites', { status: 401, authenticated: false });
const account = { email: `qa-${Date.now()}@tourbillon.test`, password: `Qa${randomBytes(14).toString('hex')}!` };
fs.writeFileSync(accountPath, JSON.stringify(account));
await request('authentication/register', { method: 'POST', body: { ...account, firstName: 'Local', lastName: 'QA' } });
const profile = await request('profile/me');
assert.equal(profile.email, account.email);
await request('profile/update', { method: 'PUT', body: { email: account.email, firstName: 'Catalogue', lastName: 'QA' } });
await request('authentication/logout', { method: 'POST' });
cookie = '';
await request('profile/me', { status: 401 });
await request('authentication/login', { method: 'POST', body: account });
const watch = watches[0];
await request(`favourites/${watch.id}`, { method: 'POST' });
assert.ok((await request('favourites')).favouriteWatchIds.includes(watch.id));
const collection = await request('favourites/collections', { method: 'POST', body: { name: 'Local QA Collection' } });
await request(`favourites/collections/${collection.id}/watches/${watch.id}`, { method: 'PUT' });
await request(`favourites/collections/${collection.id}`, { method: 'PATCH', body: { name: 'Local QA Updated' } });
await request(`favourites/collections/${collection.id}/watches/${watch.id}`, { method: 'DELETE' });
await request(`favourites/collections/${collection.id}`, { method: 'DELETE' });
await request(`favourites/${watch.id}`, { method: 'DELETE' });
assert.ok(!(await request('favourites')).favouriteWatchIds.includes(watch.id));

// All recipient addresses are reserved local test addresses. SMTP is intentionally unconfigured.
const customer = { firstName: 'Local', lastName: 'QA', email: account.email };
const inquiry = await request('contact/inquiry', { method: 'POST', body: { watchId: watch.id, message: '[LOCAL QA] Catalogue integration check.' } });
assert.ok((await request('contact/my-inquiries')).some(row => row.id === inquiry.id));
const appointment = await request('appointment/book', { method: 'POST', body: { ...customer, watchId: watch.id, boutiqueName: 'Local QA Boutique', visitPurpose: 'Watch viewing', appointmentDate: new Date(Date.now() + 7 * 86400000).toISOString(), notifyByEmail: false, notifyBySms: false } });
assert.ok((await request('appointment/my-appointments')).some(row => row.id === appointment.id));
const interest = await request('register-interest', { method: 'POST', body: { ...customer, salutation: 'Mr', watchId: watch.id, message: '[LOCAL QA] Interest registration check.' } });
assert.ok((await request('register-interest/my-submissions')).some(row => row.id === interest.id));

if (process.argv.includes('--test-admin-upload')) {
  await request('authentication/setup-first-admin', { method: 'POST' });
  await request('authentication/logout', { method: 'POST' });
  cookie = '';
  await request('authentication/login', { method: 'POST', body: account });
  let uploaded;
  try {
    const photo = fs.readFileSync(path.join(root, 'backend/Images', catalogue.watches[0].imageKey));
    for (let i = 0; i < 2; i++) {
      const form = new FormData();
      form.append('file', new Blob([photo], { type: 'image/png' }), 'qa-photo.png');
      uploaded = await request(`admin/watches/${watch.id}/image`, { method: 'POST', body: form });
      assert.ok(uploaded.publicId.endsWith('.png'));
      const detail = await request(`watch/${watch.id}`);
      assert.equal(detail.image, uploaded.publicId);
      const response = await fetch(detail.imageUrl);
      assert.equal(response.status, 200, 'Uploading twice must not delete the replacement');
      assert.equal((await response.arrayBuffer()).byteLength, photo.length);
    }
  } finally {
    await request(`admin/watches/${watch.id}`, { method: 'PUT', body: { ...watch, description: catalogue.watches.find(w => w.slug === watch.slug)?.description || '' } });
  }
}
fs.writeFileSync(path.join(root, '.local/smoke-report.json'), JSON.stringify({ checkedAt: new Date().toISOString(), checks: report, emailDelivery: 'Not tested: SMTP unconfigured' }, null, 2));
console.log(`${report.length} local API checks passed. Product photographs and official prices verified for all ${catalogue.watches.length} watches.`);
console.log('QA account retained locally for browser checks; run --cleanup-account afterwards.');
