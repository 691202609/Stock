# Docker (ทางเลือก)
เปิด Docker Desktop ในโฟลเดอร์โปรเจกต์ แล้ว `docker compose up --build -d` เปิด http://localhost:3000. ใช้ `docker compose stop` เพื่อหยุด. หากใช้ Supabase ให้คัดลอก .env.example เป็น .env และใส่ URL / publishable key เท่านั้น. ไม่ต้องใช้ Docker เมื่อ Deploy Vercel. ยังไม่ได้ทดสอบ Docker Engine จริง.
