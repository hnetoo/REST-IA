SELECT 
  id, 
  total_amount, 
  status, 
  created_at,
  payment_method,
  DATE(created_at) as order_date,
  CURRENT_DATE as today
FROM orders 
WHERE DATE(created_at) = CURRENT_DATE 
ORDER BY created_at DESC;
