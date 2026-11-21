-- Mc Rich: ฐานข้อมูลหลัก (รันซ้ำได้ ไม่ลบของเดิม)
CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  public_id     TEXT UNIQUE NOT NULL,           -- รหัสสั้นให้ลูกค้าเห็น เช่น MR7K2Q
  name          TEXT NOT NULL DEFAULT '',
  avatar_url    TEXT NOT NULL DEFAULT '',
  email         TEXT NOT NULL DEFAULT '',
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  onboarded     BOOLEAN NOT NULL DEFAULT FALSE,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by   BIGINT REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- บัญชีที่ใช้ล็อกอิน (LINE / Google) ผูกกับผู้ใช้ 1 คนได้หลายบัญชี
CREATE TABLE IF NOT EXISTS identities (
  provider   TEXT NOT NULL,
  subject    TEXT NOT NULL,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, subject)
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id   BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  interests JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {goals:[], categories:[], styles:[], platforms:[]}
  brand     JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {shopName, line, phone, shopLink, mapLink, color, accent, font, logo}
  hashtags  TEXT[] NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- บัญชีดาว: ทุกการเปลี่ยนแปลงเป็นหนึ่งบรรทัด ยอดคงเหลือ = ผลรวม (ตรวจย้อนหลังได้ ห้ามแก้บรรทัดเก่า)
CREATE TABLE IF NOT EXISTS star_ledger (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta      INTEGER NOT NULL,
  kind       TEXT NOT NULL,          -- signup_bonus | topup | spend | refund | referral | admin
  ref        TEXT NOT NULL DEFAULT '',
  note       TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS star_ledger_user ON star_ledger(user_id, created_at DESC);
-- กันให้โบนัสสมัครซ้ำไม่ได้
CREATE UNIQUE INDEX IF NOT EXISTS star_ledger_once ON star_ledger(user_id, kind) WHERE kind = 'signup_bonus';

-- โควตาภาพฟรี
CREATE TABLE IF NOT EXISTS free_quota (
  user_id      BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  welcome_left INTEGER NOT NULL DEFAULT 10,
  daily_date   DATE,
  daily_used   INTEGER NOT NULL DEFAULT 0
);

-- เทรนด์/ไวรัลหน้าหลัก (แอดมินจัดการ) แท็กไว้จับคู่กับความสนใจ
CREATE TABLE IF NOT EXISTS trends (
  id         BIGSERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  style      TEXT NOT NULL,          -- รหัสแนว เช่น gift_box, drama_family
  kind       TEXT NOT NULL,          -- video | image
  price      TEXT NOT NULL DEFAULT '',
  badge      TEXT NOT NULL DEFAULT '',
  color      TEXT NOT NULL DEFAULT '#333333',
  tags       TEXT[] NOT NULL DEFAULT '{}',
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort       INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT,
  action     TEXT NOT NULL,
  detail     JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip         TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- เติมดาว (PromptPay + ตรวจสลิป)
CREATE SEQUENCE IF NOT EXISTS receipt_seq;
CREATE TABLE IF NOT EXISTS topups (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package     TEXT NOT NULL,
  amount      INTEGER NOT NULL,           -- บาท (เต็มบาท)
  stars       INTEGER NOT NULL,           -- ดาวที่ได้รวมโบนัส
  status      TEXT NOT NULL DEFAULT 'pending',  -- pending | paid | review | rejected | expired
  receipt_no  TEXT UNIQUE,
  slip_file   TEXT NOT NULL DEFAULT '',
  trans_ref   TEXT UNIQUE,
  slip_data   JSONB NOT NULL DEFAULT '{}'::jsonb,
  note        TEXT NOT NULL DEFAULT '',
  reason      TEXT NOT NULL DEFAULT '',
  attempts    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at     TIMESTAMPTZ,
  reviewed_by BIGINT REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS topups_user ON topups(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS topups_status ON topups(status, created_at);
-- โบนัสชวนเพื่อนได้ครั้งเดียวต่อเพื่อน 1 คน
CREATE UNIQUE INDEX IF NOT EXISTS star_ledger_ref_once ON star_ledger(user_id, kind, ref) WHERE kind = 'referral';
