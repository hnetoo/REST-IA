-- Migration: Drop financial_history table
-- Reason: Unified to use external_history table across all dashboards
-- Impact: No references remain in codebase

DROP TABLE IF EXISTS financial_history;