-- Add handler_name column to b_restock_order table
ALTER TABLE b_restock_order ADD COLUMN IF NOT EXISTS handler_name TEXT;
