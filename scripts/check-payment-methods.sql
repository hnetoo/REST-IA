SELECT id, payment_method, total_amount, status, created_at FROM orders WHERE status = 'closed' LIMIT 10;
