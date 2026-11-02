# FastNumeric — Numerical Method Calculator

เว็บแอปพลิเคชันคำนวณโจทย์ Numerical Methods สำหรับโปรเจกต์นักศึกษา
รองรับการคำนวณ 6 หมวด 11 วิธี พร้อมแสดงวิธีทำ ตาราง iteration บันทึกประวัติลง SQLite และรันได้ด้วย Docker Compose

## หมวดและวิธีคำนวณ

| หมวด | วิธี |
|---|---|
| Root of Equation | Bisection Method, Newton-Raphson Method |
| Linear Algebra Equation | Gauss Elimination |
| Interpolation | Linear Interpolation, Lagrange Interpolation |
| Extrapolation | Linear Extrapolation |
| Integration | Trapezoidal Rule, Simpson's 1/3 Rule |
| Differentiation | Forward Difference, Backward Difference, Central Difference |

## เทคโนโลยี

- **Frontend:** React 18 + Vite + Tailwind CSS (JavaScript)
- **Backend:** Node.js + Express
- **Database:** SQLite (ผ่าน `node:sqlite` ในตัว — ไม่ต้องติดตั้ง native dependency เพิ่ม)
- **Docker:** Multi-stage build (Nginx เสิร์ฟ frontend) + Docker Compose + Named Volume

## โครงสร้างโปรเจกต์

```
FastNumeric/
├── client/                  # React + Vite + Tailwind
│   ├── src/
│   │   ├── api.js           # ตัวติดต่อ API
│   │   ├── components/      # Layout, MethodInput (ฟอร์มไดนามิก), ResultView
│   │   └── pages/           # Dashboard, Calculator, History, HistoryDetail
│   ├── nginx.conf           # Nginx reverse proxy /api → backend
│   └── Dockerfile           # Multi-stage: build → nginx
├── server/                  # Express API
│   ├── src/
│   │   ├── algorithms/      # อัลกอริทึมทั้ง 6 หมวด (OOP: BaseMethod + registry)
│   │   ├── database/        # SQLite connection + history repository
│   │   ├── expression/      # Expression parser (ไม่ใช้ eval)
│   │   ├── routes/          # REST API
│   │   └── validation/      # ตรวจ input ทุกชนิด
│   ├── test/run-tests.js    # ชุดทดสอบ 37 เคส
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

### การออกแบบ OOP ฝั่ง Backend

- **Abstraction** — `BaseMethod` กำหนด interface `solve()` + `meta` (field definitions)
- **Inheritance** — ทุกวิธี (Bisection, NewtonRaphson, …) extends `BaseMethod` (เช่น `DifferenceMethod` ใช้ class เดียวสร้าง 3 วิธี)
- **Polymorphism** — route `/api/calculate` เรียก `method.solve()` โดยไม่สนใจว่าเป็นวิธีใด
- **Encapsulation** — validation แปลง input ให้เป็นโครงสร้างมาตรฐานก่อนเข้าอัลกอริทึมเสมอ
- **Composition / Open-Closed** — เพิ่มวิธีใหม่ = สร้าง class ใหม่ + บรรทัดเดียวใน `registry.js` ไม่ต้องแก้ส่วนอื่น

## การรันแบบปกติ (ไม่ใช้ Docker)

### 1. Backend

```bash
cd server
npm install
npm start            # รันที่ http://localhost:4000
```

ตัวเลือกเพิ่มเติม:

```bash
npm test             # รันชุดทดสอบอัลกอริทึม (37 เคส)
npm run dev          # รันแบบ watch mode
```

ฐานข้อมูล SQLite จะถูกสร้างอัตโนมัติที่ `server/data/fastnumeric.sqlite` (เปลี่ยนได้ด้วย env `DB_PATH`)

### 2. Frontend (dev mode)

```bash
cd client
npm install
npm run dev          # รันที่ http://localhost:5173
```

> หมายเหตุ: ใน dev mode ให้สร้างไฟล์ `client/.env` มี `VITE_API_URL=http://localhost:4000/api` (ดู `.env.example`) หรือแก้ตรงใน `src/api.js` เพื่อชี้ไปยัง backend

### 3. ทดสอบ production build บนเครื่อง (ไม่ต้องมี Nginx)

```bash
cd client && npm run build     # สร้าง client/dist
cd ../server && npm start      # backend ที่ :4000
node test/serve-prod.js        # จำลอง nginx: เสิร์ฟ dist + proxy /api ที่ http://localhost:8080
```

## การรันด้วย Docker Compose

### ต้องการ

- Docker Engine 20.10+
- Docker Compose v2

### คำสั่งหลัก

```bash
# สร้างและเริ่มระบบทั้งหมด (build ครั้งแรกใช้เวลา 1–3 นาที)
docker compose up -d --build

# ดูสถานะ container
docker compose ps

# ดู logs
docker compose logs -f            # ทั้งหมด
docker compose logs -f backend    # เฉพาะ backend
docker compose logs -f frontend   # เฉพาะ frontend

# หยุดระบบ (ข้อมูลยังอยู่ใน volume)
docker compose stop

# หยุดและลบ container (ข้อมูลยังอยู่ใน volume)
docker compose down

# สร้างใหม่หลังแก้โค้ด
docker compose up -d --build
```

### เปิดเว็บ

- **เว็บแอปพลิเคชัน:** http://localhost:8080 (เปลี่ยน port ได้ผ่าน `FRONTEND_PORT` ใน `.env`)
- **API โดยตรง:** http://localhost:4000/api/health

### Environment Variables

คัดลอก `.env.example` เป็น `.env`:

```bash
cp .env.example .env
```

| ตัวแปร | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|
| `FRONTEND_PORT` | `8080` | Port เปิดเว็บบน host |
| `CORS_ORIGIN` | `*` | Origin ที่อนุญาต (คั่นหลายค่าด้วย `,`) |

### การคงอยู่ของข้อมูล (Data Persistence)

ไฟล์ SQLite เก็บใน **named volume** `fastnumeric-data` (mount ที่ `/data` ใน backend container) ดังนั้น:

- หยุด/เริ่ม container ใหม่ → ข้อมูลยังอยู่ ✅
- `docker compose down` แล้ว `up` ใหม่ → ข้อมูลยังอยู่ ✅
- rebuild image → ข้อมูลยังอยู่ ✅

### การรีเซ็ตฐานข้อมูล

> ⚠ **คำเตือน:** การลบ volume จะทำให้ประวัติการคำนวณทั้งหมดสูญหายถาวร และไม่สามารถกู้คืนได้

```bash
# หยุดระบบและลบ volume (ข้อมูลทั้งหมดจะหาย!)
docker compose down -v

# หรือลบเฉพาะ volume ของข้อมูล
docker volume rm fastnumeric-data

# จากนั้นเริ่มระบบใหม่ ฐานข้อมูลจะถูกสร้างใหม่ว่างเปล่า
docker compose up -d
```

## API Endpoints

| Method | Path | คำอธิบาย |
|---|---|---|
| GET | `/api/methods` | รายการหมวด/วิธีคำนวณ + field definitions |
| POST | `/api/calculate` | คำนวณ (body: `{ method, input }`) และบันทึกประวัติ |
| GET | `/api/history?limit=&offset=` | รายการประวัติ |
| GET | `/api/history/:id` | รายละเอียดโจทย์ + ผลลัพธ์ย้อนหลัง |
| DELETE | `/api/history/:id` | ลบโจทย์และประวัติของโจทย์นั้น |
| GET | `/api/stats` | สถิติ Dashboard |
| GET | `/api/health` | Health check |

### ตัวอย่างการเรียก API

```bash
curl -X POST http://localhost:4000/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"method":"bisection","input":{"fx":"x^3 - x - 2","xl":1,"xu":2,"tol":0.000001,"maxIter":100}}'
```

## การแสดงสมการ f(x)

รองรับ `+ - * / ^` วงเล็บ การคูณละเครื่องหมาย (`2x`, `3(x+1)`) ฟังก์ชัน `sin cos tan asin acos atan sqrt exp ln log abs` และค่าคงที่ `pi`, `e` (เช่น `x^3 - x - 2`, `cos(x) - x`, `sqrt(x)`, `exp(-x^2)`, `1e-6`)

## การจัดการกรณีพิเศษ

- หารด้วยศูนย์ / ฟังก์ชันไม่นิยาม (เช่น `sqrt` ค่าลบ) → ข้อความ error ชัดเจน
- เมทริกซ์เอกฐาน (Singular) → แจ้งว่าระบบไม่มีคำตอบ/มีไม่จำกัด
- Bisection ที่ช่วงไม่มีการเปลี่ยนเครื่องหมาย → แจ้งพร้อมค่า f(XL), f(XU)
- การวนซ้ำไม่ลู่เข้า → แสดงค่าประมาณพร้อมคำเตือน ไม่แอบแสดงค่าผิดเป็นค่าถูก
- Interpolation กับ x นอกช่วง → แนะนำให้ใช้หมวด Extrapolation (และกลับกัน)
- Simpson's 1/3 กับ n เป็นเลขคี่ → แจ้งให้กรอกค่าคู่

## การทดสอบ

```bash
cd server
npm test    # 37 test cases ครอบคลุมทุกวิธี + กรณี error
```

ชุดทดสอบใช้โจทย์ที่ตรวจสอบคำตอบได้จริง เช่น `x³ − x − 2 = 0` (ราก 1.5214), `∫₀¹ x² dx = 1/3`, ระบบเชิงเส้นที่คำตอบเป็นจำนวนเต็ม ฯลฯ
#   O O P N u m e r i c  
 #   O O P N u m e r i c  
 