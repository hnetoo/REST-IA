SELECT id, status, total_amount, created_at FROM orders WHERE DATE(created_at) = CURRENT_DATE ORDER BY created_at DESC LIMIT 10;
