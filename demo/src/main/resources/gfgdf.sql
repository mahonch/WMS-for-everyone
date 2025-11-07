-- склад и локация
insert into warehouses(name, code, address, is_active) values ('Main', 'MAIN', 'Address', true);
insert into locations(warehouse_id, code, name, parent_id, type)
values ((select id from warehouses where code='MAIN'), 'A-01', 'Bin A-01', null, 'BIN');

-- товар и поставщик
insert into suppliers(name) values ('ACME');
insert into categories(name) values ('Tools');
insert into products(sku, name, barcode, category_id, unit, min_stock, cost_price, is_active)
values ('SKU-1','Hammer','1234567890',
        (select id from categories where name='Tools'),'pcs',0,10.00,true);
