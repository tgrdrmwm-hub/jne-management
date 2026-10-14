---
name: anti-slop
description: Enforce high-craft, human-designed, enterprise-grade UI design without AI generic tropes or slop.
---

# Anti-Slop UI Design Skill

Use this skill whenever designing or modifying UI components, layouts, pages, and interactive controls to eliminate AI design monoculture and deliver human-crafted, high-density, professional interfaces.

## Core Directives

1. **Brand Authenticity Over AI Gradient Tropes**:
   - Primary: JNE Deep Corporate Blue (`#004a8d`, `#002d62`) and JNE Red (`#e31e24`).
   - Surfaces: Crisp neutral surfaces (`bg-slate-50`, `#ffffff`, `#f8fafc`).
   - Hairline borders: 1px subtle borders (`border-slate-200/90`).
   - Never inject generic purple/indigo blur blobs or floating glowing circles.

2. **Information Density & Craft**:
   - Real operational workflows require density: clear tabular scanning, compact padding (`p-4` to `p-6`, not excessive `p-10`), and minimal whitespace waste.
   - Use `tabular-nums` for timestamps and quantities.
   - Use disciplined border radiuses: `rounded-lg` (8px), `rounded-xl` (12px), `rounded-2xl` (16px max).

3. **Typography Standards**:
   - Headings: `font-bold tracking-tight text-slate-900`.
   - Body: `text-slate-700` with high legibility.
   - Eyebrows & Meta: `text-[11px] font-bold tracking-wider uppercase text-slate-500`.

4. **Tactile Interaction**:
   - Clean micro-animations (`duration-150` or `duration-200`, avoid sluggish `transition-all duration-500`).
   - Accessible focus rings: `focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none`.
   - Refined segmented toggles and compact action toolbars.
