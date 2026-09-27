-- ==============================================================================
-- A24by7 Authentication Database Migration
-- Target: MySQL 8+
-- Tables: users, email_verification_tokens, password_reset_tokens, sessions
-- ==============================================================================

-- ==============================================================================
-- 1. Users Table
-- ==============================================================================

CREATE TABLE IF NOT EXISTS users (
    id                  CHAR(36) NOT NULL,
    full_name           VARCHAR(100) NOT NULL,
    email               VARCHAR(255) NOT NULL,
    phone               VARCHAR(20) NULL,
    password_hash       VARCHAR(255) NOT NULL,
    email_verified      TINYINT(1) NOT NULL DEFAULT 0,
    is_active           TINYINT(1) NOT NULL DEFAULT 1,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                            ON UPDATE CURRENT_TIMESTAMP(3),
    last_login_at       DATETIME(3) NULL,

    PRIMARY KEY (id),

    UNIQUE KEY idx_users_email (email)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ==============================================================================
-- 2. Email Verification Tokens
-- ==============================================================================

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id                  CHAR(36) NOT NULL,
    user_id             CHAR(36) NOT NULL,
    token_hash          CHAR(64) NOT NULL,
    expires_at          DATETIME(3) NOT NULL,
    used_at             DATETIME(3) NULL,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    KEY idx_email_verification_tokens_user_id (user_id),

    UNIQUE KEY idx_email_verification_tokens_token_hash (token_hash),

    CONSTRAINT fk_email_verification_tokens_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ==============================================================================
-- 3. Password Reset Tokens
-- ==============================================================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id                  CHAR(36) NOT NULL,
    user_id             CHAR(36) NOT NULL,
    token_hash          CHAR(64) NOT NULL,
    expires_at          DATETIME(3) NOT NULL,
    used_at             DATETIME(3) NULL,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    KEY idx_password_reset_tokens_user_id (user_id),

    UNIQUE KEY idx_password_reset_tokens_token_hash (token_hash),

    CONSTRAINT fk_password_reset_tokens_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ==============================================================================
-- 4. Sessions
-- ==============================================================================

CREATE TABLE IF NOT EXISTS sessions (
    id                  CHAR(36) NOT NULL,
    user_id             CHAR(36) NOT NULL,
    session_token_hash  CHAR(64) NOT NULL,
    expires_at          DATETIME(3) NOT NULL,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    last_used_at        DATETIME(3) NULL,
    revoked_at          DATETIME(3) NULL,

    PRIMARY KEY (id),

    KEY idx_sessions_user_id (user_id),

    UNIQUE KEY idx_sessions_session_token_hash (session_token_hash),

    CONSTRAINT fk_sessions_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;