---
name: Hover interaction pattern
description: Consistent hover/focus treatment for all interactive elements; never use hover:underline
---

## Rule
`hover:underline` is banned. Every interactive element uses one of three established patterns.

**Why:** Underline hover is inconsistent with ISALWA's motion vocabulary and design language. The three patterns below cover all cases and use motion tokens.

**How to apply:** When you encounter `hover:underline`, replace with one of the patterns below based on context.

## Three approved patterns

### 1. Glaze/colored inline links (small, in-paragraph or sidebar)
```
className="transition-opacity duration-[var(--isalwa-motion-fast)] hover:opacity-70"
style={{ color: 'var(--isalwa-glaze)', fontWeight: 500 }}
```

### 2. Row/list item background reveal (table rows, invoice rows, conversation list items)
```
className="group flex items-center ... transition-colors duration-[var(--isalwa-motion-fast)] ease-[var(--isalwa-ease-out)] hover:bg-[var(--isalwa-porcelain)] focus-visible:bg-[var(--isalwa-porcelain)]"
```

### 3. "Abrir →" ghost reveal (card children, panel links)
```
// Parent gets: className="group"
// Arrow child gets:
className="opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--isalwa-motion-fast)]"
```

## Focus rings
All interactive elements also need `focus-visible:outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]` or equivalent ring.
