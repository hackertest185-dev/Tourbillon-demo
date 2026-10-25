// Imports a downloaded Google web-client JSON, or re-syncs the existing local .NET secrets.
// Never prints credentials or passes them as process arguments.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const project = fs.readFileSync(path.join(root, 'backend/backend.csproj'), 'utf8');
const secretId = project.match(/<UserSecretsId>([^<]+)<\/UserSecretsId>/)?.[1];
if (!secretId) throw new Error('The backend needs a UserSecretsId.');
const storeRoot = process.platform === 'win32'
  ? path.join(process.env.APPDATA, 'Microsoft/UserSecrets', secretId)
  : path.join(os.homedir(), '.microsoft/usersecrets', secretId);
const storeFile = path.join(storeRoot, 'secrets.json');
const secrets = fs.existsSync(storeFile) ? JSON.parse(fs.readFileSync(storeFile, 'utf8').replace(/^\uFEFF/, '')) : {};
const credentialFile = process.argv[2];
if (credentialFile) {
  const web = JSON.parse(fs.readFileSync(path.resolve(credentialFile), 'utf8').replace(/^\uFEFF/, '')).web;
  if (!web?.redirect_uris?.includes('http://localhost:5248/signin-google')) throw new Error('The Google client must allow http://localhost:5248/signin-google.');
  secrets['Authentication:Google:ClientId'] = web.client_id;
  secrets['Authentication:Google:ClientSecret'] = web.client_secret;
}
const credentials = {
  'Authentication:Google:ClientId': secrets['Authentication:Google:ClientId'],
  'Authentication:Google:ClientSecret': secrets['Authentication:Google:ClientSecret'],
};
if (!credentials['Authentication:Google:ClientId']?.endsWith('.apps.googleusercontent.com') ||
    !credentials['Authentication:Google:ClientSecret']?.startsWith('GOCSPX-')) {
  throw new Error('Google web-client credentials are missing from the local secret store.');
}
fs.mkdirSync(storeRoot, { recursive: true });
fs.writeFileSync(storeFile, JSON.stringify(secrets, null, 2));
const container = process.env.TOURBILLON_DEV_CONTAINER || 'tourbillon-backend-dev';
const details = JSON.parse(execFileSync('docker', ['inspect', container], { encoding: 'utf8' }))[0];
if (!details.Config.Env.includes('ASPNETCORE_ENVIRONMENT=Development')) throw new Error('Only the local Development container can be configured by this script.');
try {
  execFileSync('docker', ['exec', '-i', container, 'dotnet', 'user-secrets', 'set', '--id', secretId], { input: JSON.stringify(credentials), stdio: ['pipe', 'pipe', 'pipe'] });
  execFileSync('docker', ['restart', container], { stdio: ['ignore', 'pipe', 'pipe'] });
} catch {
  throw new Error('Could not sync the local secrets or restart the development API. Credentials were retained in the local secret store.');
}
console.log('Google Login configured for the local development API. Credentials remain outside the repository.');
