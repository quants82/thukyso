# Thư Ký Số

Trợ lý xử lý văn bản và điều hành AI. Sản phẩm không phải dịch vụ chữ ký điện tử.

## Yêu cầu

- Node.js 22+
- pnpm 11+
- Docker Desktop hoặc Docker Engine với Compose

## Chạy local

```bash
copy .env.example .env
pnpm install
docker compose -f docker-compose.local.yml up -d
pnpm dev
```

- PWA: http://localhost:5173
- API: http://localhost:3000/api/v1
- Health: http://localhost:3000/api/v1/health
- PostgreSQL: localhost:5432
- Redis: localhost:6379

Health check Phase 1 trả:

```json
{
  "status": "ok",
  "database": "up",
  "redis": "up"
}
```

Khởi tạo database:

```bash
pnpm prisma:generate
pnpm prisma:migrate
```
