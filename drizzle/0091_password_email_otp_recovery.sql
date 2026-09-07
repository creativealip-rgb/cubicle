CREATE TABLE IF NOT EXISTS auth_login_otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash text NOT NULL, purpose text NOT NULL CHECK (purpose IN ('login')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5), expires_at timestamptz NOT NULL,
  resend_after timestamptz NOT NULL, consumed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_login_otp_challenges_user_expiry_idx ON auth_login_otp_challenges(user_id, expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS auth_login_otp_challenges_active_unique ON auth_login_otp_challenges(user_id) WHERE consumed_at IS NULL;

CREATE TABLE IF NOT EXISTS auth_trusted_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE, device_label text, last_seen_ip text, last_seen_user_agent text,
  expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), last_used_at timestamptz, revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS auth_trusted_devices_user_active_idx ON auth_trusted_devices(user_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS auth_recovery_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE, method text NOT NULL CHECK (method IN ('passkey','backup_code','manual_admin')),
  expires_at timestamptz NOT NULL, consumed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), recovery_request_id uuid
);
CREATE INDEX IF NOT EXISTS auth_recovery_handoffs_user_expiry_idx ON auth_recovery_handoffs(user_id, expires_at);

CREATE TABLE IF NOT EXISTS auth_recovery_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id text NOT NULL, scope text NOT NULL CHECK (scope IN ('email-access-lost')),
  expires_at timestamptz NOT NULL, consumed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, scope)
);
CREATE INDEX IF NOT EXISTS auth_recovery_authorizations_session_idx ON auth_recovery_authorizations(session_id, expires_at);

INSERT INTO cubiqlo_migrations (id, checksum, operator_name)
VALUES ('0091_password_email_otp_recovery.sql', 'password-email-otp-recovery-v1', current_user)
ON CONFLICT (id) DO NOTHING;
