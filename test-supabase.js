import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) { console.error("No url or key"); process.exit(1); }
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('debts').insert([{
    description: 'teste erro', 
    origin_type: 'MANUAL', 
    status: 'OPEN', 
    organization: 'teste', 
    opened_at: '2026-03-03'
  }]).select();
  
  if (error) {
    console.error("ERRO SUPABASE:", JSON.stringify(error, null, 2));
  } else {
    console.log("SUCESSO:", data);
    // clean up
    await supabase.from('debts').delete().eq('id', data[0].id);
  }
}
run();
