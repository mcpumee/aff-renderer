"""ตัดพื้นหลังรูปสินค้า (rembg, ฟรี ทำในเครื่อง) + ตรวจว่าตัดสวยพอไหม
ใช้: python3 cutout.py in1.jpg out1.png [in2.jpg out2.png ...]
พิมพ์ JSON หนึ่งบรรทัด: [{"ok":bool,"w":..,"h":..,"reason":".."}, ...]
"""
import json
import sys

import numpy as np
from PIL import Image
from rembg import new_session, remove

MODEL = 'isnet-general-use'


def judge(alpha: np.ndarray):
    h, w = alpha.shape
    solid = alpha > 128
    cover = solid.mean()
    if cover < 0.04:
        return False, f'เหลือวัตถุน้อยเกินไป ({cover:.0%})'
    if cover > 0.85:
        return False, f'ตัดพื้นหลังไม่ออก ({cover:.0%})'
    border = np.concatenate([solid[0, :], solid[-1, :], solid[:, 0], solid[:, -1]])
    if border.mean() > 0.30:
        return False, f'วัตถุชนขอบภาพมาก ({border.mean():.0%})'
    # ขอบนุ่ม/ฟุ้งมากเกินไป = แยกวัตถุไม่ชัด
    soft = ((alpha > 20) & (alpha < 235)).sum() / max(1, (alpha > 20).sum())
    if soft > 0.45:
        return False, f'ขอบฟุ้งเกินไป ({soft:.0%})'
    return True, ''


def tone(im: Image.Image):
    """สีเด่นของสินค้า: คืน hue (0-360) หรือ None ถ้าเป็นสีกลาง ๆ (ขาว/ดำ/เงิน)"""
    small = im.copy()
    small.thumbnail((64, 64))
    rgba = np.array(small.convert('RGBA')).reshape(-1, 4)
    rgba = rgba[rgba[:, 3] > 128]
    if len(rgba) < 20:
        return None
    hsv = np.array(Image.fromarray(rgba[None, :, :3].astype('uint8')).convert('HSV')).reshape(-1, 3) / 255.0
    sat = (hsv[:, 1] > 0.28) & (hsv[:, 2] > 0.22)
    if sat.mean() < 0.15:
        return None
    hist, edges = np.histogram(hsv[sat, 0] * 360, bins=12, range=(0, 360))
    return float(edges[hist.argmax()] + 15)


def main(args):
    session = new_session(MODEL)
    res = []
    for src, dst in zip(args[0::2], args[1::2]):
        try:
            im = Image.open(src).convert('RGB')
            im.thumbnail((1400, 1400))
            out = remove(im, session=session, post_process_mask=True)
            a = np.array(out.getchannel('A'))
            a[a < 30] = 0  # ลบเงาจาง ๆ ที่หลงเหลือ
            ok, reason = judge(a)
            out.putalpha(Image.fromarray(a))
            box = out.getbbox()
            if box:
                pad = 12
                box = (max(0, box[0] - pad), max(0, box[1] - pad), min(out.width, box[2] + pad), min(out.height, box[3] + pad))
                out = out.crop(box)
            out.save(dst)
            res.append({'ok': ok, 'w': out.width, 'h': out.height, 'reason': reason, 'hue': tone(out if ok else im)})
        except Exception as e:  # noqa: BLE001
            res.append({'ok': False, 'reason': str(e)[:200]})
    print(json.dumps(res, ensure_ascii=False))


if __name__ == '__main__':
    main(sys.argv[1:])
