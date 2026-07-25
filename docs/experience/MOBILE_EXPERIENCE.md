# Mobile Experience

Desktop is the reference (Mission 12). Mobile must feel **native-grade**, not shrunk desktop.

---

## Principles

1. Thumb zones own primary commits  
2. One job per screen when space is tight (master-detail)  
3. No horizontal scrolling  
4. Hover is optional enhancement — never required  
5. Same design tokens; denser spacing only via 8px scale  
6. Offline / camera / GPS are **enhancements** later — don’t redesign chrome for them  

---

## Navigation

**Today:** sticky top bar + left kiln drawer (Mission 12).

| Pattern | Spec |
|---------|------|
| Open | Menú → slide drawer |
| Close | Scrim / Esc / navigate / ✕ |
| Brand | Alive-dot + ISALWA |
| Depth | Drawer above content; not a route |

Future (P2): optional bottom tab bar for 4 core instruments — only if drawer friction shows in research. Do not dual-nav without evidence.

---

## Layout patterns

| Experience | Mobile layout |
|------------|---------------|
| Pulso | Stack vitals 1→2 col; inbox full width |
| Radar | Full-width risk cards |
| Personas | **Cards** (not wide table) |
| Dossier | Stack vitals; timeline full; sticky identity |
| Territorio | Map dominant; filters in bottom sheet (P1) |
| Señal | List **or** thread; `← Bandeja` |
| Cierre | Stack catalog above quote; sticky actions |
| Memoria | Stack preview columns |

---

## Gestures (target)

| Gesture | Use | Priority |
|---------|-----|----------|
| Tap | Primary | Exists |
| Scrim tap | Close drawer | Exists |
| Swipe back | Señal thread → list | P1 |
| Swipe down | Dismiss bottom sheet | P1 |
| Long press | Map pin details | P2 |
| Pinch | Map zoom | Native P1 |

Avoid gesture-only actions.

---

## Bottom sheets (P1)

Use for:

- Territorio filters  
- Señal channel picker if tabs overflow  
- Quote discount confirm  

Visual: porcelain sheet, mist handle, radius panel, whisper-in.

---

## Floating actions

Sparingly:

- Tour FAB stays **desktop** unless mobile tour exists  
- Check-in near map thumb zone when visit mode (P2)  
- Never cover Señal composer or quote sticky actions  

---

## Offline (P2–P3)

- Read-only last Pulso vitals cache  
- Queue check-in when reconnecting  
- Clear offline banner (not modal)  

---

## Camera / GPS / Voice (P2–P3)

| Capability | Experience |
|------------|------------|
| GPS check-in | Confirm sheet with map snapshot; privacy note |
| Camera | Attach visit evidence — optional |
| Voice input | Composer / ⌘K — OS keyboard voice first before custom |

All opt-in; never surprise permission prompts on launch.

---

## Performance feel

- Drawer <160ms to interactive  
- Señal pane switch instant  
- Map: show surface before pins  

---

## Anti-patterns

- Desktop hover tours on mobile  
- Tiny tap targets in kiln drawer  
- Two scroll areas fighting  
- Full dual-pane Señal on phone  
