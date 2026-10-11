CREATE DATABASE IF NOT EXISTS smartcart
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE smartcart;

CREATE TABLE IF NOT EXISTS creator_settings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    creator_name VARCHAR(160) NOT NULL,
    creator_email VARCHAR(254) NOT NULL,
    brand_description VARCHAR(500) NOT NULL DEFAULT '',
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    base_price_cents INT UNSIGNED NOT NULL DEFAULT 900,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_users_email (email)
);

CREATE TABLE IF NOT EXISTS orders (
    id CHAR(36) PRIMARY KEY,
    customer_email VARCHAR(254),
    customer_request TEXT NOT NULL,
    product_title VARCHAR(255) NOT NULL,
    product_content MEDIUMTEXT NOT NULL,
    price_cents INT UNSIGNED NOT NULL,
    currency CHAR(3) NOT NULL,
    paypal_order_id VARCHAR(80) UNIQUE,
    paypal_capture_id VARCHAR(80),
    status ENUM(
      'draft',
      'pending_payment',
      'paid',
      'fulfilled',
      'failed'
    ) NOT NULL DEFAULT 'draft',
    delivery_token CHAR(64) UNIQUE,
    delivered_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_order_status (status, created_at)
);

INSERT INTO creator_settings
    (creator_name, creator_email, currency, base_price_cents)
SELECT
    'SmartCart Demo Creator',
    'creator@example.com',
    'USD',
    900
WHERE NOT EXISTS (
    SELECT 1 FROM creator_settings
);
