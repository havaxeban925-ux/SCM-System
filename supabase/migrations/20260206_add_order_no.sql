-- Add order_no column if it doesn't exist
ALTER TABLE b_request_record 
ADD COLUMN IF NOT EXISTS order_no VARCHAR(50);

-- Add index for search performance
CREATE INDEX IF NOT EXISTS idx_request_order_no ON b_request_record(order_no);

-- Comment
COMMENT ON COLUMN b_request_record.order_no IS '系统生成的申请单号 (如 P20231024001)';

-- Reload schema cache (for Supabase/PostgREST)
NOTIFY pgrst, 'reload schema';
