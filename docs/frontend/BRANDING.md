# PacketFlow Branding Guide

## Overview
PacketFlow uses a cohesive visual identity with an integrated Logo component, favicon, and page title.

## Logo Component

### Location
`src/components/shared/Logo.tsx`

### Features
- **Responsive sizing**: `sm` (32px), `md` (48px), `lg` (64px)
- **Two variants**: `long` (with text) and `short` (icon only)
- **Theme support**: `dark` and `light` modes
- **No external dependencies**: Uses inline SVG rendering (avoids namespace issues)

### Usage Examples

#### Full branding in header
```tsx
import { Logo } from './components/shared';

<Logo variant="long" size="md" theme="dark" />
```

#### Light version for light backgrounds
```tsx
<Logo variant="long" size="md" theme="light" />
```

#### Compact icon only
```tsx
<Logo variant="short" size="sm" theme="dark" />
```

#### Large logo for landing pages
```tsx
<Logo variant="long" size="lg" theme="light" className="mx-auto mb-4" />
```

### Design Details

**Icon Design**: Network packet flow visualization
- Center node with 4 corner nodes (representing packet endpoints)
- Connection lines showing data flow
- Color-coded by theme (light blue for dark mode, dark blue for light mode)

**Color Palette**:
- **Dark Theme**: Light blue (#38BDF8) icon on dark background (#1F2937)
- **Light Theme**: Dark blue (#0B1220) icon on light background (#E5E7EB)

**Typography**:
- **Main text**: "PacketFlow" - Bold, sans-serif
- **Subtext**: "Security" - Regular, dimmed opacity

## Integration Points

### 1. MetricsBar (Header)
**File**: `src/components/core/MetricsBar.tsx`

The Logo component replaced the plain "PacketFlow" text heading:
```tsx
// Before:
<h1 className="text-xl font-bold text-text">PacketFlow</h1>

// After:
<Logo variant="long" size="md" theme="dark" />
```

### 2. HTML Page Title
**File**: `frontend/index.html`

```html
<title>PacketFlow - AI-Powered Network Security</title>
```

### 3. Favicon
**File**: `frontend/index.html`

```html
<link rel="icon" type="image/svg+xml" href="/icons/favicon.ico" />
```

The favicon is served from the `public/icons/` directory and loaded correctly by the browser.

## Asset Organization

### Directory Structure
```
public/
 images/
    logo/
        dark/
           packetflow-long-dark.svg
           packetflow-short-ruf-dark.svg
           packetflow-short-udf-dark.svg
        light/
            packetflow-long-light.svg
            packetflow-short-ruf-light.svg
            packetflow-short-udf-light.svg
 icons/
    favicon.ico
 fonts/
     (reserved for custom fonts)
```

### Asset Guidelines

**SVG Files (Original logos)**:
- Status: Contains complex external references that don't render in browsers
- Reason: Exported from design tool with unresolved xlink:href elements
- Solution: Created inline SVG Logo component (current production use)

**Favicon**:
- Format: ICO (binary format)
- Status:  Working correctly, loads on all browser tabs
- Size: 48x48 pixels recommended

## Future Improvements

### Optional Enhancements
1. **Replace SVG files**: If the design tool can export clean SVGs without external references
2. **SVGO Optimization**: Use SVGO CLI to optimize SVG files if they're corrected
3. **Favicon Variants**: Add PNG and Apple touch icons for better cross-platform support
4. **Animation**: Add subtle animations to the network nodes on hover/loading states

### npm Cache Issue Resolution
If SVGO installation is needed in the future:
```bash
# Clear npm cache completely
rm -rf ~/.npm && npm cache clean --force

# Then install SVGO
npm install -D svgo

# Optimize all SVG files
npx svgo public/images/logo --pretty
```

## Browser Compatibility

-  Chrome/Edge 90+
-  Firefox 88+
-  Safari 14+
-  Mobile browsers (iOS Safari 14+, Chrome Android 90+)

## Performance Notes

**Logo Component**:
- Zero external file dependencies (inline SVG)
- Minimal CSS overhead (Tailwind utility classes)
- Renders in <1ms on modern hardware
- File size: ~2KB minified (inline SVG definition)

**Page Performance**:
- No additional HTTP requests for branding
- Favicon loaded once per session
- Total branding assets: ~5KB uncompressed

## Testing Checklist

- [x] Logo displays correctly on MetricsBar
- [x] Favicon loads in browser tab
- [x] Page title shows "PacketFlow - AI-Powered Network Security"
- [x] Build completes successfully (1.57s)
- [x] All component sizes render at correct dimensions
- [x] Both themes display with correct colors
- [x] Long and short variants work as expected
- [x] TypeScript strict mode passes without errors

## Migration Notes

### Previous State
- Used text heading "PacketFlow" in MetricsBar
- Referenced AINetUI in multiple documentation files
- Icon references broken due to SVG external dependencies

### Current State
- Logo component with full branding support
- Favicon properly configured and loading
- All references updated to PacketFlow
- Clean, maintainable inline SVG implementation

## Contact & Support

For branding questions or asset updates, see:
- Component documentation: `src/components/shared/Logo.tsx`
- Asset organization: `public/README.md`
- General project info: Root `README.md`
