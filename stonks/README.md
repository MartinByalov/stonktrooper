# Stonks

The Stonks collection behind the in-game Stonks dialog (`src/StonksDialog.tsx`).

- `js/stonk-generator.js`: loads the collection and draws each Stonk on a canvas.
- `generate-collection.mjs`: rebuilds the collection data.

The data and the PNG layers live in `public/stonks/` (served at `/stonks`):

- `public/stonks/data/traits-config.json`: traits and layers.
- `public/stonks/data/stonks-collection.json`: the pre-generated collection of 10,000 Stonks.
- `public/stonks/assets/`: the PNG layers.

## Rebuilding the collection

```sh
node stonks/generate-collection.mjs
```

This overwrites `public/stonks/data/stonks-collection.json`. Normal play does not need it, and it
does not create the PNG layers.
