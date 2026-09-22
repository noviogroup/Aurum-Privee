function skipLegacyWorker(name) {
  if (process.env.COMMERCE_PROVIDER !== "wix") return null;
  console.log(`${name} skipped because Wix owns the production commerce workflow`);
  return { statusCode: 200 };
}

module.exports = { skipLegacyWorker };
