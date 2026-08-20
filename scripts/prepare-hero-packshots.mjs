import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const sourceDir = path.join(root, "public/product-images/loyverse");
const outputDir = path.join(root, "public/images/hero-products");

const packshots = [
  {
    source: "2c111ba4-b277-48c7-904d-019aaae909f0.webp",
    output: "dior-sauvage.png",
    crop: { left: 320, top: 330, width: 350, height: 340 },
  },
  {
    source: "1e39f727-679c-4a7e-b8ff-9c781077668e.webp",
    output: "tom-ford-black-orchid.png",
    crop: { left: 270, top: 260, width: 470, height: 480 },
  },
  {
    source: "b6e45592-7537-4020-9826-fdb294860e5e.webp",
    output: "afnan-supremacy-noir.png",
    crop: { left: 305, top: 315, width: 395, height: 375 },
  },
  {
    source: "1eaedcf9-7a72-4f05-bbed-4654b112f2eb.webp",
    output: "creed-aventus-for-her.png",
    crop: { left: 395, top: 395, width: 210, height: 220 },
  },
  {
    source: "a67eb208-0372-4c16-ab86-232822c70dcf.webp",
    output: "xerjoff-erba-pura.png",
    crop: { left: 375, top: 270, width: 250, height: 465 },
  },
  {
    source: "784580e1-e220-4bd9-bf96-fcf5c4b1a87b.webp",
    output: "versace-crystal-noir-set.png",
    crop: { left: 300, top: 410, width: 420, height: 220 },
  },
];

function removeConnectedWhiteBackground(data, width, height) {
  const seen = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const isBackground = (pixel) => {
    const offset = pixel * 4;
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    return Math.min(red, green, blue) >= 238 && Math.max(red, green, blue) - Math.min(red, green, blue) <= 18;
  };

  const enqueue = (pixel) => {
    if (seen[pixel] || !isBackground(pixel)) return;
    seen[pixel] = 1;
    queue[tail++] = pixel;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const pixel = queue[head++];
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x > 0) enqueue(pixel - 1);
    if (x < width - 1) enqueue(pixel + 1);
    if (y > 0) enqueue(pixel - width);
    if (y < height - 1) enqueue(pixel + width);
  }

  for (let pixel = 0; pixel < seen.length; pixel += 1) {
    if (seen[pixel]) data[pixel * 4 + 3] = 0;
  }

  return data;
}

for (const packshot of packshots) {
  const { data, info } = await sharp(path.join(sourceDir, packshot.source))
    .extract(packshot.crop)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  removeConnectedWhiteBackground(data, info.width, info.height);

  await sharp(data, { raw: info })
    .trim({ background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .resize({ height: 760, fit: "inside", withoutEnlargement: false })
    .png({ compressionLevel: 9, palette: true })
    .toFile(path.join(outputDir, packshot.output));
}
