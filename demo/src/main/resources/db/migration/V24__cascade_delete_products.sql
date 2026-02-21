-- Каскадное удаление связанных записей при удалении товара
-- Это необходимо для корректного удаления товаров из БД

ALTER TABLE stock DROP CONSTRAINT IF EXISTS fk_stock_product;
ALTER TABLE stock ADD CONSTRAINT fk_stock_product 
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE batches DROP CONSTRAINT IF EXISTS fk_batches_product;
ALTER TABLE batches ADD CONSTRAINT fk_batches_product 
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE receipt_items DROP CONSTRAINT IF EXISTS fk_receipt_items_product;
ALTER TABLE receipt_items ADD CONSTRAINT fk_receipt_items_product 
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE issue_items DROP CONSTRAINT IF EXISTS fk_issue_items_product;
ALTER TABLE issue_items ADD CONSTRAINT fk_issue_items_product 
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE transfer_items DROP CONSTRAINT IF EXISTS fk_transfer_items_product;
ALTER TABLE transfer_items ADD CONSTRAINT fk_transfer_items_product 
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE adjustment_items DROP CONSTRAINT IF EXISTS fk_adjustment_items_product;
ALTER TABLE adjustment_items ADD CONSTRAINT fk_adjustment_items_product 
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS fk_inventory_items_product;
ALTER TABLE inventory_items ADD CONSTRAINT fk_inventory_items_product 
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
