# Anti-Slop UI Design Rule

This rule strictly enforces high-craft, human-designed, enterprise-grade UI standards and bans generic "AI Slop" design patterns across this project.

## 1. Hard Bans (Zero Tolerance for AI Slop)
- **No Radial Blur Blobs / Floating Orbs**: Never add useless background glow circles (e.g. `w-64 h-64 bg-blue-500/5 rounded-full blur-3xl`). Surfaces must be clean, deliberate, and architectural.
- **No Random Purple/Indigo/Pink AI Gradient Soup**: Avoid cliché AI gradients (`from-purple-600 to-indigo-600` or `from-pink-500 to-violet-500`) unless explicitly required by brand guidelines. Use the authentic JNE brand palette: Deep JNE Navy/Blue (`#004a8d`, `#002d62`), JNE Crimson Red (`#e31e24`), and crisp slate/zinc neutrals.
- **No Cartoonish Oversized Border Radiuses**: Stop applying `rounded-3xl` to standard cards and inputs. Use disciplined radii: `rounded-lg` (8px) for buttons/inputs, `rounded-xl` (12px) for cards, and `rounded-2xl` (16px) maximum for large modal shells.
- **No Low-Contrast Washed-Out Text**: Never use light gray (`text-slate-400` or `#94A3B8`) for essential text or body copy. Ensure WCAG AAA/AA readability (`text-slate-900`, `text-slate-700`, `text-slate-600`).
- **No Generic AI Marketing Clichés**: Eliminate vague filler subtitles (e.g., "Supercharge your daily workflow"). Keep labels concise, functional, and operational.
- **No Raw Emojis as Icons**: Use single-weight, crisp vector SVG icons (Lucide React) with consistent size (`size={14}` to `size={18}` for controls).

## 2. Information Density & Typography
- **Information Density**: Layouts must be compact, readable, and scan-friendly for real-world operations rather than airy mockups.
- **Hierarchy**:
  - Headings: `font-bold tracking-tight text-slate-900`.
  - Micro-labels: `text-[11px] font-semibold tracking-wider uppercase text-slate-500`.
  - Numbers/Stats: Use `tabular-nums` and `font-mono` where numbers align or compare.
- **Hairline Borders**: Use precise 1px borders (`border border-slate-200/80` or `border-slate-100`) to define structure instead of heavy drop shadows.

## 3. Tactile Controls & Interactive Precision
- **Buttons**: Clear visual hierarchy (Primary Solid Navy, Secondary Subtle Slate, Destructive Red). Active states must feel responsive with subtle translate or scale (`active:scale-[0.98]`).
- **Focus States**: High-contrast, accessibility-compliant focus rings (`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1`).
- **Segmented Controls**: Sleek, compact pill or tab switchers instead of giant chunky radio cards.
- **Status Pills**: Subtle tinted backgrounds (`bg-emerald-50 text-emerald-700 border-emerald-200/80`) paired with a crisp 6px solid status dot.
