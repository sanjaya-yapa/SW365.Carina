# Personal Finance Budget App

## Stack

- Node.js + Express 5 (CommonJS)
- MySQL + mysql2 connection pool
- SQL stored procedures
- HTML, CSS, JavaScript, jQuery
- Bootstrap 5 + Bootstrap Icons

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

- Copy `.env.example` to `.env`
- Update DB credentials and port

3. Run in development mode:

```bash
npm run dev
```

4. Open in browser:

- `http://localhost:3000`

## Scripts

- `npm start` - run server once
- `npm run dev` - run with nodemon
- `npm run lint` - lint JS files
- `npm run format` - format all files
- `npm run format:check` - verify formatting

## Initial Structure

```text
src/
  app.js
  server.js
  config/db.js
  routes/
  controllers/
  services/
  middleware/
public/
  index.html
  pages/
  js/
  css/
sql/
  schema.sql
  procedures.sql
```
