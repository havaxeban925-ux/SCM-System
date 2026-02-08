
import { config } from 'dotenv';
config({ path: '.env.local' });

console.log('URL:', process.env.VITE_SUPABASE_URL);
