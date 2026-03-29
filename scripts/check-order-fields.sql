SELECT 
  id, 
  total_amount,
  total,
  status, 
  created_at,
  payment_method
FROM orders 
ORDER BY created_at DESC 
LIMIT 3;
