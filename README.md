# Stock Lift — Yahoo Finance

ค้นหาด้วย Symbol เช่น IREN, AAPL หรือ PTT.BK หลังเข้าสู่ระบบด้วยบัญชีเจ้าของเว็บไซต์ แสดงราคาล่าสุดที่ Yahoo Finance ส่งมาและกราฟรายวันย้อนหลังสูงสุด 1 ปี ข้อมูลอาจล่าช้า

## ติดตั้ง Vercel + Supabase
1. สร้าง Supabase Free project แล้วรัน `supabase/schema.sql` ใน SQL Editor (สำคัญ: แม้เคยรัน V6.3 แล้ว ต้องรัน SQL รุ่นนี้อีกครั้งเพื่อสร้างระบบโควตา ไม่ลบรายการโปรดเดิม). ตั้ง Authentication > URL Configuration ให้ตรง URL เว็บไซต์จริง.
2. ไป Authentication > Users > Add user สร้างบัญชีส่วนตัวของเจ้าของเว็บพร้อมรหัสผ่านที่รัดกุม และยืนยันบัญชีผ่าน Dashboard. คัดลอก User UID (UUID) ของบัญชีนี้. ปิดการสมัครสมาชิกสาธารณะหากใช้เฉพาะตนเอง.
3. อัปโหลดไฟล์ที่แตก ZIP ไป GitHub (อย่าอัปโหลด .env ที่มีค่าจริง). Import repository เข้า Vercel. Framework Other; Root directory ./; Install npm ci; Build npm test; Output public; Node 22.x.
4. Project > Settings > Environment Variables เพิ่มค่าจริง:
   - SUPABASE_URL = URL โปรเจกต์ เช่น https://xxxxx.supabase.co
   - SUPABASE_PUBLISHABLE_KEY = publishable หรือ legacy anon key เท่านั้น
   - MARKET_OWNER_USER_ID = UUID ของบัญชีในขั้นตอน 2
5. Deploy/Redeploy หลังตั้งค่า. เปิดเว็บและเข้าสู่ระบบด้วยบัญชีที่สร้าง. พิมพ์ IREN หรือ AAPL แล้วกดค้นหาหุ้น (ปุ่มเดียว). หากต้องการค้นหุ้นอื่นพิมพ์ NVDA หรือ MSFT. ไม่ต้องกรอก key อีก.
6. ตรวจสอบ /api/health และ /api/config; ตรวจสอบด้วยบัญชีอื่นว่าถูกปฏิเสธ (403). เมื่อไม่ล็อกอิน API ต้องปฏิเสธ (401 เมื่อ config ครบ). CSV ใช้ได้โดยไม่ล็อกอิน.

## Local
Node 22: `npm ci`, `npm test`, `npm start`. ถ้าต้องการ env จากไฟล์ ให้คัดลอก .env.example เป็น .env แล้วใส่ค่าจริงและรัน `node --env-file=.env local-server.cjs`. เปิด http://localhost:3000. Docker/Cloudflare จากรุ่นก่อนยังมีไฟล์โครงสร้าง แต่ไม่ได้ต่อ API ค้นหาใหม่สำหรับ Cloudflare; รุ่นนี้เน้น Vercel. Docker ต้องตั้ง env และ rebuild เอง ยังไม่ได้ทดสอบ.

## ข้อจำกัด
- แคชฝั่งเซิร์ฟเวอร์ 1 นาที และใช้ข้อมูลสำรองติดป้ายข้อมูลเก่าได้สูงสุด 7 วัน ระบบจำกัด 25 คำขอต่อ 24 ชั่วโมงและเว้นอย่างน้อย 16 วินาทีระหว่างคำขอไปยัง Yahoo Finance เก็บได้ 12 สัญลักษณ์ต่อเบราว์เซอร์
- ไฟล์ราคาเก็บใน browser ไม่ได้ sync ขึ้น Supabase; sync เฉพาะรายการโปรด. ข้อมูล local อาจปรากฏกับคนที่ใช้ browser profile เดียวกัน.
- ทดสอบ mock และสูตรด้วย npm test; ยังไม่ได้เชื่อมบัญชีจริงหรือ deploy จริง. ต้องทดสอบหลังตั้งค่า.

## อัปเกรดจาก V6.3 / รุ่นที่มีปุ่มดึงราคาล่าสุด
- แทนไฟล์โปรเจกต์ทั้งหมดด้วย ZIP รุ่นนี้ แล้ว push เข้า GitHub repository เดิม (ตรวจสอบว่าไม่มีไฟล์ .env ที่มี key จริง).
- ใน Supabase SQL Editor ให้ Run `supabase/schema.sql` รุ่น 6.4 ทั้งหมดอีกครั้ง (ไม่ต้องสร้าง project ใหม่).
- ใช้ SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY และ MARKET_OWNER_USER_ID เดิม.
- Vercel Deploy ใหม่ ตรวจ `/api/health` ต้องได้ version 6.4.0. ถ้ายังเห็นสองปุ่ม ให้ตรวจว่า deploy จาก commit ล่าสุดแล้ว hard refresh (Ctrl+F5).
- เข้าบัญชีเจ้าของเว็บ → พิมพ์ IREN → ค้นหาหุ้น. ราคาปิดและกราฟมาจาก TIME_SERIES_DAILY outputsize=compact เพียงคำขอเดียว ไม่เรียก GLOBAL_QUOTE, entitlement หรือ API intraday.
- หาก 429: เว้นอย่างน้อย 16 วินาทีระหว่างหุ้นใหม่ หรือรอให้โควตาครบช่วง 24 ชั่วโมง. ถ้าเคยค้นหุ้นนั้นจะแสดงข้อมูลที่เก็บไว้พร้อมวันที่; ไม่สร้างราคาเอง.
- หาก 503 และข้อความระบบควบคุมโควตา: รัน SQL รุ่นนี้ใน Supabase ให้สำเร็จแล้วลองใหม่.
- หาก 401/403: ตรวจบัญชีและ MARKET_OWNER_USER_ID; 502: ตรวจ provider response / symbol.
- โหมดนี้ไม่รองรับราคาสด และข้อมูล compact อาจไม่พอ EMA200.
