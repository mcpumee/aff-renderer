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

-- ผลงาน (ภาพ/วิดีโอ)
CREATE TABLE IF NOT EXISTS works (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,                 -- image | video
  style       TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  params      JSONB NOT NULL DEFAULT '{}'::jsonb,
  tier        TEXT NOT NULL DEFAULT '',
  versions    INTEGER NOT NULL DEFAULT 1,
  cost        INTEGER NOT NULL DEFAULT 0,    -- ดาวที่ใช้ (0 = ใช้ภาพฟรี)
  free        BOOLEAN NOT NULL DEFAULT FALSE,
  status      TEXT NOT NULL DEFAULT 'queued', -- queued | working | done | failed
  error       TEXT NOT NULL DEFAULT '',
  files       JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{name,w,h}]
  captions    JSONB NOT NULL DEFAULT '{}'::jsonb,
  hashtags    TEXT[] NOT NULL DEFAULT '{}',
  events      JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{t,at,detail}] ดาวน์โหลด/โพสต์/ส่ง Drive
  posted      JSONB NOT NULL DEFAULT '{}'::jsonb,   -- {tiktok:"2026-11-21",...}
  refs        TEXT[] NOT NULL DEFAULT '{}',          -- ภาพอ้างอิงที่ลูกค้าอัปโหลด
  purged      BOOLEAN NOT NULL DEFAULT FALSE,       -- ลบไฟล์ออกจากเซิร์ฟเวอร์แล้ว (ครบ 7 วัน)
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  done_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS works_user ON works(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS works_status ON works(status, created_at);
-- คืนดาวผลงานเดียวกันได้ครั้งเดียว
CREATE UNIQUE INDEX IF NOT EXISTS star_ledger_refund_once ON star_ledger(user_id, kind, ref) WHERE kind = 'refund';

-- ลิงก์สั้น + นับคลิก
CREATE TABLE IF NOT EXISTS links (
  code       TEXT PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_id    BIGINT REFERENCES works(id) ON DELETE SET NULL,
  platform   TEXT NOT NULL DEFAULT '',
  url        TEXT NOT NULL,
  label      TEXT NOT NULL DEFAULT '',
  clicks     INTEGER NOT NULL DEFAULT 0,
  uniques    INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS links_user ON links(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS links_work ON links(work_id);
CREATE TABLE IF NOT EXISTS link_clicks (
  id       BIGSERIAL PRIMARY KEY,
  code     TEXT NOT NULL REFERENCES links(code) ON DELETE CASCADE,
  at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  visitor  TEXT NOT NULL DEFAULT '',
  device   TEXT NOT NULL DEFAULT '',
  is_unique BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS link_clicks_code ON link_clicks(code, at DESC);

-- Google Drive ของลูกค้า (สิทธิ์ drive.file: เห็นเฉพาะไฟล์ที่ Mc Rich สร้าง)
CREATE TABLE IF NOT EXISTS drive_accounts (
  user_id     BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  refresh_enc TEXT NOT NULL,
  email       TEXT NOT NULL DEFAULT '',
  folder_id   TEXT NOT NULL DEFAULT '',
  auto        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ตั้งเวลาโพสต์ + แจ้งเตือน
CREATE TABLE IF NOT EXISTS schedules (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_id    BIGINT REFERENCES works(id) ON DELETE CASCADE,
  platform   TEXT NOT NULL,
  at         TIMESTAMPTZ NOT NULL,
  note       TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'scheduled',   -- scheduled | due | posted | canceled
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  done_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS schedules_due ON schedules(status, at);
CREATE INDEX IF NOT EXISTS schedules_user ON schedules(user_id, at);
CREATE TABLE IF NOT EXISTS push_subs (
  endpoint   TEXT PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  keys       JSONB NOT NULL,
  ua         TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

-- แชทผู้ช่วย AI (เว็บ + LINE OA)
CREATE TABLE IF NOT EXISTS chat_messages (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,              -- user | model
  content    TEXT NOT NULL,
  draft      JSONB,                      -- งานที่ AI เสนอให้สร้าง
  channel    TEXT NOT NULL DEFAULT 'web', -- web | line
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_user ON chat_messages(user_id, id DESC);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notify JSONB NOT NULL DEFAULT '{"line": true}'::jsonb;

-- โหมดอัตโนมัติ: สร้างคอนเทนต์ตามตาราง มีเพดานดาวต่อเดือน
CREATE TABLE IF NOT EXISTS auto_plans (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL DEFAULT '',
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  goal          TEXT NOT NULL DEFAULT 'sell',
  product       JSONB NOT NULL DEFAULT '{}'::jsonb,   -- {name, price, details, link}
  refs          TEXT[] NOT NULL DEFAULT '{}',
  styles        TEXT[] NOT NULL DEFAULT '{}',
  days          INTEGER[] NOT NULL DEFAULT '{}',      -- 0=อาทิตย์ … 6=เสาร์
  post_time     TEXT NOT NULL DEFAULT '19:00',
  platforms     TEXT[] NOT NULL DEFAULT '{}',
  video_len     INTEGER NOT NULL DEFAULT 15,
  cap_month     INTEGER NOT NULL DEFAULT 300,
  spent_month   TEXT NOT NULL DEFAULT '',
  spent_stars   INTEGER NOT NULL DEFAULT 0,
  rot           INTEGER NOT NULL DEFAULT 0,
  last_run_date DATE,
  last_work_id  BIGINT,
  last_error    TEXT NOT NULL DEFAULT '',
  runs          INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auto_plans_user ON auto_plans(user_id);

-- ระงับผู้ใช้ (หลังบ้าน)
ALTER TABLE users ADD COLUMN IF NOT EXISTS banned BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS star_ledger_kind_time ON star_ledger(kind, created_at);

-- PDPA: ยอมรับเงื่อนไข · ปิดบัญชี (เก็บแค่ค่าแฮชของบัญชีที่ปิด กันรับโบนัสสมัครซ้ำ)
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS closed_identities (
  hash       TEXT PRIMARY KEY,
  closed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- หน้าแรก: กระแส/คลิปไวรัล (Google Trends · YouTube มาแรง · คลิปที่แอดมินคัด) + ไอเดียจาก AI
CREATE TABLE IF NOT EXISTS viral_items (
  id          BIGSERIAL PRIMARY KEY,
  source      TEXT NOT NULL,                 -- gtrends | youtube | curated
  ext_id      TEXT NOT NULL,
  title       TEXT NOT NULL,
  url         TEXT NOT NULL DEFAULT '',
  thumb_url   TEXT NOT NULL DEFAULT '',
  thumb_file  TEXT NOT NULL DEFAULT '',
  meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags        TEXT[] NOT NULL DEFAULT '{}',
  idea        JSONB,                         -- {style, kind, hook, angle, product, summary}
  safe        BOOLEAN NOT NULL DEFAULT TRUE, -- AI กรองข่าวร้าย/การเมือง/อาชญากรรม ออกจากหน้าแรก
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  pinned      BOOLEAN NOT NULL DEFAULT FALSE,
  rank        INTEGER NOT NULL DEFAULT 0,
  first_seen  TIMESTAMPTZ NOT NULL DEFAULT now(),
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, ext_id)
);
CREATE INDEX IF NOT EXISTS viral_items_src ON viral_items(source, fetched_at DESC);
