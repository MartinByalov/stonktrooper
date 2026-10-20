"""Generate web assets from retained PNG originals (requires Pillow)."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1] / 'public' / 'images'
for stem in ['crane', 'crane-inverted', 'crane-portrait', 'crane-portrait-inverted',
             'menu-hero', 'menu-hero-inverted', 'score-back', 'score-back-inverted']:
    image = Image.open(root / f'{stem}.png').convert('RGBA')
    if stem == 'crane-inverted':
        # The landscape night original has a 30px dark strip below the skyline.
        # Keep the source PNG intact and remove the strip from web variants only.
        image = image.crop((0, 0, image.width, image.height - 30))
    # Preserve score artwork pixels/alpha exactly for canvas rendering/export.
    image.save(root / f'{stem}.webp', lossless=stem.startswith('score-back'), exact=True, quality=88, method=6)
    if not stem.startswith('score-back'):
        image.thumbnail((960, 960), Image.Resampling.LANCZOS)
        image.save(root / f'{stem}-small.webp', quality=88, method=6)
for stem in ['tab-icon', 'tab-icon-inverted']:
    image = Image.open(root / f'{stem}.png').convert('RGBA')
    image.thumbnail((48, 48), Image.Resampling.LANCZOS)
    image.save(root / f'{stem}-48.png', optimize=True)