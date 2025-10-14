# Development Setup Guide

## Overview

This project is a full-stack application with separate frontend and backend services. Proper setup requires running multiple processes simultaneously.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Server    │    │   Database      │
│   (Vite)        │◄──►│   (Bun)         │◄──►│   (Neon)        │
│   Port: 8080    │    │   Port: 4000    │    │   Cloud         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Required Processes

### 1. API Server (Port 4000)
- **Purpose**: Serves costume data from Neon database
- **Command**: `bun run serve:api`
- **Environment**: Loads `.env` file automatically
- **Health Check**: http://localhost:4000/api/health

### 2. Frontend Dev Server (Port 8080)
- **Purpose**: React development server with hot reload
- **Command**: `bun run dev`
- **Proxy**: Routes `/api/*` requests to http://localhost:4000
- **Access**: http://localhost:8080

### 3. Database (Neon Cloud)
- **Purpose**: Stores costume data, categories, and assets
- **Configuration**: Via `NEON_DATABASE_URL` in `.env`
- **Seeding**: `bun run seed:costumes`

## Quick Start Commands

### Option 1: Full Development Stack (Recommended)
```bash
# Start both API and frontend simultaneously
bun run dev:full
```

### Option 2: Manual Setup
```bash
# Terminal 1: Start API server
bun run serve:api

# Terminal 2: Start frontend
bun run dev
```

### Option 3: Validation First
```bash
# Check if everything is working
bun run dev:check
```

## Environment Configuration

### Required Environment Variables
Create a `.env` file in the root directory:

```env
NEON_DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
```

### Environment File Template
```bash
# Copy the template and fill in your values
cp .env.example .env
```

## Common Issues & Solutions

### Issue: "Ghost icons" instead of costume images
**Cause**: Frontend can't reach API server
**Solution**: 
1. Ensure API server is running: `bun run serve:api`
2. Check proxy configuration in `vite.config.ts`
3. Verify with: `curl http://localhost:8080/api/costumes`

### Issue: "NEON_DATABASE_URL is not set"
**Cause**: Environment variables not loaded
**Solution**:
1. Check `.env` file exists and contains the URL
2. Verify API server command includes `--env-file=.env`
3. Run: `bun run dev:check` to validate

### Issue: API returns fallback data instead of Neon data
**Cause**: Database connection failed
**Solution**:
1. Verify `NEON_DATABASE_URL` is correct
2. Check database connectivity: `curl http://localhost:4000/api/health`
3. Re-seed database: `bun run seed:costumes`

## Development Workflow

### Adding New Costumes
1. Edit `server/costumes.json`
2. Run seeding script: `bun run seed:costumes`
3. Verify API response: `curl http://localhost:4000/api/costumes`
4. Check frontend display: http://localhost:8080

### Database Operations
```bash
# Seed costumes to Neon
bun run seed:costumes

# Seed with asset preservation
bun run seed:costumes --preserve-assets

# Check database status
curl http://localhost:4000/api/health
```

### Testing API Endpoints
```bash
# Health check
curl http://localhost:4000/api/health

# All costumes
curl http://localhost:4000/api/costumes

# Specific costume
curl http://localhost:4000/api/costumes/rosalina

# Featured costumes
curl http://localhost:4000/api/costumes/featured
```

## Port Configuration

| Service | Port | Purpose |
|---------|------|---------|
| Frontend | 8080 | Vite dev server |
| API Server | 4000 | Bun API server |
| Database | 5432 | Neon PostgreSQL (cloud) |

## Proxy Configuration

The frontend uses Vite's proxy to route API requests:

```typescript
// vite.config.ts
proxy: {
  '/api': {
    target: 'http://localhost:4000',
    changeOrigin: true,
  },
}
```

This means:
- Frontend requests to `/api/costumes` → `http://localhost:4000/api/costumes`
- CORS issues are avoided
- Development feels like a single application

## Troubleshooting Checklist

### Before Starting Development
- [ ] `.env` file exists with `NEON_DATABASE_URL`
- [ ] Node.js/Bun installed
- [ ] Dependencies installed: `bun install`

### When Issues Occur
1. **Run validation**: `bun run dev:check`
2. **Check processes**: Both API and frontend should be running
3. **Verify connectivity**: Test API endpoints directly
4. **Check logs**: Look for error messages in terminal outputs

### Common Port Conflicts
If ports are in use:
```bash
# Kill processes on ports 4000 and 8080
lsof -ti:4000 | xargs kill -9
lsof -ti:8080 | xargs kill -9
```

## Performance Tips

### Development
- Use `bun run dev:full` for concurrent startup
- Run `bun run dev:check` before starting work
- Keep API server running during frontend development

### Database
- Use `--preserve-assets` when updating costume data
- Monitor Neon database usage
- Cache API responses in frontend when possible

## Next Steps

1. Run `bun run dev:check` to validate setup
2. Start development with `bun run dev:full`
3. Visit http://localhost:8080 to verify everything works
4. Check the costume management workflow documentation for detailed operations

## Related Documentation

- [Costume Management Workflow](./COSTUME_MANAGEMENT_WORKFLOW.md)
- [API Documentation](./functions/netlify-api.md)
- [Database Migration Guide](./COSTUME_DB_MIGRATION.md)