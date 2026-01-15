# Reusable Components

Documentation for shared React components used across the application.

---

## CPU Scheduler Components

### ProcessTimeline

Renders the Gantt chart visualization.

**Location**: `components/ProcessTimeline.jsx`

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `ganttChart` | `Array` | Array of execution blocks |

---

### MetricsPanel

Displays performance metrics in a grid.

**Location**: `components/MetricsPanel.jsx`

**Metrics Displayed:**

- Average Waiting Time
- Average Turnaround Time
- Average Response Time
- CPU Utilization
- Throughput
- Context Switches

---

### ProcessInput

Form for adding new processes.

**Location**: `components/ProcessInput.jsx`

---

### ComparisonPanel

Side-by-side algorithm comparison.

**Location**: `components/ComparisonPanel.jsx`

---

### ExplanationPanel

Step-by-step algorithm explanations.

**Location**: `components/ExplanationPanel.jsx`

---

## Common Patterns

### Animation with Framer Motion

```jsx
import { motion, AnimatePresence } from 'framer-motion';

<AnimatePresence>
  {condition && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      Content
    </motion.div>
  )}
</AnimatePresence>
```

### Error Notification

```jsx
{error && (
  <motion.div className="error-notification">
    <span className="error-icon">❌</span>
    <span>{error}</span>
    <button onClick={() => setError(null)}>×</button>
  </motion.div>
)}
```

### Help Modal

```jsx
{showHelp && (
  <div className="help-overlay" onClick={() => setShowHelp(false)}>
    <div className="help-modal" onClick={e => e.stopPropagation()}>
      <h2>Help</h2>
      {/* Content */}
      <button onClick={() => setShowHelp(false)}>Close</button>
    </div>
  </div>
)}
```

---

## Styling Conventions

### CSS Variables

```css
:root {
  --primary: #00ffaa;
  --secondary: #ff00aa;
  --bg-dark: #0a0a0f;
  --card-bg: rgba(0, 255, 170, 0.05);
}
```

### Card Component

```css
.card {
  background: var(--card-bg);
  border: 1px solid rgba(0, 255, 170, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
}
```
