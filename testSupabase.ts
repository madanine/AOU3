import * as fs from 'fs';
import * as path from 'path';

// Parse env file to get supabase url and key
const envPath = path.resolve('.env');
const envStr = fs.readFileSync(envPath, 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';

for (const line of envStr.split('\n')) {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
}

console.log('Fetching from', supabaseUrl);

async function run() {
  const res = await fetch(`${supabaseUrl}/rest/v1/attendance?select=*`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  const data = await res.json();
  console.log('Attendance Records Count:', data.length);
  if (data.length > 0) {
    console.log('Sample record:', data[0]);
  }
}

run();
