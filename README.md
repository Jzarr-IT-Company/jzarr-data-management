# Jzarr Data Manage Backend

MySQL + Prisma + Express backend for the Jzarr Data Management system.

## Setup

1. Copy `.env.example` to `.env`
2. Set `DATABASE_URL` for your MySQL database
3. Run `npm install`
4. Run `npm run prisma:generate`
5. Run `npm run prisma:migrate`
6. Run `npm run prisma:seed`
7. Start development server with `npm run dev`

## Render Deployment

1. Create a Render **Web Service** from this repository.
2. Set the build command to:
   ```bash
   npm install && npm run prisma:generate:deploy && npm run build
   ```
3. Set the start command to:
   ```bash
   npm start
   ```
4. Add these environment variables on Render:
   - `NODE_ENV=production`
   - `PORT=10000`
   - `DATABASE_URL=...` for the SiteGround MySQL database
   - `CORS_ORIGINS=https://management.jzarr.com`
   - `JWT_ACCESS_SECRET=...`
   - `JWT_REFRESH_SECRET=...`
   - `JWT_ACCESS_EXPIRES_IN=15m`
   - `JWT_REFRESH_EXPIRES_IN=7d`
5. In SiteGround, allow the Render service outbound IP ranges for the MySQL database.
   - You can find those outbound IP ranges in the Render service dashboard.
6. Run Prisma migrations on Render:
   ```bash
   npm run prisma:migrate:deploy
   ```
   - If your plan does not support a pre-deploy command, run this as a one-off job after deploy.
7. Seed only if you want the default admin/departments in production:
   ```bash
   npm run prisma:seed:deploy
   ```
8. Confirm the deployed API responds at:
   - `/api/v1/health`
   - `/api/v1/auth/login`
   - `/api/v1/departments`
   - `/api/v1/dashboard/overview`
