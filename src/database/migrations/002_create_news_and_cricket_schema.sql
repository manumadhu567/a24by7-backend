-- ============================================================================
-- A24by7 News + Cricket Database
-- Target: MySQL 8+
-- Migration: 002
-- ============================================================================


-- ============================================================================
-- NEWS MODULE
-- ============================================================================

CREATE TABLE IF NOT EXISTS news_categories (
    id                  CHAR(36) PRIMARY KEY,
    name                VARCHAR(100) NOT NULL,
    slug                VARCHAR(120) NOT NULL,
    description         VARCHAR(500) NULL,
    is_active            TINYINT(1) NOT NULL DEFAULT 1,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                        ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE KEY uq_news_categories_slug (slug),
    KEY idx_news_categories_active (is_active)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS news_sources (
    id                  CHAR(36) PRIMARY KEY,
    name                VARCHAR(150) NOT NULL,
    slug                VARCHAR(180) NOT NULL,
    website_url         VARCHAR(500) NULL,
    logo_url            VARCHAR(500) NULL,
    api_provider        VARCHAR(100) NULL,
    external_source_id  VARCHAR(255) NULL,
    is_active            TINYINT(1) NOT NULL DEFAULT 1,
    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                        ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE KEY uq_news_sources_slug (slug),
    KEY idx_news_sources_external_id (api_provider, external_source_id),
    KEY idx_news_sources_active (is_active)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS news_articles (
    id                  CHAR(36) PRIMARY KEY,

    source_id           CHAR(36) NOT NULL,
    external_article_id VARCHAR(255) NULL,

    title               VARCHAR(500) NOT NULL,
    slug                VARCHAR(550) NOT NULL,

    summary             TEXT NULL,
    content             LONGTEXT NULL,

    author_name         VARCHAR(200) NULL,

    article_url         VARCHAR(1000) NOT NULL,
    image_url           VARCHAR(1000) NULL,

    published_at        DATETIME(3) NULL,
    updated_at_source   DATETIME(3) NULL,

    status              ENUM(
                            'draft',
                            'published',
                            'archived'
                        ) NOT NULL DEFAULT 'published',

    is_featured         TINYINT(1) NOT NULL DEFAULT 0,

    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                        ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE KEY uq_news_articles_slug (slug),

    UNIQUE KEY uq_news_articles_external (
        source_id,
        external_article_id
    ),

    KEY idx_news_articles_source (source_id),
    KEY idx_news_articles_published (published_at),
    KEY idx_news_articles_status (status),
    KEY idx_news_articles_featured (is_featured),

    CONSTRAINT fk_news_articles_source
        FOREIGN KEY (source_id)
        REFERENCES news_sources(id)
        ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS news_article_categories (
    article_id          CHAR(36) NOT NULL,
    category_id         CHAR(36) NOT NULL,

    PRIMARY KEY (article_id, category_id),

    KEY idx_news_article_categories_category (category_id),

    CONSTRAINT fk_news_article_categories_article
        FOREIGN KEY (article_id)
        REFERENCES news_articles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_news_article_categories_category
        FOREIGN KEY (category_id)
        REFERENCES news_categories(id)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS news_tags (
    id                  CHAR(36) PRIMARY KEY,
    name                VARCHAR(100) NOT NULL,
    slug                VARCHAR(120) NOT NULL,

    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE KEY uq_news_tags_slug (slug)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS news_article_tags (
    article_id          CHAR(36) NOT NULL,
    tag_id              CHAR(36) NOT NULL,

    PRIMARY KEY (article_id, tag_id),

    KEY idx_news_article_tags_tag (tag_id),

    CONSTRAINT fk_news_article_tags_article
        FOREIGN KEY (article_id)
        REFERENCES news_articles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_news_article_tags_tag
        FOREIGN KEY (tag_id)
        REFERENCES news_tags(id)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

  -- ============================================================================
-- CRICKET MODULE
-- ============================================================================


CREATE TABLE IF NOT EXISTS cricket_series (
    id                  CHAR(36) PRIMARY KEY,

    name                VARCHAR(250) NOT NULL,
    short_name          VARCHAR(100) NULL,

    format              ENUM(
                            'test',
                            'odi',
                            't20',
                            't10',
                            'other'
                        ) NULL,

    external_provider   VARCHAR(100) NULL,
    external_series_id  VARCHAR(255) NULL,

    start_date          DATE NULL,
    end_date            DATE NULL,

    status              ENUM(
                            'upcoming',
                            'ongoing',
                            'completed'
                        ) NOT NULL DEFAULT 'upcoming',

    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                        ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE KEY uq_cricket_series_external (
        external_provider,
        external_series_id
    ),

    KEY idx_cricket_series_status (status),
    KEY idx_cricket_series_dates (start_date, end_date)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS cricket_venues (
    id                  CHAR(36) PRIMARY KEY,

    name                VARCHAR(250) NOT NULL,
    city                VARCHAR(150) NULL,
    state               VARCHAR(150) NULL,
    country             VARCHAR(150) NULL,

    capacity            INT UNSIGNED NULL,

    latitude            DECIMAL(10,7) NULL,
    longitude           DECIMAL(10,7) NULL,

    external_provider   VARCHAR(100) NULL,
    external_venue_id   VARCHAR(255) NULL,

    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                        ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE KEY uq_cricket_venues_external (
        external_provider,
        external_venue_id
    ),

    KEY idx_cricket_venues_country (country),
    KEY idx_cricket_venues_city (city)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS cricket_teams (
    id                  CHAR(36) PRIMARY KEY,

    name                VARCHAR(200) NOT NULL,
    short_name          VARCHAR(50) NULL,
    code                VARCHAR(20) NULL,

    country             VARCHAR(150) NULL,
    logo_url             VARCHAR(1000) NULL,

    team_type           ENUM(
                            'international',
                            'domestic',
                            'franchise',
                            'other'
                        ) NOT NULL DEFAULT 'international',

    external_provider   VARCHAR(100) NULL,
    external_team_id    VARCHAR(255) NULL,

    is_active            TINYINT(1) NOT NULL DEFAULT 1,

    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                        ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE KEY uq_cricket_teams_code (code),
    UNIQUE KEY uq_cricket_teams_external (
        external_provider,
        external_team_id
    ),

    KEY idx_cricket_teams_country (country),
    KEY idx_cricket_teams_active (is_active)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS cricket_players (
    id                  CHAR(36) PRIMARY KEY,

    full_name           VARCHAR(200) NOT NULL,
    short_name          VARCHAR(100) NULL,

    date_of_birth       DATE NULL,
    nationality         VARCHAR(150) NULL,

    batting_style       VARCHAR(100) NULL,
    bowling_style       VARCHAR(100) NULL,

    role                ENUM(
                            'batter',
                            'bowler',
                            'all_rounder',
                            'wicket_keeper',
                            'other'
                        ) NULL,

    image_url            VARCHAR(1000) NULL,

    external_provider   VARCHAR(100) NULL,
    external_player_id  VARCHAR(255) NULL,

    is_active            TINYINT(1) NOT NULL DEFAULT 1,

    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                        ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE KEY uq_cricket_players_external (
        external_provider,
        external_player_id
    ),

    KEY idx_cricket_players_name (full_name),
    KEY idx_cricket_players_active (is_active)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS cricket_team_players (
    team_id             CHAR(36) NOT NULL,
    player_id           CHAR(36) NOT NULL,

    jersey_number       VARCHAR(20) NULL,

    joined_at           DATE NULL,
    left_at             DATE NULL,

    is_active            TINYINT(1) NOT NULL DEFAULT 1,

    PRIMARY KEY (team_id, player_id),

    KEY idx_cricket_team_players_player (player_id),

    CONSTRAINT fk_cricket_team_players_team
        FOREIGN KEY (team_id)
        REFERENCES cricket_teams(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_cricket_team_players_player
        FOREIGN KEY (player_id)
        REFERENCES cricket_players(id)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS cricket_matches (
    id                  CHAR(36) PRIMARY KEY,

    series_id           CHAR(36) NULL,
    venue_id            CHAR(36) NULL,

    match_number        INT UNSIGNED NULL,

    match_type          ENUM(
                            'test',
                            'odi',
                            't20',
                            't10',
                            'other'
                        ) NOT NULL,

    status              ENUM(
                            'scheduled',
                            'live',
                            'completed',
                            'abandoned',
                            'cancelled',
                            'postponed'
                        ) NOT NULL DEFAULT 'scheduled',

    scheduled_start     DATETIME(3) NULL,
    actual_start        DATETIME(3) NULL,
    actual_end          DATETIME(3) NULL,

    toss_winner_team_id CHAR(36) NULL,

    toss_decision       ENUM(
                            'bat',
                            'field'
                        ) NULL,

    result_text         VARCHAR(500) NULL,

    winner_team_id      CHAR(36) NULL,

    external_provider   VARCHAR(100) NULL,
    external_match_id   VARCHAR(255) NULL,

    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                        ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE KEY uq_cricket_matches_external (
        external_provider,
        external_match_id
    ),

    KEY idx_cricket_matches_series (series_id),
    KEY idx_cricket_matches_venue (venue_id),
    KEY idx_cricket_matches_status (status),
    KEY idx_cricket_matches_start (scheduled_start),

    CONSTRAINT fk_cricket_matches_series
        FOREIGN KEY (series_id)
        REFERENCES cricket_series(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_cricket_matches_venue
        FOREIGN KEY (venue_id)
        REFERENCES cricket_venues(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_cricket_matches_toss_winner
        FOREIGN KEY (toss_winner_team_id)
        REFERENCES cricket_teams(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_cricket_matches_winner
        FOREIGN KEY (winner_team_id)
        REFERENCES cricket_teams(id)
        ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS cricket_match_teams (
    match_id            CHAR(36) NOT NULL,
    team_id             CHAR(36) NOT NULL,

    team_role           ENUM(
                            'home',
                            'away',
                            'team1',
                            'team2'
                        ) NOT NULL,

    PRIMARY KEY (match_id, team_id),

    KEY idx_cricket_match_teams_team (team_id),

    CONSTRAINT fk_cricket_match_teams_match
        FOREIGN KEY (match_id)
        REFERENCES cricket_matches(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_cricket_match_teams_team
        FOREIGN KEY (team_id)
        REFERENCES cricket_teams(id)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS cricket_match_players (
    match_id            CHAR(36) NOT NULL,
    team_id             CHAR(36) NOT NULL,
    player_id           CHAR(36) NOT NULL,

    squad_status        ENUM(
                            'squad',
                            'playing_xi',
                            'substitute',
                            'impact'
                        ) NOT NULL DEFAULT 'squad',

    captain             TINYINT(1) NOT NULL DEFAULT 0,
    wicket_keeper       TINYINT(1) NOT NULL DEFAULT 0,

    PRIMARY KEY (match_id, team_id, player_id),

    KEY idx_cricket_match_players_player (player_id),

    CONSTRAINT fk_cricket_match_players_match
        FOREIGN KEY (match_id)
        REFERENCES cricket_matches(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_cricket_match_players_team
        FOREIGN KEY (team_id)
        REFERENCES cricket_teams(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_cricket_match_players_player
        FOREIGN KEY (player_id)
        REFERENCES cricket_players(id)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS cricket_innings (
    id                  CHAR(36) PRIMARY KEY,

    match_id            CHAR(36) NOT NULL,

    innings_number      TINYINT UNSIGNED NOT NULL,

    batting_team_id     CHAR(36) NOT NULL,
    bowling_team_id     CHAR(36) NOT NULL,

    runs                INT UNSIGNED NOT NULL DEFAULT 0,
    wickets             TINYINT UNSIGNED NOT NULL DEFAULT 0,

    overs               DECIMAL(6,1) NOT NULL DEFAULT 0.0,

    target_runs         INT UNSIGNED NULL,

    declared            TINYINT(1) NOT NULL DEFAULT 0,
    follow_on           TINYINT(1) NOT NULL DEFAULT 0,

    status              ENUM(
                            'not_started',
                            'live',
                            'completed'
                        ) NOT NULL DEFAULT 'not_started',

    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
                        ON UPDATE CURRENT_TIMESTAMP(3),

    UNIQUE KEY uq_cricket_innings_number (
        match_id,
        innings_number
    ),

    KEY idx_cricket_innings_match (match_id),
    KEY idx_cricket_innings_batting_team (batting_team_id),

    CONSTRAINT fk_cricket_innings_match
        FOREIGN KEY (match_id)
        REFERENCES cricket_matches(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_cricket_innings_batting_team
        FOREIGN KEY (batting_team_id)
        REFERENCES cricket_teams(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cricket_innings_bowling_team
        FOREIGN KEY (bowling_team_id)
        REFERENCES cricket_teams(id)
        ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS cricket_batting (
    innings_id          CHAR(36) NOT NULL,
    player_id           CHAR(36) NOT NULL,

    batting_position    TINYINT UNSIGNED NULL,

    runs                INT UNSIGNED NOT NULL DEFAULT 0,
    balls               INT UNSIGNED NOT NULL DEFAULT 0,

    fours               INT UNSIGNED NOT NULL DEFAULT 0,
    sixes               INT UNSIGNED NOT NULL DEFAULT 0,

    strike_rate         DECIMAL(7,2) NOT NULL DEFAULT 0.00,

    dismissal_status    ENUM(
                            'not_out',
                            'bowled',
                            'caught',
                            'lbw',
                            'run_out',
                            'stumped',
                            'hit_wicket',
                            'retired_hurt',
                            'retired_out',
                            'other'
                        ) NOT NULL DEFAULT 'not_out',

    dismissed_by_player_id CHAR(36) NULL,

    PRIMARY KEY (innings_id, player_id),

    KEY idx_cricket_batting_player (player_id),

    CONSTRAINT fk_cricket_batting_innings
        FOREIGN KEY (innings_id)
        REFERENCES cricket_innings(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_cricket_batting_player
        FOREIGN KEY (player_id)
        REFERENCES cricket_players(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cricket_batting_dismissed_by
        FOREIGN KEY (dismissed_by_player_id)
        REFERENCES cricket_players(id)
        ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS cricket_bowling (
    innings_id          CHAR(36) NOT NULL,
    player_id           CHAR(36) NOT NULL,

    overs               DECIMAL(6,1) NOT NULL DEFAULT 0.0,

    maidens             INT UNSIGNED NOT NULL DEFAULT 0,
    runs_conceded       INT UNSIGNED NOT NULL DEFAULT 0,
    wickets             INT UNSIGNED NOT NULL DEFAULT 0,

    wides               INT UNSIGNED NOT NULL DEFAULT 0,
    no_balls            INT UNSIGNED NOT NULL DEFAULT 0,

    economy             DECIMAL(7,2) NOT NULL DEFAULT 0.00,

    PRIMARY KEY (innings_id, player_id),

    KEY idx_cricket_bowling_player (player_id),

    CONSTRAINT fk_cricket_bowling_innings
        FOREIGN KEY (innings_id)
        REFERENCES cricket_innings(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_cricket_bowling_player
        FOREIGN KEY (player_id)
        REFERENCES cricket_players(id)
        ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

  CREATE TABLE IF NOT EXISTS cricket_deliveries (
    id                  CHAR(36) PRIMARY KEY,

    innings_id          CHAR(36) NOT NULL,

    over_number         INT UNSIGNED NOT NULL,
    ball_number         TINYINT UNSIGNED NOT NULL,

    striker_player_id   CHAR(36) NOT NULL,
    non_striker_player_id CHAR(36) NOT NULL,
    bowler_player_id    CHAR(36) NOT NULL,

    runs_batter         TINYINT UNSIGNED NOT NULL DEFAULT 0,
    runs_extras         TINYINT UNSIGNED NOT NULL DEFAULT 0,
    runs_total          TINYINT UNSIGNED NOT NULL DEFAULT 0,

    extra_type          ENUM(
                            'none',
                            'wide',
                            'no_ball',
                            'bye',
                            'leg_bye',
                            'penalty'
                        ) NOT NULL DEFAULT 'none',

    wicket              TINYINT(1) NOT NULL DEFAULT 0,

    wicket_type         ENUM(
                            'bowled',
                            'caught',
                            'lbw',
                            'run_out',
                            'stumped',
                            'hit_wicket',
                            'retired_hurt',
                            'other'
                        ) NULL,

    dismissed_player_id CHAR(36) NULL,

    commentary          TEXT NULL,

    created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE KEY uq_cricket_delivery (
        innings_id,
        over_number,
        ball_number
    ),

    KEY idx_cricket_deliveries_innings (innings_id),
    KEY idx_cricket_deliveries_striker (striker_player_id),
    KEY idx_cricket_deliveries_bowler (bowler_player_id),

    CONSTRAINT fk_cricket_deliveries_innings
        FOREIGN KEY (innings_id)
        REFERENCES cricket_innings(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_cricket_deliveries_striker
        FOREIGN KEY (striker_player_id)
        REFERENCES cricket_players(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cricket_deliveries_non_striker
        FOREIGN KEY (non_striker_player_id)
        REFERENCES cricket_players(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cricket_deliveries_bowler
        FOREIGN KEY (bowler_player_id)
        REFERENCES cricket_players(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_cricket_deliveries_dismissed_player
        FOREIGN KEY (dismissed_player_id)
        REFERENCES cricket_players(id)
        ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;