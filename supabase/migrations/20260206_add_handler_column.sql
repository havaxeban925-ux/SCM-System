-- Add handler_name column to b_style_demand and b_request_record

ALTER TABLE b_style_demand 
ADD COLUMN IF NOT EXISTS handler_name TEXT;

ALTER TABLE b_request_record 
ADD COLUMN IF NOT EXISTS handler_name TEXT;

-- Comment: handler_name stores the name of the person who first handled the item (Buyer). 
-- For Push History (b_style_demand): The creator (Buyer).
-- For Orders (b_request_record): The first person to accept/process it.
