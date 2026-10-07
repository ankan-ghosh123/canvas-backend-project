# Poetry Sharing Platform — Backend

A RESTful backend for a poetry-sharing social platform, built with Node.js, Express, and PostgreSQL. Supports user-generated poem posts (typed and image-upload), a global feed, a multi-stage admin content curation workflow, comments, and YouTube channel integrations — all designed with production-grade data integrity and query performance in mind.

> This is the backend only. No frontend is included in this repository.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture & Engineering Highlights](#architecture--engineering-highlights)
- [Tech Stack](#tech-stack)
- [Database Schema](#database-schema)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Security](#security)
- [API Endpoints](#api-endpoints)
- [Future Improvements](#future-improvements)

## Overview

This project started as a learning exercise in backend fundamentals and evolved into a fully-featured API covering authentication, content publishing, social feeds, and a real admin moderation workflow — with an emphasis on getting the database design and query patterns right, not just making the endpoints "work."

## Key Features

- **Dual post formats** — users can publish typed poems (with customizable text styling over a curated background image) or image-upload poems
- **Global feed** with cursor-based pagination
- **User profiles** showing a specific user's posts, also cursor-paginated
- **Admin content curation pipeline** — admin can mark notable posts, shortlist one as a candidate, and feature it as a site-wide "Poem of the Week"
- **Comments**, scoped to the current Poem of the Week, with edit/delete and ownership enforcement
- **YouTube channel integration** — a rotating list of the 5 most recent featured videos, and a single "coming soon" announcement poster
- **Account management** — email and password updates, both requiring re-authentication via current password
- **JWT authentication** with short-lived access tokens and rotating refresh tokens stored server-side

## Architecture & Engineering Highlights

A few decisions worth calling out, since they reflect deliberate tradeoffs rather than framework defaults:

**Cursor-based (keyset) pagination, not `OFFSET`**
Every paginated endpoint (feed, profile posts, comments) uses `WHERE (created_at, id) < (cursor_values) ORDER BY created_at DESC, id DESC` instead of `OFFSET`. This avoids the performance cliff `OFFSET` hits at scale, and avoids skipped/duplicated rows when new content is inserted between page loads. Composite B-tree indexes are built to match each query's exact filter + sort pattern.

**Database-enforced state machine for content curation**
The "mark → candidate → Poem of the Week" workflow isn't just managed by application logic — a `post_tracking` table combined with **partial unique indexes** guarantees at the database level that only one post can ever hold `CANDIDATE` status and only one can hold `POEM_OF_WEEK` status at a time, even under concurrent admin requests.

**Polymorphic post schema with conditional constraints**
A single `posts` table supports two structurally different post types (`TYPED` and `IMAGE_UPLOAD`) using a conditional `CHECK` constraint that only requires `poem_text` and `text_style_config` for typed posts. The styling config itself is stored as `JSONB` but validated against a strict schema (Zod) before it's ever persisted.

**Atomic multi-step writes**
Operations that touch multiple rows or tables together — promoting a post to Poem of the Week, retiring the previous one and its comments, the YouTube featured-video FIFO rotation — are wrapped in explicit PostgreSQL transactions (`BEGIN`/`COMMIT`/`ROLLBACK`) to avoid partial, inconsistent states.

**Defense-in-depth authorization**
Every write endpoint checks both authentication (valid JWT) and authorization (ownership or admin role) server-side — never inferred from the frontend. Identity for actions (`user_id` on writes) is always taken from the verified JWT payload, never trusted from the request body.

## Tech Stack

| Category | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express 5 |
| Database | PostgreSQL (`pg`) |
| Auth | JSON Web Tokens (`jsonwebtoken`), `bcryptjs` |
| Validation | `validator`, `zod` |
| File uploads | `multer`, ImageKit |
| Transactional email | Brevo |

## Database Schema

| Table | Purpose |
|---|---|
| `users` | Accounts, credentials, role, avatar, refresh token |
| `posts` | Typed and image-upload poem posts |
| `backgrounds` | Curated background images for typed posts (soft-deletable via `is_active`) |
| `post_tracking` | Admin curation state machine (marked / candidate / poem of the week) |
| `comments` | Comments on the current Poem of the Week post |
| `yt_vid` | Rotating list of the 5 most recently featured YouTube videos |
| `ytPosters` | Single active "coming soon" video announcement poster |

All foreign keys cascade on delete where appropriate, and all post/comment content is bounded by `CHECK` constraints (length limits) rather than relying solely on application-level validation.

## Project Structure

```
src/
  controllers/   # Request handlers, grouped by resource/ownership scope
  routers/       # Route definitions, mapped to controllers + middleware
  middleware/    # JWT verification, role-based authorization
  db/            # PostgreSQL connection pool setup
  utils/         # ApiError, ApiResponse response shaping
  seed/          # Admin seeding script
```

Controllers are split by access scope rather than just by resource — e.g. `admin.posts.controller.js` (admin-only actions) vs. `public.controller.js` (shared read endpoints) — to keep authorization boundaries obvious at a glance.

## Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+)

### Installation

```bash
git clone <this-repo-url>
cd <repo-folder>
npm install
```

### Setup

1. Create a PostgreSQL database.
2. Run the schema (see `/db` or your migrations folder) to create all tables, constraints, and indexes.
3. Copy `.env.example` to `.env` and fill in your values (see below).
4. Start the server:
   ```bash
   npm run dev     # with nodemon, for development
   npm start        # production
   ```

## Environment Variables

```env
PG_PORT=
PG_USER=
PG_PASSWORD=
DATABASE=

ACCESS_TOKEN_SECRET=
ACCESS_TOKEN_EXPIRY=
REFRESH_TOKEN_SECRET=
REFRESH_TOKEN_EXPIRY=

IMAGEKIT_PUBLIC_KEY=
IMAGEKIT_PRIVATE_KEY=
IMAGEKIT_URL_ENDPOINT=

BREVO_API_KEY=
```

## Security

- Passwords hashed with `bcryptjs` before storage, never logged or returned in API responses
- Access tokens are short-lived; refresh tokens are long-lived, stored server-side, and rotated on use
- Refresh token is invalidated (set to `NULL`) on password change, revoking all existing sessions
- All cookies set `httpOnly` to prevent client-side script access
- Role-based middleware (`authorizeRoleAccess`) gates all admin-only routes
- Ownership checks (not just authentication) enforced on every edit/delete endpoint



## API Endpoints

A full Postman collection with all endpoints, example requests, and auth flows is included:[`kobiterCanvas.postman_collection.json`](./kobiterCanvas.postman_collection.json)

To use it:
1. Open Postman → Import → select the file
2. Set your base URL (e.g., `http://localhost:3000`)
3. Run the "Login" request first to get your auth cookie for protected routes
4.for admin access there is example admin email and password login with that or create your on database and register a user with role "admin"
5.use your own data base table id in the place of  raw ids  mention in some update and delete api end points  in the collection
## Future Improvements

- Full-text / fuzzy search (`pg_trgm` for usernames and poem titles, `tsvector` for poem body text)
- TOTP-based two-factor authentication and account recovery (no external email/SMS dependency)
- Deployed live instance with API documentation
