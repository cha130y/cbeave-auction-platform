# CBeave Auction Platform

แพลตฟอร์มประมูลออนไลน์แบบเรียลไทม์ — pnpm monorepo (Next.js App Router + NestJS + Prisma/PostgreSQL + Socket.IO)

**อย่าเปลี่ยน tech stack และอย่าเปลี่ยน schema โดยไม่ถาม**

## กติกาการทำงาน

- ตอบและอธิบายเป็นภาษาไทย
- อธิบายโค้ดที่แก้ทุกครั้ง (แก้อะไรไป ตำแหน่งไหน) ไม่ใช่แค่บอกว่าเสร็จแล้ว
- ห้าม commit ไฟล์ `.env` หรือ hardcode secret/API key ลงในโค้ดเด็ดขาด
- เช็ค `git status` ก่อนแก้ รักษาการแก้ไขที่ผู้ใช้ค้างไว้ และอย่าแตะไฟล์ที่ไม่เกี่ยวกับงาน
- อย่าบอกว่าเช็คผ่านถ้ายังไม่ได้รันจริง ถ้าข้ามขั้นไหนให้บอกว่าข้ามและเพราะอะไร

## Git commits

Do NOT add "Co-Authored-By: Claude" or "Claude-Session:" trailer to commit messages.

รูปแบบ: `<type>(<scope>): คำอธิบายภาษาอังกฤษสั้นๆ`

- type: `feat` / `fix` / `refactor` / `test` / `docs` / `chore` / `ci`
- scope: โมดูลที่แก้ เช่น `web`, `api`, `auth`, `auctions`, `users`, `live-arena`, `requirements` — ข้ามได้ถ้าเป็นงานทั่วไปที่ไม่ผูกกับโมดูลไหน (`chore: ...`)
- commit message เป็นภาษาอังกฤษเสมอ (เหมือน PR title/description)
- ตัวอย่างจริงในโปรเจคนี้:
  - `feat(api): add Swagger/OpenAPI documentation`
  - `fix(auth): handle Facebook OAuth cancellation`
  - `refactor(web): extract shared auth guards, schema primitives, and query helpers`

## Branch

รูปแบบ: `<type>/<area>-<คำอธิบายสั้น>`

ตัวอย่างจริง: `feat/api-documentation`, `fix/web-oauth-cancellation`, `refactor/web-shared-helpers`, `test/web-unit-foundation`

## PR step

- base branch ต้องเป็น `main`
- หลังจากที่มีการ commit ผ่านแล้ว ให้สร้าง PR title และ PR description (เป็นภาษาอังกฤษ) ให้สอดคล้องกันกับสิ่งที่ทำหรือแก้ไข กรอกตามแบบฟอร์ม `.github/PULL_REQUEST_TEMPLATE.md` ให้ครบ
- ช่อง "Related requirement IDs" ให้ใส่ requirement id จาก SRS ที่ commit นั้นตรงด้วย (เช่น `BID-001`, `AUTH-004`) ถ้าไม่ผูกกับ requirement ไหนให้เว้นไว้
- checklist "Verification" ให้ติ๊กเฉพาะที่รันจริงเท่านั้น
- ให้ผู้ใช้เป็นคนรีวิวและกด confirm PR เอง ห้ามกดให้

## แนวทางส่วนตัว — อย่าแก้ไฟล์นี้

ไฟล์ `CLAUDE.md` นี้เป็นกติกาหลักของโปรเจค ถ้าอยากเพิ่มขั้นตอนหรือแนวทางเฉพาะกิจ (เช่น ลำดับงานที่ทำอยู่, วิธีเทสที่ถนัด, สไตล์ส่วนตัว) **ให้สร้างเป็น slash command แทน:**

```
.claude/commands/<ชื่อที่อยากเรียก>.md
```

แล้วเรียกใช้ด้วย `/<ชื่อนั้น>` ตอนคุยกับ Claude Code

`.gitignore` กัน `.claude/` ไว้แล้ว ไฟล์จะอยู่แค่เครื่องตัวเอง ไม่ขึ้น git

## เอกสารประกอบ

- SRS (ฉบับใช้งาน): `docs/requirements/SRS-v1.1.md` — PDF ต้นฉบับ: `docs/requirements/CBeave-SRS-v1.0.pdf`
- Requirement traceability: `docs/requirements/REQUIREMENTS_TRACEABILITY.md`
- SRS changelog: `docs/requirements/SRS_CHANGELOG.md`
- ADR (บันทึกการตัดสินใจเชิงสถาปัตยกรรม): `docs/architecture/adr/0001-core-domain-decisions.md`
- Module map (ภาพรวมโมดูลทั้ง API และ Web): `docs/architecture/MODULE_MAP.md`
- ER Diagram (Version 1): `docs/architecture/erd/v1/cbeave-erd-v1.dbml`
- Database schema (source of truth): `apps/api/prisma/schema.prisma` + migrations ที่ commit แล้ว
- Roadmap: `PROJECT_ROADMAP.md`
- Changelog: `CHANGELOG.md` — อัปเดตเมื่อส่งมอบพฤติกรรมใหม่

## แนวทางเชิงสถาปัตยกรรมและวิธีทำงานกับ codebase

@agentskill.md
