# TradeX Journal — Backend API

Express + TypeScript + MongoDB + JWT backend for the Trading Journal Web Application.

## Scripts

- `npm run dev`: Starts the development server with live reload via `tsx watch`.
- `npm run build`: Compiles TypeScript to JavaScript in `/dist`.
- `npm start`: Runs the compiled server from `dist/server.js`.
- `npm run seed`: Seeds the database with default admin, trader, and 93+ system options.
- `npm test`: Runs Vitest unit tests for services and middleware.

## API Endpoints

### Auth
- `POST /api/auth/login`: `{ email, password }`
- `POST /api/auth/refresh`: `{ refreshToken }`
- `POST /api/auth/logout`: Log out
- `GET /api/auth/me`: Current user profile

### Trades (requireTrader, scoped by userId)
- `GET /api/trades`: List trades with filters, pagination, and sorting
- `POST /api/trades`: Create new trade with auto-fields and summary
- `GET /api/trades/:id`: Get trade detail
- `PATCH /api/trades/:id`: Update trade
- `DELETE /api/trades/:id`: Delete trade
- `POST /api/trades/:id/regenerate-summary`: Re-compose summary
- `POST /api/trades/:id/screenshots`: Multipart upload (before, atEntry, after, extras)
- `GET /api/trades/export?format=csv|xlsx|pdf`: Export trades

### Analytics (Scoped)
- `GET /api/analytics/summary`: Aggregate KPIs
- `GET /api/analytics/breakdown?groupBy=session|pair|setup|emotion|day|week|month`
- `GET /api/analytics/equity-curve`: Cumulative equity & drawdown
- `GET /api/analytics/heatmap`: Day × Session edge matrix
- `GET /api/analytics/report?period=week|month`: AI performance review card
- `GET /api/analytics/compare?periodA=&periodB=`: Compare 2 time frames

### Options
- `GET /api/options?field=pair`: Fetch available options (system + user)
- `POST /api/options`: Create new custom option
- `DELETE /api/options/:id`: Delete custom option

### Admin (requireAdmin)
- `GET /api/admin/users`: List all users
- `POST /api/admin/users`: Create trader
- `PATCH /api/admin/users/:id`: Edit user / activate / reset password
- `DELETE /api/admin/users/:id`: Delete user
- `GET /api/admin/users/:id/journal`: Read-only view of a trader's journal
- `GET /api/admin/analytics`: Platform-wide aggregate KPIs
# jornal-backend
