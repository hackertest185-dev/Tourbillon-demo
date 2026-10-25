import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'data/catalogue.json'), 'utf8').replace(/^\uFEFF/, ''));
const container = process.env.CATALOGUE_POSTGRES_CONTAINER || 'postgresql';
const info = JSON.parse(execFileSync('docker', ['inspect', container], { encoding: 'utf8' }))[0];
const env = Object.fromEntries(info.Config.Env.map(value => {
  const split = value.indexOf('=');
  return [value.slice(0, split), value.slice(split + 1)];
}));
const dbArgs = ['-U', env.POSTGRES_USER || 'postgres', '-d', env.POSTGRES_DB || env.POSTGRES_USER || 'postgres'];
const publicBase = (process.env.LOCAL_STORAGE_PUBLIC_BASE_URL || 'http://localhost:5248').replace(/\/$/, '');

const slugs = new Set();
for (const watch of catalogue.watches) {
  if (watch.currency !== 'USD' || watch.price <= 0 || slugs.has(watch.slug)) throw new Error(`Invalid watch: ${watch.reference}`);
  slugs.add(watch.slug);
  const assetPath = path.join(root, 'backend/Images', watch.imageKey);
  const image = fs.readFileSync(assetPath);
  if (!image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error(`Invalid PNG: ${watch.reference}`);
  watch.specs.catalogueSource = { reference: watch.reference, url: watch.sourceUrl, checkedAt: watch.checkedAt, currency: 'USD', priceType: 'Official US retail' };
}

const backupDir = path.join(root, '.local/backups');
fs.mkdirSync(backupDir, { recursive: true });
const backupPath = path.join(backupDir, `before-catalogue-${Date.now()}.sql`);
fs.writeFileSync(backupPath, execFileSync('docker', ['exec', container, 'pg_dump', ...dbArgs, '--no-owner', '--no-acl'], { maxBuffer: 64 * 1024 * 1024 }));

const payload = {
  brands: catalogue.brands.map(brand => ({ ...brand, image: `${publicBase}/images/${catalogue.watches.find(w => w.brand === brand.slug).imageKey}` })),
  collections: catalogue.collections.map(collection => ({ ...collection, image: `${publicBase}/images/${catalogue.watches.find(w => w.collection === collection.slug).imageKey}` })),
  watches: catalogue.watches,
};
const json = JSON.stringify(payload);
const tag = '$catalogue_import$';
if (json.includes(tag)) throw new Error('Unexpected SQL delimiter in catalogue');
// One transaction; insert missing slugs only. Re-running preserves admin edits and user data.
const sql = `BEGIN;
CREATE TEMP TABLE catalogue_import AS SELECT ${tag}${json}${tag}::jsonb AS doc;
INSERT INTO "Brands" ("Name", "Slug", "Description", "Summary", "Image")
SELECT b.name, b.slug, b.description, b.summary, b.image
FROM catalogue_import, jsonb_to_recordset(doc->'brands') AS b(name text, slug text, description text, summary text, image text)
ON CONFLICT ("Slug") DO NOTHING;
INSERT INTO "Collections" ("Name", "Slug", "Description", "Image", "Styles", "BrandId")
SELECT c.name, c.slug, c.description, c.image, c.styles, b."Id"
FROM catalogue_import, jsonb_to_recordset(doc->'collections') AS c(name text, slug text, description text, image text, styles text[], brand text)
JOIN "Brands" b ON b."Slug" = c.brand
ON CONFLICT ("Slug") DO NOTHING;
INSERT INTO "Watches" ("Name", "Slug", "Description", "Image", "CurrentPrice", "BrandId", "CollectionId", "Specs")
SELECT w.name, w.slug, w.description, w."imageKey", w.price, b."Id", c."Id", w.specs::text
FROM catalogue_import, jsonb_to_recordset(doc->'watches') AS w(name text, slug text, description text, "imageKey" text, price numeric, brand text, collection text, specs jsonb)
JOIN "Brands" b ON b."Slug" = w.brand
JOIN "Collections" c ON c."Slug" = w.collection AND c."BrandId" = b."Id"
ON CONFLICT ("Slug") DO NOTHING;
COMMIT;
SELECT 'Brands' AS entity, count(*) FROM "Brands"
UNION ALL SELECT 'Collections', count(*) FROM "Collections"
UNION ALL SELECT 'Watches', count(*) FROM "Watches";
`;
const output = execFileSync('docker', ['exec', '-i', container, 'psql', ...dbArgs, '-v', 'ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
console.log(output.trim());
console.log('Database backup saved locally before import. Prices: official US retail, USD; checked', catalogue.checkedAt);
