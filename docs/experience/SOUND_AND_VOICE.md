# Sound and Voice

**Default product posture: silence.**

Sound and voice are optional premium layers — never required to understand or operate ISALWA.

---

## Sound

### Decision (v1 / near-term)

| Question | Answer |
|----------|--------|
| Use sound? | **No by default** |
| Intro music? | **No** |
| UI ticks? | Optional later; off by default |
| Can users disable? | Yes — master toggle; respect OS mute |

### If UI sound lands later (P3)

Allowed events only:

- Quote accepted (soft confirmation, ≤200ms, low volume)  
- Check-in success  
- Error (different timbre, still quiet)  

Never:

- Looping ambience  
- Typing sounds  
- Notification cacophony  
- Autoplay on load  

Implementation constraints: Web Audio with user-gesture unlock; volume ≤20% system; store preference `isalwa_sound=off|on`.

---

## Voice

### Decision

| Question | Answer |
|----------|--------|
| Narrated walkthrough? | **Optional premium**, not MVP |
| Language | Spanish first (Bolivia); English later |
| Autoplay? | **Never** |
| Once? | Default play-once per user; always skippable |
| Replay? | Yes from Help |
| Sync to tour? | Yes — voice follows guided tour steps |

### Script principles

- Same emotional arc as `DEMO_JOURNEY.md`  
- Short lines; leave silence for reading UI  
- No jokes that date; no gendered assumptions  

### Technical

- Pre-recorded audio preferred over TTS for brand quality  
- Captions always on when voice plays  
- Reduced motion does not block captions  

---

## Brand voice (verbal, not audio)

Already in product:

- Pulso system sentence  
- InsightCard summaries  
- Empty-state teaching copy  

This is the primary “voice” of ISALWA — keep investing here before microphones.
