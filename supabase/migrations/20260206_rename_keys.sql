-- 问题2：将测试KEY重命名为KEY1/KEY2/KEY3/KEY4
-- 执行此脚本更新数据库中的key_id字段

-- 查看当前KEY
-- SELECT DISTINCT key_id FROM sys_shop ORDER BY key_id;

-- 更新KEY名称
UPDATE sys_shop SET key_id = 'KEY1' WHERE key_id = 'SHOP_A' OR key_id = 'shop_a';
UPDATE sys_shop SET key_id = 'KEY2' WHERE key_id = 'SHOP_B' OR key_id = 'shop_b';
UPDATE sys_shop SET key_id = 'KEY3' WHERE key_id = 'SHOP_C' OR key_id = 'shop_c';
UPDATE sys_shop SET key_id = 'KEY4' WHERE key_id = 'SHOP_D' OR key_id = 'shop_d';

-- 验证更新
SELECT DISTINCT key_id, COUNT(*) as shop_count FROM sys_shop GROUP BY key_id ORDER BY key_id;
