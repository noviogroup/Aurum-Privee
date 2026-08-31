import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { normalizeProductPackshot, packshotKindForName } from "../lib/product-packshot";

test("normalizes a padded packshot onto the fixed catalog canvas", async () => {
  const subject = await sharp({ create: { width: 260, height: 420, channels: 3, background: "#252027" } }).png().toBuffer();
  const padded = await sharp({ create: { width: 1000, height: 1000, channels: 3, background: "#f7f5f1" } })
    .composite([{ input: subject, left: 370, top: 290 }])
    .png()
    .toBuffer();
  const normalized = await normalizeProductPackshot(padded);
  const metadata = await sharp(normalized.output).metadata();
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 1600);
  assert.ok(normalized.trimPasses >= 1);
  assert.ok(normalized.contentHeight <= 1152);
  assert.ok(normalized.contentWidth <= 1088);
});

test("uses a wider composition for sets", () => {
  assert.equal(packshotKindForName("Crystal Noir Gift Set"), "set");
  assert.equal(packshotKindForName("Good Girl 3 PCS"), "set");
  assert.equal(packshotKindForName("Dior Sauvage EDP"), "standard");
});
