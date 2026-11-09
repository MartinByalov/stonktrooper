"""Copy reviewed visual modules, excluding Android progression and app logic."""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
android = root.parent / 'stonktrooper-android'
files = [
    'animalRenderer.ts', 'animalWeaponPose.ts', 'animalWalkPose.ts',
    'animalTailRenderer.ts', 'eyeAnimation.ts', 'mountPose.ts',
    'profileAnatomy.ts', 'profileLayers.ts', 'garmentPose.ts',
    'characterPose.ts', 'armRenderer.ts', 'hatPose.ts', 'hatContact.ts',
    'pigeonWingRenderer.ts', 'fedoraRenderer.ts', 'cosmeticModels.ts',
    'assetRenderer.ts', 'bossHeroRenderer.ts', 'whaleRider.ts',
    'bossRenderer.ts', 'bossHatRenderer.ts', 'janetRenderer.ts',
    'paulRenderer.ts', 'paulModel.ts',
]
for name in files:
    source = (android / 'src' / name).read_text(encoding='utf-8')
    source = source.replace("from './progression'", "from './modelColors'")
    (root / 'src' / name).write_text(source, encoding='utf-8')

source = (android / 'src' / 'progression.ts').read_text(encoding='utf-8')
palettes = re.findall(r"id: '([^']+)'[^\n]*?light: (\[[^\]]+\]), dark: (\[[^\]]+\])", source)
assert palettes
output = '// Android visual palettes only: no ownership, wallet or save logic.\n'
output += 'const palettes: Record<string, { light: [string, string]; dark: [string, string] }> = {\n'
output += ''.join(f"  '{key}': {{ light: {light}, dark: {dark} }},\n" for key, light, dark in palettes)
output += """};
export function skinColors(id: string, dark: boolean): [string, string] {
  const palette = palettes[id] ?? palettes['hats-classic'];
  return dark ? palette.dark : palette.light;
}
"""
(root / 'src' / 'modelColors.ts').write_text(output, encoding='utf-8')
print(f'Synchronized {len(files)} visual modules and {len(palettes)} palettes')

# Port the on-foot drawing pass only. All simulation, input, HUD and app
# lifecycle code stays browser-owned. The browser uses the classic outfit.
path = root / 'src' / 'CandleGame.tsx'
browser = path.read_text(encoding='utf-8')
mobile = (android / 'src' / 'CandleGame.tsx').read_text(encoding='utf-8')
start = '    // --- STANDARD ON-FOOT RUNNER SPRITE ---'
end = '  // 2. PICKUPS (Coins, Diamonds, Banknotes)'
block = mobile[mobile.index(start):mobile.index(end)]
block = block.replace("    renderPet('normal');\n", '')
for category, classic in [('suits', 'suits-classic'), ('shoes', 'shoes-classic'),
                          ('suitcase', 'suitcase-classic'), ('hats', 'hats-classic')]:
    block = block.replace(f'cosmeticRef.current.{category}', repr(classic))
block = block.replace('fedoraReleasePose()', 'fedoraArmPose(.000001)')
browser = browser[:browser.index(start)] + block + browser[browser.index(end):]
imports = """import { drawNearBriefcaseArm, drawSuitDetails, drawSuitCollar, drawRunnerLeg, drawFarRunnerArm, drawJointedSuitArm } from './cosmeticModels';
import { actionArmPose, runnerCarryPose, runnerBagThrowPose } from './characterPose';
import { drawProfileBackLayers } from './profileLayers';
import { hatMetrics } from './hatPose';
"""
if "from './profileLayers'" not in browser:
    browser = imports + browser
browser = browser.replace('drawHumanHead, drawFallingCharacter', 'drawHumanHead, drawApeHat, drawFallingCharacter')
path.write_text(browser, encoding='utf-8')

# Reuse Android's focused, self-contained anatomy/renderer regression tests.
for name in ['check-character-actions.mjs', 'check-animal-walk.mjs',
             'check-animal-two-hand-grip.mjs', 'check-animal-head-perspective.mjs']:
    (root / 'scripts' / name).write_text((android / 'scripts' / name).read_text(encoding='utf-8'), encoding='utf-8')