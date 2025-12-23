# Project Guidelines

## Commit Messages

Use conventional commits format for all commit messages.

Format: `type(scope): description`

### Types
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, semicolons, etc.)
- `refactor` - Code refactoring without feature changes
- `perf` - Performance improvements
- `test` - Adding or updating tests
- `chore` - Maintenance tasks, dependencies, build changes
- `ci` - CI/CD configuration changes
- `revert` - Reverting previous commits

### Examples
- `feat(items): add image upload functionality`
- `fix(locations): correct sorting order`
- `chore(deps): update dependencies`
- `docs(readme): add setup instructions`

### Rules
- Use imperative mood in descriptions ("add" not "added")
- Keep the first line under 72 characters
- Scope is optional but recommended
- Do not include Claude Code mentions, attribution, or "Generated with" footers