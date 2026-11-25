# Stock Lift V6.3 — One-click Search (personal research)

ค้นหาหุ้นสหรัฐด้วย Symbol หลังเข้าสู่ระบบครั้งเดียว ไม่ต้องกรอก API Key ในหน้าเว็บ ไม่ใช้ข้อมูล DEMO. ใช้ราคาปิดย้อนหลัง Alpha Vantage (100 วันซื้อขายโดยทั่วไป, 25 คำขอ/วันตามเงื่อนไข Free). CSV เป็นทางเลือกสำหรับหุ้นไทยและข้อมูลย้อนหลังยาวกว่า. ไม่ใช่ราคาสด. ไม่รองรับการค้นหาด้วยชื่อบริษัทหรือหุ้นไทยโดยอัตโนมัติในรุ่นนี้.

## ติดตั้ง Vercel + Supabase
1. สร้าง Supabase Free project แล้วรัน `supabase/schema.sql` ใน SQL Editor (ถ้าเคยสร้างแล้วตรวจสอบก่อนรันซ้ำ). ตั้ง Authentication > URL Configuration ให้ตรง URL เว็บไซต์จริง.
2. ไป Authentication > Users > Add user สร้างบัญชีส่วนตัวของเจ้าของเว็บพร้อมรหัสผ่านที่รัดกุม และยืนยันบัญชีผ่าน Dashboard. คัดลอก User UID (UUID) ของบัญชีนี้. ปิดการสมัครสมาชิกสาธารณะหากใช้เฉพาะตนเอง.
3. ขอ API Key ฟรี https://www.alphavantage.co/support/#api-key สำหรับการใช้ส่วนตัวตามเงื่อนไข. ไม่ต้องซื้อแพ็กเกจ.
4. อัปโหลดไฟล์ที่แตก ZIP ไป GitHub (อย่าอัปโหลด .env ที่มีค่าจริง). Import repository เข้า Vercel. Framework Other; Root directory ./; Install npm ci; Build npm test; Output public; Node 22.x.
5. Project > Settings > Environment Variables เพิ่มค่าจริง:
   - SUPABASE_URL = URL โปรเจกต์ เช่น https://xxxxx.supabase.co
   - SUPABASE_PUBLISHABLE_KEY = publishable หรือ legacy anon key เท่านั้น
   - ALPHA_VANTAGE_API_KEY = key ฟรีส่วนตัว (server only)
   - MARKET_OWNER_USER_ID = UUID ของบัญชีในขั้นตอน 2
6. Deploy/Redeploy หลังตั้งค่า. เปิดเว็บและเข้าสู่ระบบด้วยบัญชีที่สร้าง. พิมพ์ AAPL แล้วกดค้นหา. หากต้องการค้นหุ้นอื่นพิมพ์ NVDA หรือ MSFT. ไม่ต้องกรอก key อีก.
7. ตรวจสอบ /api/health และ /api/config; config ต้องไม่มี Alpha Vantage key. ตรวจสอบด้วยบัญชีอื่นว่าถูกปฏิเสธ (403). เมื่อไม่ล็อกอิน API ต้องปฏิเสธ (401 เมื่อ config ครบ). CSV ใช้ได้โดยไม่ล็อกอิน.

## Local
Node 22: `npm ci`, `npm test`, `npm start`. ถ้าต้องการ env จากไฟล์ ให้คัดลอก .env.example เป็น .env แล้วใส่ค่าจริงและรัน `node --env-file=.env local-server.cjs`. เปิด http://localhost:3000. Docker/Cloudflare จากรุ่นก่อนยังมีไฟล์โครงสร้าง แต่ไม่ได้ต่อ API ค้นหาใหม่สำหรับ Cloudflare; รุ่นนี้เน้น Vercel. Docker ต้องตั้ง env และ rebuild เอง ยังไม่ได้ทดสอบ.

## ข้อจำกัด
- Free API และ Vercel Hobby จำกัดการใช้ส่วนตัวไม่ใช่เชิงพาณิชย์: https://www.alphavantage.co/terms_of_service/ และ https://vercel.com/docs/plans/hobby. ไม่เปิด endpoint ให้สาธารณะใช้คีย์ร่วมกัน. หากจะเปิดขายต้องได้รับสิทธิ์จากผู้ให้บริการและใช้ hosting ที่อนุญาต.
- ใช้ cache 15 นาทีเฉพาะ instance ของ server, ไม่ใช่ quota กลางหรือ persistent cache. ผู้ให้บริการเป็นผู้บังคับโควตารวม. เมื่อ API มีปัญหาจะไม่แทนข้อมูลเดิมด้วยราคาปลอม. เก็บได้ 12 symbols ในเบราว์เซอร์. EMA200 ต้องนำเข้าประวัติเพิ่ม.
- ไฟล์ราคาเก็บใน browser ไม่ได้ sync ขึ้น Supabase; sync เฉพาะรายการโปรด. ข้อมูล local อาจปรากฏกับคนที่ใช้ browser profile เดียวกัน.
- ทดสอบ mock และสูตรด้วย npm test; ยังไม่ได้เชื่อมบัญชีจริงหรือ deploy จริง. ต้องทดสอบหลังตั้งค่า.
