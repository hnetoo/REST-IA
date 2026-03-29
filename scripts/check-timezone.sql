SELECT 
  CURRENT_DATE as server_date,
  CURRENT_TIME as server_time,
  NOW() as server_now,
  created_at,
  DATE(created_at) as order_date,
  total_amount,
  status
FROM orders 
ORDER BY created_at DESC 
LIMIT 5;
