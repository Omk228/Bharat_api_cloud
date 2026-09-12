-- Bharat API Cloud Database Schema (MySQL)

CREATE DATABASE IF NOT EXISTS bharat_api_cloud;
USE bharat_api_cloud;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  company_name VARCHAR(150) DEFAULT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  plan ENUM('free', 'growth', 'scale') DEFAULT 'free',
  role ENUM('client', 'admin') DEFAULT 'client',
  wallet_balance DECIMAL(12, 2) DEFAULT 0.00,
  onboarded BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- API Credentials Table
CREATE TABLE IF NOT EXISTS api_credentials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  api_id VARCHAR(32) NOT NULL UNIQUE,
  api_key VARCHAR(64) NOT NULL UNIQUE,
  token_id VARCHAR(128) NOT NULL,
  token_id_preview VARCHAR(32) NOT NULL,
  environment ENUM('sandbox', 'production') DEFAULT 'sandbox',
  label VARCHAR(100) DEFAULT 'Default Key',
  status ENUM('active', 'inactive', 'revoked') DEFAULT 'active',
  rate_limit_per_min INT DEFAULT 120,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_cred_lookup (api_id, api_key, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- API Hit Logs Table
CREATE TABLE IF NOT EXISTS api_hit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  credential_id INT NULL,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  request_id VARCHAR(64) NOT NULL,
  client_ref_num VARCHAR(64) DEFAULT NULL,
  status_code INT NOT NULL,
  result_code INT NOT NULL,
  latency_ms INT NOT NULL,
  client_ip VARCHAR(45) DEFAULT NULL,
  cost DECIMAL(8, 2) DEFAULT 0.00,
  environment ENUM('sandbox', 'production') DEFAULT 'sandbox',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_hit_user (user_id, created_at),
  INDEX idx_hit_req (request_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- IP Whitelist Table
CREATE TABLE IF NOT EXISTS ip_whitelist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  label VARCHAR(100) DEFAULT 'Client Server',
  environment ENUM('sandbox', 'production', 'all') DEFAULT 'all',
  status ENUM('active', 'disabled') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Wallet Transactions Ledger Table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('credit', 'debit') NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  balance_after DECIMAL(12, 2) NOT NULL,
  category ENUM('topup', 'api_usage', 'refund', 'bonus') DEFAULT 'api_usage',
  description VARCHAR(255) NOT NULL,
  reference_id VARCHAR(64) DEFAULT NULL,
  status ENUM('pending', 'success', 'rejected') DEFAULT 'success',
  utr_number VARCHAR(64) DEFAULT NULL,
  admin_notes VARCHAR(255) DEFAULT NULL,
  approved_at TIMESTAMP NULL,
  payment_screenshot LONGTEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_txn_utr (utr_number),
  INDEX idx_txn_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Payment History Table
CREATE TABLE IF NOT EXISTS payment_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('credit', 'debit') DEFAULT 'credit',
  amount DECIMAL(12, 2) NOT NULL,
  balance_after DECIMAL(12, 2) NOT NULL,
  payment_method VARCHAR(100) DEFAULT 'Bank Account Transfer',
  category ENUM('topup', 'api_usage', 'refund', 'bonus') DEFAULT 'topup',
  description VARCHAR(255) NOT NULL,
  reference_id VARCHAR(64) DEFAULT NULL,
  utr_number VARCHAR(64) DEFAULT NULL,
  status ENUM('pending', 'success', 'rejected') DEFAULT 'pending',
  admin_notes VARCHAR(255) DEFAULT NULL,
  approved_by VARCHAR(64) DEFAULT NULL,
  payment_screenshot LONGTEXT DEFAULT NULL,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_ph_user (user_id, created_at),
  INDEX idx_ph_status (status),
  INDEX idx_ph_utr (utr_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

