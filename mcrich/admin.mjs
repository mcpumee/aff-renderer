// ตั้ง/ยกเลิกแอดมิน: docker exec mcrich-app node admin.mjs MRXXXXX [off]
import pg from 'pg';
const [id, off] = process.argv.slice(2);
if (!id) { console.log('ใช้: node admin.mjs <รหัสสมาชิก เช่น MRAB12C> [off]'); process.exit(1); }
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const r = await pool.query('UPDATE users SET is_admin=$2 WHERE public_id=$1 RETURNING name', [id.toUpperCase(), off !== 'off']);
console.log(r.rows[0] ? `✅ ${r.rows[0].name} (${id}) ${off === 'off' ? 'ไม่ใช่แอดมินแล้ว' : 'เป็นแอดมินแล้ว'}` : '❌ ไม่พบรหัสสมาชิกนี้');
await pool.end();
