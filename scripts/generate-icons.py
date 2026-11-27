import os
import subprocess
from PIL import Image

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))
PUBLIC_DIR = os.path.join(PROJECT_DIR, 'public')
ICONS_DIR = os.path.join(PUBLIC_DIR, 'icons')
APP_DIR = os.path.join(PROJECT_DIR, 'src', 'app')

os.makedirs(ICONS_DIR, exist_ok=True)

# 1. Standard SVG Icon (with rounded corners for browsers/display)
SVG_CONTENT = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="38%" r="65%">
      <stop offset="0%" stop-color="#1E1B4B" />
      <stop offset="55%" stop-color="#0F0E2A" />
      <stop offset="100%" stop-color="#070614" />
    </radialGradient>

    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C084FC" />
      <stop offset="35%" stop-color="#8B5CF6" />
      <stop offset="75%" stop-color="#6366F1" />
      <stop offset="100%" stop-color="#38BDF8" />
    </linearGradient>

    <linearGradient id="streamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="45%" stop-color="#E0E7FF" />
      <stop offset="100%" stop-color="#A5B4FC" />
    </linearGradient>

    <linearGradient id="glowBorder" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C084FC" stop-opacity="0.8" />
      <stop offset="50%" stop-color="#8B5CF6" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#38BDF8" stop-opacity="0.6" />
    </linearGradient>

    <filter id="neon" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="10" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="512" height="512" rx="112" fill="url(#bgGlow)" />
  <rect x="4" y="4" width="504" height="504" rx="108" fill="none" stroke="url(#glowBorder)" stroke-width="4" stroke-opacity="0.5" />

  <!-- Ambient Glow Behind Vault Emblem -->
  <circle cx="256" cy="240" r="130" fill="#8B5CF6" fill-opacity="0.22" filter="url(#neon)" />

  <!-- Vault Shield Silhouette -->
  <path d="M 256 86 L 382 142 C 382 258 328 352 256 394 C 184 352 130 258 130 142 Z"
        fill="none" stroke="url(#shieldGrad)" stroke-width="18" stroke-linejoin="round" />

  <!-- Inner Vault Chamber / Shield Core -->
  <path d="M 256 120 L 354 164 C 354 248 312 320 256 356 C 200 320 158 248 158 164 Z"
        fill="#121132" fill-opacity="0.88" stroke="url(#shieldGrad)" stroke-width="5" stroke-opacity="0.4" />

  <!-- Downward Media-Stream Arrow System -->
  <!-- Upper Stream Bars (incoming streams) -->
  <rect x="238" y="156" width="36" height="12" rx="6" fill="#C084FC" opacity="0.95" />
  <rect x="228" y="180" width="56" height="12" rx="6" fill="#A855F7" opacity="0.95" />

  <!-- Central Descending Arrow -->
  <path d="M 238 204 L 274 204 L 274 262 L 316 262 L 256 326 L 196 262 L 238 262 Z"
        fill="url(#streamGrad)" filter="url(#neon)" />

  <!-- Storage Vault Base / Safe Landing Tray -->
  <path d="M 174 416 C 174 406 182 398 192 398 L 320 398 C 330 398 338 406 338 416 C 338 426 330 434 320 434 L 192 434 C 182 434 174 426 174 416 Z"
        fill="url(#shieldGrad)" />

  <!-- Storage Indicator Dots -->
  <circle cx="218" cy="416" r="4.5" fill="#FFFFFF" opacity="0.85" />
  <circle cx="256" cy="416" r="4.5" fill="#38BDF8" />
  <circle cx="294" cy="416" r="4.5" fill="#FFFFFF" opacity="0.85" />
</svg>'''

# 2. Maskable SVG Icon (Full bleed background, 80% safe zone centered for Android adaptive icons)
SVG_MASKABLE = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bgGlowM" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#1E1B4B" />
      <stop offset="50%" stop-color="#0F0E2A" />
      <stop offset="100%" stop-color="#070614" />
    </radialGradient>

    <linearGradient id="shieldGradM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#C084FC" />
      <stop offset="35%" stop-color="#8B5CF6" />
      <stop offset="75%" stop-color="#6366F1" />
      <stop offset="100%" stop-color="#38BDF8" />
    </linearGradient>

    <linearGradient id="streamGradM" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="45%" stop-color="#E0E7FF" />
      <stop offset="100%" stop-color="#A5B4FC" />
    </linearGradient>

    <filter id="neonM" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>

  <!-- Full-bleed background (no border radius so Android can mask freely) -->
  <rect width="512" height="512" fill="url(#bgGlowM)" />

  <!-- Safe Zone Scaling (center scale 0.78 around 256, 256) -->
  <g transform="translate(56.32, 56.32) scale(0.78)">
    <!-- Ambient Glow Behind Vault Emblem -->
    <circle cx="256" cy="240" r="130" fill="#8B5CF6" fill-opacity="0.25" filter="url(#neonM)" />

    <!-- Vault Shield Silhouette -->
    <path d="M 256 86 L 382 142 C 382 258 328 352 256 394 C 184 352 130 258 130 142 Z"
          fill="none" stroke="url(#shieldGradM)" stroke-width="18" stroke-linejoin="round" />

    <!-- Inner Vault Chamber / Shield Core -->
    <path d="M 256 120 L 354 164 C 354 248 312 320 256 356 C 200 320 158 248 158 164 Z"
          fill="#121132" fill-opacity="0.88" stroke="url(#shieldGradM)" stroke-width="5" stroke-opacity="0.4" />

    <!-- Downward Media-Stream Arrow System -->
    <rect x="238" y="156" width="36" height="12" rx="6" fill="#C084FC" opacity="0.95" />
    <rect x="228" y="180" width="56" height="12" rx="6" fill="#A855F7" opacity="0.95" />

    <path d="M 238 204 L 274 204 L 274 262 L 316 262 L 256 326 L 196 262 L 238 262 Z"
          fill="url(#streamGradM)" filter="url(#neonM)" />

    <path d="M 174 416 C 174 406 182 398 192 398 L 320 398 C 330 398 338 406 338 416 C 338 426 330 434 320 434 L 192 434 C 182 434 174 426 174 416 Z"
          fill="url(#shieldGradM)" />

    <circle cx="218" cy="416" r="4.5" fill="#FFFFFF" opacity="0.85" />
    <circle cx="256" cy="416" r="4.5" fill="#38BDF8" />
    <circle cx="294" cy="416" r="4.5" fill="#FFFFFF" opacity="0.85" />
  </g>
</svg>'''

# Save vector files
with open(os.path.join(PUBLIC_DIR, 'icon.svg'), 'w', encoding='utf-8') as f:
    f.write(SVG_CONTENT)

with open(os.path.join(APP_DIR, 'icon.svg'), 'w', encoding='utf-8') as f:
    f.write(SVG_CONTENT)

with open(os.path.join(PUBLIC_DIR, 'logo.svg'), 'w', encoding='utf-8') as f:
    f.write(SVG_CONTENT)

temp_svg_path = os.path.join(PUBLIC_DIR, 'temp_icon.svg')
temp_maskable_svg = os.path.join(PUBLIC_DIR, 'temp_maskable.svg')

with open(temp_svg_path, 'w', encoding='utf-8') as f:
    f.write(SVG_CONTENT)

with open(temp_maskable_svg, 'w', encoding='utf-8') as f:
    f.write(SVG_MASKABLE)

print("SVG files written successfully.")

# Find browser for rendering
chrome_paths = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
]
browser_exe = None
for p in chrome_paths:
    if os.path.exists(p):
        browser_exe = p
        break

if not browser_exe:
    raise RuntimeError("No headless browser found to rasterize SVG.")

raw_512_png = os.path.join(PUBLIC_DIR, 'icon-512.png')
raw_maskable_png = os.path.join(PUBLIC_DIR, 'icon-maskable-512.png')

# Render standard 512x512
subprocess.run([
    browser_exe,
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    '--window-size=512,512',
    f'--screenshot={raw_512_png}',
    f'file:///{temp_svg_path.replace(os.sep, "/")}'
], check=True)

# Render maskable 512x512
subprocess.run([
    browser_exe,
    '--headless',
    '--disable-gpu',
    '--hide-scrollbars',
    '--window-size=512,512',
    f'--screenshot={raw_maskable_png}',
    f'file:///{temp_maskable_svg.replace(os.sep, "/")}'
], check=True)

# Clean up temp SVGs
if os.path.exists(temp_svg_path): os.remove(temp_svg_path)
if os.path.exists(temp_maskable_svg): os.remove(temp_maskable_svg)

print("Base 512x512 PNGs rendered via headless browser.")

# Resize and generate all raster assets via Pillow
base_img = Image.open(raw_512_png).convert('RGBA')
maskable_img = Image.open(raw_maskable_png).convert('RGBA')

# 1. apple-touch-icon.png (180x180)
apple_touch = base_img.resize((180, 180), Image.Resampling.LANCZOS)
apple_touch.save(os.path.join(PUBLIC_DIR, 'apple-touch-icon.png'), 'PNG')
apple_touch.save(os.path.join(ICONS_DIR, 'apple-touch-icon.png'), 'PNG')

# 2. icon-192.png (192x192)
icon_192 = base_img.resize((192, 192), Image.Resampling.LANCZOS)
icon_192.save(os.path.join(PUBLIC_DIR, 'icon-192.png'), 'PNG')
icon_192.save(os.path.join(ICONS_DIR, 'icon-192x192.png'), 'PNG')

# 3. icon-512.png & icons/icon-512x512.png
base_img.save(os.path.join(PUBLIC_DIR, 'icon-512.png'), 'PNG')
base_img.save(os.path.join(ICONS_DIR, 'icon-512x512.png'), 'PNG')

# 4. icon-maskable-512.png & icons/icon-maskable-512x512.png
maskable_img.save(os.path.join(PUBLIC_DIR, 'icon-maskable-512.png'), 'PNG')
maskable_img.save(os.path.join(ICONS_DIR, 'icon-maskable-512x512.png'), 'PNG')

# 5. Favicon PNGs (16x16, 32x32)
fav_16 = base_img.resize((16, 16), Image.Resampling.LANCZOS)
fav_16.save(os.path.join(PUBLIC_DIR, 'favicon-16x16.png'), 'PNG')

fav_32 = base_img.resize((32, 32), Image.Resampling.LANCZOS)
fav_32.save(os.path.join(PUBLIC_DIR, 'favicon-32x32.png'), 'PNG')

# 6. Multi-size favicon.ico (16, 32, 48)
base_img.save(
    os.path.join(PUBLIC_DIR, 'favicon.ico'),
    format='ICO',
    sizes=[(16, 16), (32, 32), (48, 48)]
)
# Also copy to src/app/favicon.ico so Next.js static asset discovery finds it
base_img.save(
    os.path.join(APP_DIR, 'favicon.ico'),
    format='ICO',
    sizes=[(16, 16), (32, 32), (48, 48)]
)

print("All raster icon assets and multi-size favicon.ico generated successfully!")
