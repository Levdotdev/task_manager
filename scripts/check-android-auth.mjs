import { loadEnv } from 'vite';

const env = loadEnv('production', process.cwd(), 'VITE_');
const clientId = (process.env.VITE_GOOGLE_WEB_CLIENT_ID || env.VITE_GOOGLE_WEB_CLIENT_ID || '').trim();
if (!/^[\w-]+\.apps\.googleusercontent\.com$/.test(clientId)) {
  console.error('Android Google sign-in requires VITE_GOOGLE_WEB_CLIENT_ID from your Firebase Google provider’s Web SDK configuration. Set it in .env.local or the GitHub repository variable before building. See README.md → Android Google sign-in.');
  process.exit(1);
}
