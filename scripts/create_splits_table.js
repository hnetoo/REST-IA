const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://tboiuiwlqfzcvakxrsmj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2l1aXdscWZ6Y3Zha3hyc21qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzc5MzksImV4cCI6MjA4ODY1MzkzOX0.-ioGcbogZMqLTtt0Up6DkPTAsROUmPDSokXPgHJgWBU'
);

(async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS order_payment_splits (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      payment_method TEXT NOT NULL,
      customer_name TEXT,
      customer_nif TEXT,
      invoice_number TEXT,
      status TEXT DEFAULT 'paid',
      created_at TIMESTAMPTZ DEFAULT now()
    );
    ALTER TABLE order_payment_splits ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Allow all for anon" ON order_payment_splits FOR ALL USING (true) WITH CHECK (true);
  `;

  // Try using pg directly
  const { Client } = require('pg');
  const client = new Client({
    connectionString: 'postgresql://postgres:tboiuiwlqfzcvakxrsmj:rest-ia@db.tboiuiwlqfzcvakxrsmj.supabase.co:5432/postgres'
  });

  try {
    await client.connect();
    await client.query(sql);
    console.log('Table created successfully');
    await client.end();
  } catch (err) {
    console.error('pg error:', err.message);
    
    // Fallback: try via Supabase REST API with raw SQL
    try {
      const response = await fetch('https://tboiuiwlqfzcvakxrsmj.supabase.co/rest/v1/rpc/exec_sql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2l1aXdscWZ6Y3Zha3hyc21qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzc5MzksImV4cCI6MjA4ODY1MzkzOX0.-ioGcbogZMqLTtt0Up6DkPTAsROUmPDSokXPgHJgWBU',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRib2l1aXdscWZ6Y3Zha3hyc21qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNzc5MzksImV4cCI6MjA4ODY1MzkzOX0.-ioGcbogZMqLTtt0Up6DkPTAsROUmPDSokXPgHJgWBU'
        },
        body: JSON.stringify({ sql })
      });
      console.log('REST fallback result:', response.status);
    } catch (e2) {
      console.error('REST fallback also failed:', e2.message);
      console.log('Please run the SQL manually in Supabase SQL Editor:');
      console.log(sql);
    }
  }
})();
