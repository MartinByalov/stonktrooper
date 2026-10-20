// The Stonks browser-side generator

export class StonkGenerator {
  constructor(opts = {}) {
    this.basePath = (opts.basePath || '.').replace(/\/$/, '');

    this.config = null;
    this.collection = null;

    this._tokenIndex = new Map();
    this._imageCache = new Map();
  }

  // Load configuration and generated collection
  async load() {
    const [configRes, collectionRes] = await Promise.all([
      fetch(`${this.basePath}/data/traits-config.json`),
      fetch(`${this.basePath}/data/stonks-collection.json`)
    ]);

    if (!configRes.ok) {
      throw new Error('Failed to load traits-config.json');
    }

    if (!collectionRes.ok) {
      throw new Error('Failed to load stonks-collection.json');
    }

    this.config = await configRes.json();
    this.collection = await collectionRes.json();

    this._tokenIndex.clear();

    for (const token of this.collection.tokens || []) {
      this._tokenIndex.set(Number(token.id), token);
    }

    return this;
  }

  // Total collection supply
  get totalSupply() {
    return this.collection?.totalSupply || 0;
  }

  // Return a random token ID
  randomId() {
    if (!this.totalSupply) {
      throw new Error('Collection is not loaded');
    }

    return 1 + Math.floor(Math.random() * this.totalSupply);
  }

  // Find category by key
  _categoryByKey(key) {
    if (!this.config?.categories) {
      return null;
    }

    return this.config.categories.find(
      (category) => category.key === key
    ) || null;
  }

  // Find option metadata by category and option ID
  _optionMeta(categoryKey, optionId) {
    if (optionId === null || optionId === undefined) {
      return null;
    }

    const category = this._categoryByKey(categoryKey);

    if (!category) {
      return null;
    }

    return category.options?.find(
      (option) => option.id === optionId
    ) || null;
  }

  // Extract numeric body type from identifier
  _getBodyTypeNumber(record) {
    const bodyType = record?.traits?.bodyType;

    if (!bodyType) {
      throw new Error('Token is missing bodyType');
    }

    const match = String(bodyType).match(/body_type_(\d+)/);

    if (!match) {
      throw new Error(`Invalid bodyType: ${bodyType}`);
    }

    return match[1];
  }

  // Get display name of body or candle trait
  _getBodyDisplayName(record, optionId) {
    const bodyType = record?.traits?.bodyType;

    const typeNames = {
      body_type_1: {
        golden: 'Golden Candle',
        green: 'Bullish Candle',
        red: 'Bearish Candle'
      },

      body_type_2: {
        golden: 'Golden Marubozu',
        green: 'Bullish Marubozu',
        red: 'Bearish Marubozu'
      },

      body_type_3: {
        golden: 'Golden Doji',
        green: 'Bullish Doji',
        red: 'Bearish Doji'
      }
    };

    return typeNames[bodyType]?.[optionId] || null;
  }

  // Build asset file path for trait
  _buildAssetPath(record, category, optionId) {
    if (optionId === null || optionId === undefined) {
      return null;
    }

    const meta = this._optionMeta(category.key, optionId);

    if (!meta) {
      throw new Error(
        `Unknown option "${optionId}" in category "${category.key}"`
      );
    }

    // Background is shared by all body types
    if (category.key === 'background') {
      return `background/${meta.file}`;
    }

    // Chart is shared by all body types
    if (category.key === 'chart') {
      return `charts/${meta.file}`;
    }

    const typeNum = this._getBodyTypeNumber(record);

    // Body-type-specific folder mapping
    const folderMap = {
      body: `body_types/body_type_${typeNum}`,
      eyes: `eyes/eyes_type_${typeNum}`,
      faceFeature: `face_feature/face_feature_type_${typeNum}`,
      dress: `dress/dress_type_${typeNum}`,
      hat: `hats/hats_type_${typeNum}`,
      bag: `bags/bag_body_type_${typeNum}`
    };

    const folder = folderMap[category.key];

    if (!folder) {
      throw new Error(
        `No asset folder configured for category "${category.key}"`
      );
    }

    // Replace %TYPE% placeholder in filename
    let file = meta.file;

    file = file.replace(/%TYPE%/g, typeNum);

    return `${folder}/${file}`;
  }

  // Load and cache image element
  _loadImage(path) {
    if (!path) {
      return null;
    }

    const cacheKey = path;

    if (this._imageCache.has(cacheKey)) {
      return this._imageCache.get(cacheKey);
    }

    const promise = new Promise((resolve) => {
      const img = new Image();

      img.onload = () => resolve(img);

      img.onerror = () => {
        console.warn(
          `Failed to load asset: ${this.basePath}/assets/${cacheKey}`
        );
        resolve(null);
      };

      img.src = `${this.basePath}/assets/${path}`;
    });

    this._imageCache.set(cacheKey, promise);

    return promise;
  }

  // Assemble full token data for UI rendering
  getStonk(tokenId) {
    const numericId = Number(tokenId);

    const record = this._tokenIndex.get(numericId);

    if (!record) {
      throw new Error(`No Stonk with id ${tokenId}`);
    }

    const traits = [];

    for (const category of this.config.categories) {
      const optionId = record.traits[category.key];

      // Handle none trait
      if (optionId === null || optionId === undefined) {
        traits.push({
          category: category.key,
          label: category.label,
          optionId: null,
          name: 'None',
          rarityTier: 'common'
        });

        continue;
      }

      const meta = this._optionMeta(
        category.key,
        optionId
      );

      let name = meta?.name || 'Unknown';

      // Determine body display name based on body type
      if (category.key === 'body') {
        name =
          this._getBodyDisplayName(record, optionId) ||
          name;
      }

      traits.push({
        category: category.key,
        label: category.label,
        optionId,
        name,
        rarityTier: meta?.rarityTier || 'common'
      });
    }

    return {
      id: record.id,
      traits,
      rarityScore: record.rarityScore,
      rarityRank: record.rarityRank,
      totalSupply: this.totalSupply
    };
  }

  // Render Stonk composite layers onto canvas
  async render(tokenId, canvasEl, opts = {}) {
    const numericId = Number(tokenId);

    const record = this._tokenIndex.get(numericId);

    if (!record) {
      throw new Error(`No Stonk with id ${tokenId}`);
    }

    if (!canvasEl) {
      throw new Error('Canvas element is required');
    }

    const size = opts.size || this.config?.canvasSize || 512;

    canvasEl.width = size;
    canvasEl.height = size;

    const ctx = canvasEl.getContext('2d');

    if (!ctx) {
      throw new Error('Could not get 2D canvas context');
    }

    // Disable image smoothing for pixel-art rendering
    ctx.imageSmoothingEnabled = false;

    ctx.clearRect(
      0,
      0,
      size,
      size
    );

    // Exact layer rendering order
    const layerOrder = [
      'background',
      'chart',
      'body',
      'dress',
      'hat',
      'faceFeature',
      'eyes',
      'bag'
    ];

    for (const layerKey of layerOrder) {
      const category =
        this._categoryByKey(layerKey);

      if (!category) {
        continue;
      }

      const optionId =
        record.traits[layerKey];

      // Skip rendering if trait is none
      if (optionId === null || optionId === undefined) {
        continue;
      }

      const assetPath =
        this._buildAssetPath(
          record,
          category,
          optionId
        );

      if (!assetPath) {
        continue;
      }

      const image =
        await this._loadImage(assetPath);

      if (!image) {
        continue;
      }

      // Draw image asset onto canvas context
      ctx.drawImage(
        image,
        0,
        0,
        size,
        size
      );
    }

    return canvasEl;
  }

  // Clear cached image elements
  clearImageCache() {
    this._imageCache.clear();
  }
}