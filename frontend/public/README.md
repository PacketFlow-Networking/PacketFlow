# Public Assets

Static assets that are copied as-is to the `dist/` folder during build. These are served at the root path `/`.

## Organization

### `images/`
Static images used in the UI:
- Logos, icons, illustrations
- Screenshots, diagrams
- Branding images

**Usage in components:**
```html
<img src="/images/logo.png" alt="PacketFlow" />
```

### `icons/`
App icons and favicons:
- favicon.ico
- app-icon.png
- manifest icons

**Usage in HTML:**
```html
<link rel="icon" type="image/x-icon" href="/icons/favicon.ico" />
```

### `fonts/`
Custom font files:
- .woff2, .woff files for web fonts
- Reference in `src/styles/globals.css`

**Usage in CSS:**
```css
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom-font.woff2') format('woff2');
}
```

## Best Practices

 **DO:**
- Use `public/` for static files that don't need processing
- Reference with absolute paths: `/images/logo.png`
- Keep files optimized (compress images, use WebP where possible)
- Document new categories in this README

 **DON'T:**
- Put frequently-changing files here (use `src/assets/` instead)
- Import images in components that can be bundled with code
- Store large files without compression

## Vite Build Behavior

- Files in `public/` are copied to `dist/` during build
- Paths are preserved (e.g., `public/images/logo.png`  `dist/images/logo.png`)
- No content hashing, so use cache-busting if needed
- Changes require restart in dev server

## Alternative: src/assets/

For images that are:
- Imported in components
- Part of your code bundle
- Need to be processed/optimized

Use `src/assets/` instead:
```typescript
import logo from '@/assets/logo.png'

export function Logo() {
  return <img src={logo} alt="Logo" />
}
```

Vite will:
- Hash the filename for cache-busting
- Optimize the image
- Include in your bundle
