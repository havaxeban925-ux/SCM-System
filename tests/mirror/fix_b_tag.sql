-- Fix b_tag permissions
GRANT ALL ON b_tag TO postgres, anon, authenticated, service_role;
GRANT ALL ON sys_shop TO postgres, anon, authenticated, service_role; -- Ensure shop access too just in case
GRANT ALL ON sys_user TO postgres, anon, authenticated, service_role; -- Ensure user access too

-- Force reload again just to be sure
NOTIFY pgrst, 'reload schema';
