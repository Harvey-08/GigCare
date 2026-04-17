# GigCare Development Standards & Best Practices

## Documentation Note (Current Runtime)

This file focuses on process standards. For live environment setup and exact runtime endpoints, use [SETUP_AFTER_CLONE.md](SETUP_AFTER_CLONE.md).

## 📋 Table of Contents
1. [Git Workflow](#git-workflow)
2. [Code Quality](#code-quality)
3. [Testing](#testing)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Deployment](#deployment)
6. [Security](#security)

---

## Git Workflow

### Branch Strategy: Git Flow

We follow a modified Git Flow workflow:

```
master (main)
├── feature/admin-auth
├── feature/trigger-panel
├── fix/bug-description
├── docs/documentation-updates
└── release/v1.0.0
```

### Creating a Feature Branch

```bash
# Pull latest master
git checkout master
git pull origin master

# Create feature branch
git checkout -b feature/feature-name

# Example feature names:
# - feature/admin-dashboard
# - feature/claim-automation
# - feature/ml-integration
```

### Commit Message Convention

Follow Conventional Commits:

```
type(scope): subject

body

footer
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Code style (formatting)
- `refactor:` - Code refactoring
- `perf:` - Performance improvement
- `test:` - Testing
- `chore:` - Maintenance

**Examples:**
```bash
git commit -m "feat(auth): Add admin authentication system

- Implement admin table in database
- Create /api/auth/admin-login endpoint
- Add JWT token generation for admin role"

git commit -m "fix(claims): Fix claim detail response structure

Resolves issue where claim_id was undefined"

git commit -m "docs: Add development guidelines"
```

### Pull Request Process

1. **Make your changes**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

2. **Push to GitHub**
   ```bash
   git push -u origin feature/your-feature
   ```

3. **Create PR on GitHub**
   - Title: `[FEATURE] Add admin authentication`
   - Description: Clear explanation of changes
   - Link related issues

4. **PR Template** (use auto-generated)
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] New feature
   - [ ] Bug fix
   - [ ] Breaking change

   ## How to Test
   Steps to verify the changes

   ## Checklist
   - [ ] Tests pass
   - [ ] Code follows style guide
   - [ ] Documentation updated
   - [ ] No breaking changes
   ```

5. **Code Review**
   - Minimum 1 approval required
   - All CI checks must pass
   - Address feedback

6. **Merge to Master**
   - Use "Squash and merge" for clean history
   - Delete feature branch

### Merging to Master

```bash
# Via GitHub UI (recommended)
# - Use "Squash and merge" option
# - Delete branch after merge

# Or locally
git checkout master
git pull origin master
git merge feature/your-feature
git push origin master
git branch -d feature/your-feature
```

---

## Code Quality

### Pre-Commit Checks

Hooks automatically run before each commit:

```bash
git config core.hooksPath .githooks

# Runs:
# - ESLint (code quality)
# - Prettier (formatting)
# - Jest tests
```

### Manual Quality Checks

```bash
# Lint
cd services/api
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues

# Format
npm run format      # Format all code
npm run format:check # Check formatting

# Test
npm test            # Run all tests
npm test:watch      # Watch mode
```

### Code Style Guidelines

**JavaScript/Node.js:**
- Use `const` by default
- 2-space indentation
- Semicolons required
- Single quotes for strings
- Max line width: 100 characters

**React:**
- Functional components
- Use hooks
- OneComponent per file
- Props validation

**SQL:**
- UPPERCASE for keywords
- snake_case for columns
- Foreign key constraints
- Indexes on frequently queried columns

---

## Testing

### Unit Tests

Located in `services/api/test/`

```javascript
describe('Auth API', () => {
  it('should register worker successfully', async () => {
    // Arrange
    const mockData = { ... };
    
    // Act
    const response = await request(app)
      .post('/api/auth/register')
      .send(mockData);
    
    // Assert
    expect(response.status).toBe(201);
  });
});
```

### Running Tests

```bash
cd services/api

# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test
npm test -- auth.test.js

# Watch mode
npm test:watch
```

### Test Coverage Goals

Aim for:
- **Coverage:** 80%+ lines
- **Critical paths:** 100% (auth, payments, claims)
- **Edge cases:** Documented and tested

---

## CI/CD Pipeline

### GitHub Actions

Automatic checks on every push and PR:

```yaml
# Triggered on:
- Pull requests to master
- Pushes to master

# Runs:
1. Linting & formatting checks
2. Unit tests
3. Docker build
4. Security scanning (Trivy)
```

### Pipeline Status

View at: `https://github.com/Harvey-08/GigCare/actions`

**Required:** All checks must pass before merging

```bash
# Run locally (optional)
docker-compose build
docker-compose up -d

# Test endpoints
curl http://localhost:3001/health
```

### Handling Pipeline Failures

**Linting Failed:**
```bash
npm run lint:fix
git add .
git commit --amend
git push --force-with-lease
```

**Tests Failed:**
```bash
npm test
# Fix the failing test
git add .
git commit -m "test: Fix failing test"
git push
```

---

## Deployment

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Database migrations working
- [ ] Environment variables configured
- [ ] Security audit completed
- [ ] Performance tested

### Deployment Steps

```bash
# 1. Tag release
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# 2. Create release notes
# On GitHub: Releases → Create new → Add changelog

# 3. Deploy to production
# (Follow specific deployment guide)
```

### Rollback Procedure

```bash
# Identify stable version
git log --oneline | head -20

# Revert specific commit
git revert <commit-hash>
git push origin master

# Or reset to previous tag
git reset --hard v0.9.0
git push -f origin master
```

---

## Security

### Best Practices

1. **Secrets Management**
   - Never commit `.env` files
   - Use environment variables
   - Rotate secrets regularly

2. **Dependency Security**
   - Keep packages updated
   - Review dependency notifications
   - Audit packages: `npm audit`

3. **Code Review**
   - Security-focused reviews
   - Check for SQL injection
   - Validate all inputs

4. **Database**
   - Use parameterized queries
   - Implement access control
   - Regular backups

### Security Scanning

Automatic via GitHub Actions + Trivy:

```bash
# Run locally
docker run -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy fs .
```

---

## Common Workflows

### Adding a New Feature

```bash
# 1. Create branch
git checkout -b feature/new-feature

# 2. Make changes
# ... edit files ...

# 3. Test locally
./start.sh
npm test

# 4. Commit
git add .
git commit -m "feat(scope): Add new feature"

# 5. Push & create PR
git push -u origin feature/new-feature
# Create PR on GitHub

# 6. After approval, merge via GitHub UI
```

### Fixing a Bug

```bash
# 1. Create branch
git checkout -b fix/bug-name

# 2. Reproduce bug
# Write test that fails

# 3. Fix bug
# ... edit code ...

# 4. Verify test passes
npm test

# 5. Commit & push
git commit -m "fix(module): Fix bug description"
git push -u origin fix/bug-name
```

### Reviewing Code

```bash
# 1. Check out PR branch
git fetch origin
git checkout origin/feature/branch-name

# 2. Test locally
npm test

# 3. Review code
# Provide feedback on GitHub

# 4. Approve or request changes
# Use GitHub review interface
```

---

## Team Guidelines

### Code Review Standards

- **Maintainability:** Is the code easy to understand?
- **Performance:** Any obvious inefficiencies?
- **Security:** Any vulnerabilities?
- **Tests:** Is it properly tested?
- **Documentation:** Clear and accurate?

### Commit Discipline

- **One concern per commit** - Easier to revert if needed
- **Descriptive messages** - Helps others understand changes
- **Test before pushing** - Reduce CI failures
- **Keep branches short-lived** - Avoid merge conflicts

### Communication

- Use GitHub issues for discussions
- Link PRs to related issues
- Provide detailed PR descriptions
- Respond to review feedback promptly

---

**Last Updated:** April 1, 2026  
**Version:** 1.0  
**Maintainer:** GigCare Development Team
