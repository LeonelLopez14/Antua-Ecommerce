// Los e2e corren contra una base propia. Estas variables tienen prioridad sobre el .env.
process.env.NODE_ENV = 'test';
process.env.DB_DATABASE = 'antua_test';
process.env.SHIPPING_FLAT_RATE = '1500';
process.env.SHIPPING_ETA_DAYS = '3';
