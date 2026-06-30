-- Alterar table_id de UUID para INTEGER
ALTER TABLE orders ALTER COLUMN table_id TYPE INTEGER USING NULL;
