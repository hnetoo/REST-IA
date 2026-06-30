-- ============================================
--  SUPABASE DATA & POST-MIGRATION CHECKS
--  Scripts para validar integridade após migração
-- ============================================

-- --------------------------------------------
--  Contagens gerais
-- --------------------------------------------
SELECT 
  (SELECT COUNT(*) FROM public.categories) AS categories_count,
  (SELECT COUNT(*) FROM public.dishes) AS dishes_count,
  (SELECT COUNT(*) FROM public.orders) AS orders_count;

-- --------------------------------------------
--  Categories sem nome ou id inválido
-- --------------------------------------------
SELECT *
FROM public.categories
WHERE id IS NULL OR id = '' OR name IS NULL OR name = '';

-- --------------------------------------------
--  Dishes com categoria inexistente
-- --------------------------------------------
SELECT d.*
FROM public.dishes d
LEFT JOIN public.categories c ON d.category_id = c.id
WHERE d.category_id IS NOT NULL
  AND c.id IS NULL;

-- --------------------------------------------
--  Duplicados potenciais por nome e categoria
-- --------------------------------------------
SELECT name, category_id, COUNT(*) AS count
FROM public.dishes
GROUP BY name, category_id
HAVING COUNT(*) > 1;

-- --------------------------------------------
--  Orders com total inconsistente (exemplo simples)
--  Nota: Ajustar expressão conforme estrutura de items
-- --------------------------------------------
SELECT *
FROM public.orders
WHERE total <= 0;

-- --------------------------------------------
--  Verificação de application_state
-- --------------------------------------------
SELECT *
FROM public.application_state
WHERE id = 'current_state';

-- --------------------------------------------
--  Secção opcional de limpeza (comentada)
-- --------------------------------------------
-- DELETE FROM public.dishes
-- WHERE category_id IS NOT NULL
--   AND category_id NOT IN (SELECT id FROM public.categories);

