# Contributing Guide

Thank you for your interest in contributing to the OS Simulator!

---

## Getting Started

1. Fork the repository
2. Clone your fork
3. Create a feature branch: `git checkout -b feature/your-feature`
4. Make your changes
5. Test thoroughly
6. Submit a pull request

---

## Development Setup

See [Installation Guide](INSTALLATION.md) for setting up your development environment.

---

## Code Style

### Frontend (JavaScript/React)

- Use functional components with hooks
- Use `camelCase` for variables and functions
- Use `PascalCase` for component names
- Add JSDoc comments for complex functions

```javascript
// Good
const handleProcessAdd = useCallback((process) => {
  setProcesses([...processes, process]);
}, [processes]);

// Component
const MetricsPanel = ({ metrics }) => {
  return <div className="metrics-panel">...</div>;
};
```

### Backend (Python)

- Follow PEP 8 style guide
- Use type hints
- Add docstrings for functions and classes

```python
def calculate_waiting_time(process: Process) -> int:
    """
    Calculate waiting time for a process.
    
    Args:
        process: The process to calculate for
        
    Returns:
        Waiting time in time units
    """
    return process.completion_time - process.arrival_time - process.burst_time
```

### CSS

- Use CSS variables for colors and spacing
- Use BEM-like naming: `.component-name__element--modifier`
- Keep specificity low

```css
.metrics-panel {
  background: var(--card-bg);
}

.metrics-panel__item {
  padding: var(--space-md);
}

.metrics-panel__item--highlighted {
  border-color: var(--primary);
}
```

---

## Project Structure

```
├── frontend/src/
│   ├── pages/          # Main page components
│   ├── components/     # Reusable components
│   ├── services/       # API calls
│   └── utils/          # Helper functions
├── backend/
│   ├── schedulers/     # Scheduling algorithms
│   ├── memory/         # Memory management
│   ├── filesystem/     # File system
│   └── routes/         # API endpoints
```

---

## Adding New Features

### New Scheduling Algorithm

1. Create `backend/schedulers/your_algorithm.py`
2. Extend `BaseScheduler` class
3. Implement `schedule()` method
4. Register in `schedulers/__init__.py`
5. Add to frontend algorithm selector
6. Add tests

### New Memory Module

1. Create backend logic in `backend/memory/`
2. Create API routes in `backend/routes/`
3. Create frontend page in `frontend/src/pages/`
4. Add navigation from Memory Management page
5. Document in `docs/modules/`

---

## Testing

### Backend Tests

```bash
cd backend
pytest tests/ -v
```

### Manual Testing

1. Test all algorithms with demo scenarios
2. Verify metrics calculations
3. Check responsive design
4. Test keyboard shortcuts

---

## Pull Request Guidelines

1. **Title**: Clear, descriptive title
2. **Description**: Explain what and why
3. **Testing**: Describe how you tested
4. **Screenshots**: Include for UI changes
5. **Documentation**: Update docs if needed

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update

## Testing
How was this tested?

## Screenshots
(if applicable)
```

---

## Issue Reporting

Include:

- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Browser/OS version
- Screenshots if applicable

---

## Areas for Contribution

### High Priority

- Additional scheduling algorithms
- More memory management features
- Enhanced visualizations
- Mobile responsiveness

### Good First Issues

- Improve error messages
- Add tooltips
- Fix typos in documentation
- Add preset scenarios

### Documentation

- Tutorials
- Video guides
- Translations

---

## Community

- Be respectful and constructive
- Help others learn
- Share your educational use cases

---

## License

Educational project - contributions remain open for learning purposes.
