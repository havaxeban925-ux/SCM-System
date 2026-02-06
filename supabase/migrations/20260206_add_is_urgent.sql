-- Add is_urgent column to b_request_record if it doesn't exist
ALTER TABLE b_request_record 
ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE;

-- Comment on column
COMMENT ON COLUMN b_request_record.is_urgent IS '是否加急处理';

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'b_request_record' AND column_name = 'is_urgent';
