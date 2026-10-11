USE smartcart;

SET @brand_description_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'creator_settings'
      AND COLUMN_NAME = 'brand_description'
);

SET @add_brand_description_sql = IF(
    @brand_description_exists = 0,
    CONCAT(
        'ALTER TABLE creator_settings ADD COLUMN brand_description VARCHAR(500) NOT NULL DEFAULT ',
        CHAR(39),
        CHAR(39),
        ' AFTER creator_email'
    ),
    'SELECT 1'
);

PREPARE add_brand_description_stmt FROM @add_brand_description_sql;
EXECUTE add_brand_description_stmt;
DEALLOCATE PREPARE add_brand_description_stmt;

INSERT IGNORE INTO creator_settings
    (id, creator_name, creator_email, currency, base_price_cents, brand_description)
VALUES
    (1, 'My SmartCart Store', 'creator@example.com', 'USD', 900,
     'Personalized digital products created with AI.');
