# Mobile rendering and performance validation

## Confirmed code issues addressed

- The canvas used a 1920 × 840 backing surface multiplied by DPR, even when displayed much smaller. The phone density cap depended on width and stopped applying in landscape. Backing resolution now follows displayed dimensions, with the same touch density cap in either orientation. World coordinates and the 60 Hz simulation remain unchanged.
- Drawing repeatedly measured DOM geometry. Display dimensions and the world transform are now cached by the existing resize observer.
- Catch-up frames with four or more simulation steps skipped painting entirely. Sustained overload could therefore starve rendering. The loop now paints once after simulation progress and avoids duplicate paints on high-refresh displays. Hidden documents reset the simulation clock rather than catching up elapsed background time.
- Joystick movement caused React state updates on every pointer event. Knob positioning now updates only its transform; held input is released on blur, hidden-document transitions and unmount.
- Boundary observers synchronously measured layout on every notification. Notifications now share one animation-frame measurement, including visual-viewport resize/scroll notifications.
- Scroll-managed information/share panels were included in the shrink-to-fit hook. They are now excluded.
- A side notch inflated vertical control spacing because all safe-area edges shared one maximum. Joystick/pause positions now use the corresponding edge. Information panels keep their vertical inset inside the already bounded header/footer area.
- An earlier portrait `justify-content: center` rule survived the new information-body wrapper. Browser testing reproduced clipped text at 360 × 560. Explicit `flex-start` fixes long-content scrolling; automatic body margins still center short content.

## Automated checks

```powershell
npm test
node node_modules/typescript/bin/tsc --noEmit
npm run build
git diff --check
```

`scripts/mobile-browser-audit.mjs` uses the existing Node runtime and a Chromium debugging endpoint, without additional dependencies. Start a local preview server and a separate test browser profile **outside the repository**. Set `AUDIT_ORIGIN` (default `http://127.0.0.1:5511`) and `AUDIT_DEBUG_PORT` (default `9331`), then run:

```powershell
node scripts/mobile-browser-audit.mjs
```

The audit checks all four information panels, close-button hit testing, beginning/end of scroll, document bounds, desktop/touch controls and a real synthetic touch tap. Cases: 360 × 560, 390 × 664, 768 × 1024, 844 × 390, 844 × 390 with 44 px side/21 px bottom safe areas, and desktop 1280 × 800. The safe-area override requires a Chromium version exposing that experimental debugging command.

`--fullscreen` adds an optional fullscreen check. The local headless run timed out awaiting fullscreen; fullscreen is **not validated** by the passing default audit. It must be checked separately in a supported headed browser/device.

At 844 × 390 without safe-area overrides, backing resolution changed from 3840 × 1680 to 1266 × 554 (approximately 89% fewer backing pixels). This is a raster-budget reduction, not a measured FPS improvement.

## Required real-device follow-up

### Equal joystick corner gaps

The moto g24 report clarifies that Firefox stutters rather than fully freezing, and that joystick placement differs from the intended equal left/bottom gaps in both Firefox and Brave. The joystick now uses one shared gap: the maximum of 8px, the left safe inset and the bottom safe inset. Thus asymmetric system insets cannot produce unequal visible corner spacing. With 44px left/21px bottom insets both gaps are 44px; without insets both are 8px. This intentionally differs from the earlier independent-edge placement. The Chromium audit checks the rendered gaps against the game stage. Device performance and the other reported visual defects remain unverified; this positioning change is not a Firefox performance fix.

### Browser-dependent guide bounds

Phone testing reports smooth play in Brave but stuttering in Mozilla, with layout differences in both. The Mozilla stutter remains unprofiled and unresolved. How to Play now uses a height measured between the feed boundary and the visible footer (or app bottom when the footer is hidden), rather than relying on a fixed-position viewport bottom derived from `innerHeight`. Landscape guide gutters use each safe-area edge separately. The Chromium audit checks the paused landscape guide's top, bottom, panel fill and close hit testing; this does not validate Firefox Android or native fullscreen.

### Screenshot follow-up

The landscape sharing screenshot prompted an additional production-browser regression check. With 44px side insets and a 21px bottom inset at 844 × 390, the old common gutter reduced the preview to 0 × 0. Share DD now keeps its vertical gutter independent of side insets and provides a 128px minimum preview width (bounded by available width), scrolling when necessary. The same case now produces an approximately 188 × 141 preview. The audit also checks Share DD aspect ratio, close hit testing and landscape preview height, plus the portrait How to Play scroll/close row. A 896 × 400 notched case is included.

The portrait screenshot's large footer background has not been attributed to a confirmed cause. A screenshot alone cannot distinguish reported safe-area padding from viewport/browser chrome behavior; do not remove bottom safe-area protection without device measurements.

No physical Android/iOS device was available for this audit. Browser emulation does not certify mobile browser-engine behavior, GPU performance, thermal throttling, browser chrome animation or native fullscreen/orientation transitions.

Record device model, OS/browser version, deployed revision and URL. Test a production build with browser bars expanded/collapsed, portrait/landscape rotation, notch/home indicator, fullscreen entry/exit, background/foreground, multi-touch joystick plus attack, pointer cancellation, repeated pause/resume, all close controls, and both ends of long-panel scrolling. Measure frame-time percentiles during normal play and Kangaroo on the device, with sound on/off. Do not claim sustained 60 FPS without those measurements.