#!/usr/bin/env bash
# ติดตั้ง/อัปเดต aff-renderer บน VPS ที่มี n8n (Hostinger template)
# ใช้: PUBLIC_BASE=... RENDER_TOKEN=... bash install.sh
set -euo pipefail
DIR=/docker/aff-renderer

if [ -d "$DIR/.git" ]; then
  git -C "$DIR" pull --ff-only
else
  git clone --depth 1 https://github.com/mcpumee/aff-renderer.git "$DIR"
fi
cd "$DIR"

# หาเครือข่าย docker ของ n8n เพื่อให้คุยกันภายในได้
N8N_CT=$(docker ps --format '{{.Names}}' | grep -i n8n | grep -vi aff | head -1)
NET=$(docker inspect "$N8N_CT" -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' | awk '{print $1}')
echo ">> n8n container: $N8N_CT  network: $NET"

if [ ! -f .env ] || [ -n "${PUBLIC_BASE:-}" ]; then
  cat > .env <<EOF
PUBLIC_BASE=${PUBLIC_BASE}
RENDER_TOKEN=${RENDER_TOKEN}
N8N_NETWORK=${NET}
EOF
fi

docker compose up -d --build
echo ">> รอระบบพร้อม (ครั้งแรกอาจ 3-6 นาที)..."
for i in $(seq 1 120); do
  if docker logs aff-renderer 2>&1 | grep -q 'พร้อมเรนเดอร์'; then echo ">> ✅ aff-renderer พร้อมใช้งาน"; exit 0; fi
  sleep 5
done
echo ">> ⚠️ ยังไม่พร้อม ดู log:"; docker logs --tail 40 aff-renderer
