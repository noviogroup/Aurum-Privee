# Product image intake

Drop approved product photographs into this folder and run:

```bash
npm run images:check
npm run images:import
```

Name every file with one exact identifier from `data/missing-product-images.csv`, in this preference order:

1. SKU, for example `11311.jpg`
2. Barcode, for example `6294015131024.png`
3. Loyverse variant ID
4. Exact product name

Accepted source formats are JPG, PNG, WebP, TIFF and AVIF. Images must be at least 800×800 pixels; 1600×1600 or larger is recommended. The importer normalizes approved images to high-quality WebP, places them in `public/product-images`, updates the local catalog snapshot, removes completed entries from the acquisition worksheet, and records an auditable durable manifest in `data/curated-product-images.json`. Later Loyverse refreshes preserve these approved images without overwriting the original source files.

Only use supplier/manufacturer images licensed for retail use or photographs owned by Aurum Privée. Do not place scraped competitor imagery here.
