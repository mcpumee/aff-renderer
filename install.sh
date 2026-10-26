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
cat > .env <<EOF
PUBLIC_BASE=${PB}
RENDER_TOKEN=${TOKEN}
N8N_NETWORK=${NET}
EOF
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
    fi
    exit 0
  fi
  sleep 5
done
echo ">> ⚠️ ยังไม่พร้อม ดู log:"; docker logs --tail 40 aff-renderer
