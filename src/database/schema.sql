-- ==============================================================================
-- A24by7 Authentication Database — Canonical Schema
-- Target: MySQL 8+
-- Tables: users, email_verification_tokens, password_reset_tokens, sessions
-- ==============================================================================

CREATE TABLE IF NOT EXISTS users (
    id                  CHAR(36) PRIMARY KEY,
    full_name           VARCHAR(100) NOT NULL,
    email               VARCHAR(255) NOT NULL,
    phone               VARCHAR(20) NULL,
    password_hash       TEXT NOT NULL,
    email_verified      TINYINT(1) NOT NULL DEFAULT 0,
    is_active           TINYINT(1) NOT NULL DEFAULT 1,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    last_login_at       DATETIME(3) NULL,

    UNIQUE KEY idx_users_email (email)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id                  CHAR(36) PRIMARY KEY,
    user_id             CHAR(36) NOT NULL,
    token_hash          VARCHAR(255) NOT NULL,
    expires_at          DATETIME(3) NOT NULL,
    used_at             DATETIME(3) NULL,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE KEY idx_email_verification_tokens_token_hash (token_hash),
    KEY idx_email_verification_tokens_user_id (user_id),

    CONSTRAINT fk_email_verification_tokens_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id                  CHAR(36) PRIMARY KEY,
    user_id             CHAR(36) NOT NULL,
    token_hash          VARCHAR(255) NOT NULL,
    expires_at          DATETIME(3) NOT NULL,
    used_at             DATETIME(3) NULL,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE KEY idx_password_reset_tokens_token_hash (token_hash),
    KEY idx_password_reset_tokens_user_id (user_id),

    CONSTRAINT fk_password_reset_tokens_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS sessions (
    id                  CHAR(36) PRIMARY KEY,
    user_id             CHAR(36) NOT NULL,
    session_token_hash  VARCHAR(255) NOT NULL,
    expires_at          DATETIME(3) NOT NULL,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    last_used_at        DATETIME(3) NULL,
    revoked_at          DATETIME(3) NULL,

    UNIQUE KEY idx_sessions_session_token_hash (session_token_hash),
    KEY idx_sessions_user_id (user_id),

    CONSTRAINT fk_sessions_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;