#!/usr/bin/env bash
# ติดตั้ง/อัปเดต aff-renderer บน VPS ที่มี n8n (Hostinger template)
# ใช้: RENDER_TOKEN=... bash install.sh   (PUBLIC_BASE ไม่ต้องใส่ จะตั้งให้อัตโนมัติ)
set -euo pipefail
DIR=/docker/aff-renderer

if [ -d "$DIR/.git" ]; then
  git -C "$DIR" pull --ff-only
else
  git clone --depth 1 https://github.com/mcpumee/aff-renderer.git "$DIR"
fi
cd "$DIR"

# หา container n8n (ไม่เอา traefik) และเครือข่ายของมัน
N8N_CT=$(docker ps --format '{{.Names}}' | grep -i n8n | grep -viE 'traefik|aff' | head -1)
NET=$(docker inspect "$N8N_CT" -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' | awk '{print $1}')
echo ">> n8n container: $N8N_CT  network: $NET"

# อ่านค่า Traefik จาก label ของ n8n (โดเมน / entrypoint / certresolver)
read -r HOST EP CR < <(docker inspect "$N8N_CT" -f '{{json .Config.Labels}}' | python3 -c '
import json,sys,re
l=json.load(sys.stdin); host=ep=cr=""
for k,v in l.items():
    if k.endswith(".rule") and not host:
        m=re.search(r"Host\(`([^`]+)`\)", v); host=m.group(1) if m else ""
    if k.endswith(".entrypoints") and not ep:
        eps=[e.strip() for e in v.split(",")]; ep=next((e for e in eps if "secure" in e or "443" in e), eps[-1])
    if k.endswith(".tls.certresolver") and not cr: cr=v
print(host or "-", ep or "websecure", cr or "-")')
echo ">> โดเมน: $HOST  entrypoint: $EP  certresolver: $CR"

OLD_TOKEN=$(grep -s '^RENDER_TOKEN=' .env | cut -d= -f2- || true)
TOKEN=${RENDER_TOKEN:-$OLD_TOKEN}
if [ "$HOST" != "-" ]; then
  PB=${PUBLIC_BASE_OVERRIDE:-https://$HOST/aff-files/}
else
  PB=${PUBLIC_BASE:-$(grep -s '^PUBLIC_BASE=' .env | cut -d= -f2- || true)}
fi
# AFF Studio: รหัสผ่านเข้าเว็บ (ถามครั้งแรกครั้งเดียว) + กุญแจลับประจำเครื่อง
SPW=$(grep -s '^STUDIO_PASSWORD=' .env | cut -d= -f2- || true)
SSEC=$(grep -s '^STUDIO_SECRET=' .env | cut -d= -f2- || true)
if [ -z "$SPW" ] || [ "${RESET_STUDIO_PASSWORD:-}" = "1" ]; then
  while true; do
    if ! read -r -s -p ">> ตั้งรหัสผ่านเข้าเว็บ AFF Studio (อย่างน้อย 8 ตัว แล้วกด Enter): " SPW < /dev/tty; then echo; echo "!! อ่านรหัสผ่านไม่ได้ (ต้องรันใน Terminal)"; exit 1; fi; echo
    if [ ${#SPW} -lt 8 ]; then echo "   สั้นเกินไป ลองใหม่"; continue; fi
    read -r -s -p ">> พิมพ์รหัสผ่านอีกครั้ง: " SPW2 < /dev/tty || exit 1; echo
    [ "$SPW" = "$SPW2" ] && break
    echo "   รหัสไม่ตรงกัน ลองใหม่"
  done
fi
[ -z "$SSEC" ] && SSEC=$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')

# ---- Mc Rich (เว็บแอปลูกค้า) ----
envget() { grep -s "^$1=" .env | cut -d= -f2- | sed 's/^"//; s/"$//' || true; }
MDBPW=$(envget MCRICH_DB_PASSWORD); [ -z "$MDBPW" ] && MDBPW=$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')
MSEC=$(envget MCRICH_SECRET); [ -z "$MSEC" ] && MSEC=$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')
MDOM=${MCRICH_DOMAIN:-$(envget MCRICH_DOMAIN)}
LID=$(envget LINE_CHANNEL_ID); LSEC=$(envget LINE_CHANNEL_SECRET)
GID=$(envget GOOGLE_CLIENT_ID); GSEC=$(envget GOOGLE_CLIENT_SECRET)
if [ -n "$MDOM" ]; then MURL="https://$MDOM"; else MURL="https://$HOST/app"; fi
askkey() { # $1=ข้อความ $2=ซ่อนไหม(1/0) → ค่าใน REPLY (กด Enter = ข้าม)
  REPLY=""
  if [ "$2" = "1" ]; then read -r -s -p "$1" REPLY < /dev/tty || true; echo; else read -r -p "$1" REPLY < /dev/tty || true; fi
}
if { [ -z "$LID" ] || [ "${SET_MCRICH_KEYS:-}" = "1" ]; } && [ -r /dev/tty ]; then
  echo ">> ตั้งค่า LINE Login ของ Mc Rich (ยังไม่มี กด Enter ข้ามได้)"
  askkey "   LINE Channel ID: " 0; [ -n "$REPLY" ] && LID=$REPLY
  if [ -n "$LID" ]; then askkey "   LINE Channel secret (ตัวอักษรจะไม่แสดง): " 1; [ -n "$REPLY" ] && LSEC=$REPLY; fi
fi
if { [ -z "$GID" ] || [ "${SET_MCRICH_KEYS:-}" = "1" ]; } && [ -r /dev/tty ]; then
  echo ">> ตั้งค่า Google Login ของ Mc Rich (ยังไม่มี กด Enter ข้ามได้)"
  askkey "   Google Client ID: " 0; [ -n "$REPLY" ] && GID=$REPLY
  if [ -n "$GID" ]; then askkey "   Google Client secret (ตัวอักษรจะไม่แสดง): " 1; [ -n "$REPLY" ] && GSEC=$REPLY; fi
fi

# ---- เติมดาว (PromptPay + ตรวจสลิป) ----
PAYID=$(envget PROMPTPAY_ID); PPNAME=$(envget PROMPTPAY_NAME); RMATCH=$(envget RECEIVER_MATCH); ESKEY=$(envget EASYSLIP_KEY)
SNAME=$(envget SELLER_NAME); SADDR=$(envget SELLER_ADDRESS); STAX=$(envget SELLER_TAX_ID)
if { [ -z "$PAYID" ] || [ "${SET_MCRICH_PAY:-}" = "1" ]; } && [ -r /dev/tty ]; then
  echo ">> ตั้งค่ารับเงินเติมดาว (ยังไม่พร้อม กด Enter ข้ามได้)"
  askkey "   พร้อมเพย์ที่รับเงิน (เบอร์มือถือ 10 หลัก หรือเลขบัตร 13 หลัก ตัวเลขจะไม่แสดง): " 1; [ -n "$REPLY" ] && PAYID=$(echo "$REPLY" | tr -cd '0-9')
  if [ -n "$PAYID" ]; then
    askkey "   ชื่อบัญชีผู้รับ ตามที่ขึ้นในแอปธนาคาร (เช่น วชิรวิทย์ ภ): " 0; [ -n "$REPLY" ] && PPNAME=$REPLY
    RMATCH="$(echo "$PPNAME" | awk '{print $1}'),${PAYID: -4}"
    askkey "   API key ของ EasySlip สำหรับตรวจสลิปอัตโนมัติ (ยังไม่มี กด Enter = แอดมินตรวจเอง): " 1; [ -n "$REPLY" ] && ESKEY=$REPLY
    askkey "   ชื่อผู้ขายบนใบเสร็จ (Enter = ใช้ชื่อบัญชี): " 0; SNAME=${REPLY:-${SNAME:-$PPNAME}}
    askkey "   ที่อยู่บนใบเสร็จ (Enter = ข้าม): " 0; [ -n "$REPLY" ] && SADDR=$REPLY
    askkey "   เลขผู้เสียภาษีบนใบเสร็จ (Enter = ข้าม): " 0; [ -n "$REPLY" ] && STAX=$REPLY
  fi
fi

# ---- AI สร้างภาพ (Gemini ของโปรเจกต์ Mc Rich) ----
GKEY=$(envget GEMINI_API_KEY)
if { [ -z "$GKEY" ] || [ "${SET_MCRICH_AI:-}" = "1" ]; } && [ -r /dev/tty ]; then
  echo ">> ตั้งค่า AI สร้างภาพ (ยังไม่มี กด Enter ข้ามได้)"
  askkey "   Gemini API key ของโปรเจกต์ Mc Rich (ตัวอักษรจะไม่แสดง): " 1; [ -n "$REPLY" ] && GKEY=$REPLY
fi
ELKEY=$(envget ELEVENLABS_API_KEY)
if [ "${SET_MCRICH_VOICE:-}" = "1" ] && [ -r /dev/tty ]; then
  echo ">> เสียงพากย์พรีเมียม ElevenLabs (แพ็กเสียเงินเท่านั้น · กด Enter ข้าม = ใช้เสียง Gemini อย่างเดียว)"
  askkey "   ElevenLabs API key (ตัวอักษรจะไม่แสดง): " 1; [ -n "$REPLY" ] && ELKEY=$REPLY
fi

cat > .env <<EOF
PUBLIC_BASE=${PB}
RENDER_TOKEN=${TOKEN}
N8N_NETWORK=${NET}
N8N_INTERNAL=http://${N8N_CT}:5678
STUDIO_PASSWORD=${SPW}
STUDIO_SECRET=${SSEC}
MCRICH_DB_PASSWORD=${MDBPW}
MCRICH_SECRET=${MSEC}
MCRICH_DOMAIN=${MDOM}
MCRICH_PUBLIC_URL=${MURL}
LINE_CHANNEL_ID=${LID}
LINE_CHANNEL_SECRET=${LSEC}
GOOGLE_CLIENT_ID=${GID}
GOOGLE_CLIENT_SECRET=${GSEC}
PROMPTPAY_ID=${PAYID}
PROMPTPAY_NAME="${PPNAME}"
RECEIVER_MATCH=${RMATCH}
EASYSLIP_KEY=${ESKEY}
SELLER_NAME="${SNAME}"
SELLER_ADDRESS="${SADDR}"
SELLER_TAX_ID=${STAX}
GEMINI_API_KEY=${GKEY}
ELEVENLABS_API_KEY=${ELKEY}
EOF
chmod 600 .env
echo ">> ลิงก์ไฟล์คลิป: $PB"

# เปิดทางให้โหลดไฟล์คลิปตรงจากตัวตัดต่อ (รองรับเล่นบนมือถือ/LINE) — เปิดเฉพาะ /files เท่านั้น
if [ "$HOST" != "-" ]; then
  {
    echo "services:"
    echo "  aff-renderer:"
    echo "    labels:"
    echo "      - traefik.enable=true"
    echo "      - traefik.docker.network=${NET}"
    echo "      - \"traefik.http.routers.afffiles.rule=Host(\`${HOST}\`) && PathPrefix(\`/aff-files/\`)\""
    echo "      - traefik.http.routers.afffiles.entrypoints=${EP}"
    echo "      - traefik.http.routers.afffiles.tls=true"
    [ "$CR" != "-" ] && echo "      - traefik.http.routers.afffiles.tls.certresolver=${CR}"
    echo "      - traefik.http.routers.afffiles.middlewares=afffiles-path"
    echo "      - \"traefik.http.middlewares.afffiles-path.replacepathregex.regex=^/aff-files/(.*)\""
    echo "      - \"traefik.http.middlewares.afffiles-path.replacepathregex.replacement=/files/\$\$1\""
    echo "      - traefik.http.services.afffiles.loadbalancer.server.port=3000"
    echo "  aff-studio:"
    echo "    labels:"
    echo "      - traefik.enable=true"
    echo "      - traefik.docker.network=${NET}"
    echo "      - \"traefik.http.routers.affstudio.rule=Host(\`${HOST}\`) && (Path(\`/studio\`) || PathPrefix(\`/studio/\`))\""
    echo "      - traefik.http.routers.affstudio.entrypoints=${EP}"
    echo "      - traefik.http.routers.affstudio.tls=true"
    [ "$CR" != "-" ] && echo "      - traefik.http.routers.affstudio.tls.certresolver=${CR}"
    echo "      - traefik.http.routers.affstudio.middlewares=affstudio-slash,affstudio-strip"
    echo "      - \"traefik.http.middlewares.affstudio-slash.redirectregex.regex=^(https?://[^/]+/studio)\$\$\""
    echo "      - \"traefik.http.middlewares.affstudio-slash.redirectregex.replacement=\$\${1}/\""
    echo "      - traefik.http.middlewares.affstudio-strip.stripprefix.prefixes=/studio"
    echo "      - traefik.http.services.affstudio.loadbalancer.server.port=3100"
    echo "  mcrich-app:"
    echo "    labels:"
    echo "      - traefik.enable=true"
    echo "      - traefik.docker.network=${NET}"
    echo "      - \"traefik.http.routers.mcrich.rule=Host(\`${HOST}\`) && (Path(\`/app\`) || PathPrefix(\`/app/\`))\""
    echo "      - traefik.http.routers.mcrich.entrypoints=${EP}"
    echo "      - traefik.http.routers.mcrich.tls=true"
    [ "$CR" != "-" ] && echo "      - traefik.http.routers.mcrich.tls.certresolver=${CR}"
    echo "      - traefik.http.routers.mcrich.middlewares=mcrich-slash,mcrich-strip"
    echo "      - \"traefik.http.middlewares.mcrich-slash.redirectregex.regex=^(https?://[^/]+/app)\$\$\""
    echo "      - \"traefik.http.middlewares.mcrich-slash.redirectregex.replacement=\$\${1}/\""
    echo "      - traefik.http.middlewares.mcrich-strip.stripprefix.prefixes=/app"
    echo "      - traefik.http.routers.mcrich.service=mcrich"
    echo "      - traefik.http.services.mcrich.loadbalancer.server.port=3200"
    if [ -n "$MDOM" ]; then
      echo "      - \"traefik.http.routers.mcrichdom.rule=Host(\`${MDOM}\`) || Host(\`www.${MDOM}\`)\""
      echo "      - traefik.http.routers.mcrichdom.entrypoints=${EP}"
      echo "      - traefik.http.routers.mcrichdom.tls=true"
      [ "$CR" != "-" ] && echo "      - traefik.http.routers.mcrichdom.tls.certresolver=${CR}"
      echo "      - traefik.http.routers.mcrichdom.service=mcrich"
    fi
  } > docker-compose.override.yml
fi

docker compose up -d --build
echo ">> รอระบบพร้อม (อาจ 3-10 นาที)..."
for i in $(seq 1 180); do
  if docker logs aff-renderer 2>&1 | grep -q 'พร้อมเรนเดอร์'; then
    echo ">> ✅ aff-renderer พร้อมใช้งาน"
    if [ "$HOST" != "-" ]; then
      sleep 3
      CODE=$(curl -s -o /dev/null -w '%{http_code}' "https://$HOST/aff-files/health-check-none.mp4" || true)
      echo ">> ทดสอบลิงก์ไฟล์: HTTP $CODE (404 = ทางเปิดแล้ว ถูกต้อง)"
      for k in $(seq 1 30); do docker logs aff-studio 2>&1 | grep -q 'AFF Studio' && break; sleep 2; done
      SC=$(curl -s -o /dev/null -w '%{http_code}' "https://$HOST/studio/api/health" || true)
      echo ">> ✅ AFF Studio: https://$HOST/studio/  (ทดสอบ HTTP $SC — 200 = ใช้ได้)"
      for k in $(seq 1 30); do docker logs mcrich-app 2>&1 | grep -q 'Mc Rich พร้อม' && break; sleep 2; done
      MC=$(curl -s -o /dev/null -w '%{http_code}' "$MURL/api/health" || true)
      echo ">> ✅ Mc Rich: $MURL/  (ทดสอบ HTTP $MC — 200 = ใช้ได้)"
      echo ">>    ลิงก์ Callback สำหรับ LINE Login: $MURL/auth/line/callback"
      echo ">>    ลิงก์ Callback สำหรับ Google:     $MURL/auth/google/callback"
      docker logs mcrich-app 2>&1 | grep 'Mc Rich พร้อม' | tail -1
      echo ">>    ตั้งตัวเองเป็นแอดมิน: docker exec mcrich-app node admin.mjs <รหัสสมาชิกในหน้าโปรไฟล์>"
    fi
    exit 0
  fi
  sleep 5
done
echo ">> ⚠️ ยังไม่พร้อม ดู log:"; docker logs --tail 40 aff-renderer
