# OrderHub — Backend API

NestJS REST API for the OrderHub Cafe POS system.

## Stack
| Layer | Tech |
|---|---|
| Framework | NestJS 11 |
| Language | TypeScript 5 |
| Database | PostgreSQL via Neon DB |
| ORM | Prisma 7 |
| Auth | JWT (Bearer) + Better Auth session sharing |
| Docs | Swagger UI — `/api/docs` |

## Modules

| Module | Routes | Description |
|---|---|---|
| `auth` | `POST /api/auth/register` `POST /api/auth/login` `GET /api/auth/me` | Registration, login, profile |
| `floors` | `GET/POST/PUT/DELETE /api/floors` + `/tables` | Floor plan & table management |
| `menu` | `GET/POST/PUT/DELETE /api/menu/categories` + `/items` | Menu categories & items |
| `orders` | `GET/POST /api/orders` + pay, transfer, items | POS order lifecycle |
| `users` | `GET/PATCH/DELETE /api/users` | Staff management |
| `analytics` | `GET /api/analytics/revenue` `/top-items` `/hourly` `/tables` | Reports |

## Setup

```bash
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET
npm install
npm run db:push        # push schema to Neon DB
npm run start:dev      # http://localhost:4000
```

Swagger UI: http://localhost:4000/api/docs

## Role Hierarchy

```
OWNER → MANAGER → STAFF → KITCHEN
```
- **OWNER** — full access including user management & analytics
- **MANAGER** — menu, floors, reports, orders
- **STAFF** — create/manage orders, update table status
- **KITCHEN** — view kitchen queue, update item status
