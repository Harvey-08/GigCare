# Contributing to GigCare

## Development Workflow

### 1. Git Workflow
We follow a feature branch workflow:

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: Add your feature description"

# Push and create PR
git push -u origin feature/your-feature-name
```

### 2. Branch Naming Convention
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation
- `refactor/` - Code refactoring
- `test/` - Testing related

### 3. Commit Message Format
```
type(scope): description

Types: feat, fix, docs, style, refactor, test, chore
```

### 4. Pull Request Process
1. Create feature branch from `master`
2. Implement changes
3. Test locally with `./start.sh`
4. Create PR with description
5. Code review and approval
6. Merge to master

## Development Setup

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (optional, for local development)
- Git

### Quick Start
```bash
git clone https://github.com/Harvey-08/GigCare.git
cd gigcare_phase2_build
./start.sh
```

### Local Development
```bash
# Start only database
docker-compose up -d postgres

# Install dependencies
cd services/api && npm install
cd ../../apps/worker && npm install
cd ../admin && npm install

# Start services
npm start  # in each service directory
```

## Code Quality

### Linting
```bash
# API service
cd services/api
npm run lint

# React apps
cd apps/worker || cd apps/admin
npm run lint
```

### Testing
```bash
# API tests
cd services/api
npm test

# E2E tests
cd services/api
npm run test:e2e
```

## Database

### Schema Changes
1. Create migration file: `database/migrations/XXX_description.sql`
2. Update schema with proper constraints
3. Add seed data if needed
4. Test with `./start.sh`

### Data Seeding
Demo data is automatically loaded via `database/migrations/002_seed.sql`

## API Guidelines

### Endpoints
- Use RESTful conventions
- Include proper HTTP status codes
- Return consistent response format:
```json
{
  "data": { ... },
  "meta": { "timestamp": "..." }
}
```

### Authentication
- Use JWT tokens in Authorization header
- Admin endpoints require `ADMIN` role
- Worker endpoints require `WORKER` role

## Testing

### Manual Testing
- Worker flow: Register → Premium → Policy → Claims
- Admin flow: Login → Dashboard → Trigger Events
- Use demo credentials in README

### Automated Testing
- Unit tests for business logic
- Integration tests for API endpoints
- E2E tests for complete workflows

## Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates installed
- [ ] Monitoring setup
- [ ] Backup strategy in place

## Security

### Best Practices
- Never commit secrets to Git
- Use environment variables for config
- Validate all inputs
- Use parameterized queries
- Implement rate limiting

## Support

### Getting Help
1. Check existing issues on GitHub
2. Read the README and docs
3. Create an issue with detailed description
4. Include error logs and reproduction steps

### Code Review
- All PRs require review
- Focus on code quality, security, and functionality
- Tests must pass before merge
- Documentation updated as needed