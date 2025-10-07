# Old Baku — Full Stack Setup

## Frontend (static)
Serve the `/project` folder via any static server (Live Server, nginx, etc.).

## Backend (secure)
```
cd backend
cp .env.example .env   # fill values
npm i
npm run dev
```
- JWT auth for owner (email + bcrypt hash from `.env`).
- Rate limit, helmet, CORS restricted by `CLIENT_ORIGIN`.
- Endpoints:
  - `POST /api/auth/login` → {token}
  - `GET /api/rooms` (public)
  - `PUT /api/rooms/:id` (owner) → update price/title
  - `POST /api/book` → stores booking + sends email to OWNER_NOTIFY_EMAIL
  - `POST /api/create-checkout-session` → Stripe Checkout URL
  - `POST /webhook/stripe` → verify payments (set webhook in Stripe)
- Serve frontend separately at `CLIENT_ORIGIN` (default http://localhost:8000).

## Security Notes
- Use HTTPS in production (reverse proxy/hosting).
- Keep `.env` secrets out of repo.
- Set strong `JWT_SECRET` and bcrypt hash.
- Validate data and configure CORS to your domain.
