# Aethera

A DePIN renewable energy financing platform built on Stellar blockchain that tokenizes solar assets to connect installers with investors through transparent, compliant, yield-generating digital assets.

## Tech Stack

- **Monorepo**: Turborepo with PNPM workspaces
- **Frontend**: Next.js 14 (App Router) with Tailwind CSS
- **Backend**: Node.js + Express with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Blockchain**: Stellar Network (Soroban smart contracts)
- **Auth**: JWT-based authentication with role-based access control

## Project Structure

```
aethera/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Express backend API
├── packages/
│   ├── database/     # Prisma schema + client
│   ├── stellar/      # Stellar SDK integration
│   ├── types/        # Shared TypeScript types
│   └── config/       # Shared configuration
├── turbo.json
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 20+
- PNPM 9+
- PostgreSQL database

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment files
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Update database URL in apps/api/.env

# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push

# Start development servers
pnpm dev
```

### Available Scripts

- `pnpm dev` - Start all apps in development mode
- `pnpm build` - Build all apps
- `pnpm lint` - Lint all packages
- `pnpm db:generate` - Generate Prisma client
- `pnpm db:push` - Push schema to database
- `pnpm db:studio` - Open Prisma Studio

## User Roles

- **Investor**: Browse marketplace, invest in projects, track yields
- **Installer**: Submit solar projects for funding, receive capital
- **Admin**: Approve projects, manage KYC, distribute yields

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects/marketplace` - List fundable projects
- `POST /api/projects` - Create project (installers)
- `GET /api/projects/:id` - Get project details

### Investments
- `POST /api/investments` - Make investment
- `GET /api/investments/my` - Get user investments

### Yields
- `GET /api/yields/history` - Get yield history
- `POST /api/yields/claim/:id` - Claim yield

## License

MIT
