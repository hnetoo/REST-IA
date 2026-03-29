SELECT 
  id, 
  total_amount, 
  status, 
  created_at,
  payment_method,
  DATE(created_at) as order_date,
  CURRENT_DATE as today,
  CASE WHEN DATE(created_at) = CURRENT_DATE THEN 'HOJE' ELSE 'OUTRO DIA' END as day_status
FROM orders 
ORDER BY created_at DESC 
LIMIT 10;
