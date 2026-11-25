# Stock Lift — Yahoo Finance

ค้นหาด้วย Symbol เช่น IREN, AAPL หรือ PTT.BK เพื่อดูราคาล่าสุดและกราฟรายวันย้อนหลังสูงสุด 1 ปี ข้อมูลอาจล่าช้าตามตลาด การค้นหาไม่ต้องตั้งค่าบัญชีหรือ API Key

## Vercel

1. Push โค้ดขึ้น GitHub แล้ว Import repository ใน Vercel หรือ Deploy จาก commit ล่าสุดในโปรเจกต์ที่เชื่อม GitHub ไว้แล้ว
2. ใช้ Framework Preset Other และ Root Directory เป็นรากของ repo ไฟล์ vercel.json กำหนด Build Command และ Output Directory ไว้แล้ว
3. หลัง Deploy เปิดเว็บและค้นหา IREN หรือ PTT.BK ได้ทันที

## ทดสอบบนเครื่อง

ใช้ Node.js 22 รัน `npm test` แล้ว `npm start` จากนั้นเปิด http://localhost:3000

## ข้อมูลตลาด

เซิร์ฟเวอร์แคชผลค้นหา 1 นาที หาก Yahoo Finance ขัดข้อง อาจแสดงข้อมูลสำรองพร้อมป้ายข้อมูลเก่า การค้นหาขอข้อมูลเมื่อกดปุ่ม ข้อมูลของ Yahoo Finance มีเงื่อนไขการเผยแพร่ตาม [ข้อกำหนดของแหล่งข้อมูล](https://help.yahoo.com/kb/SLN2310.html)
