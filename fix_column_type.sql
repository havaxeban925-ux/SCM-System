
-- Change real_img_url to TEXT to support base64 images
ALTER TABLE b_style_demand 
ALTER COLUMN real_img_url TYPE TEXT;

-- Also ensure image_url is TEXT just in case
ALTER TABLE b_style_demand 
ALTER COLUMN image_url TYPE TEXT;
