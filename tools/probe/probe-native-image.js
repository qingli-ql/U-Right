const path = require("node:path");
const fs = require("node:fs");
const { app, nativeImage } = require("electron");

function fileExists(targetPath) {
  return Boolean(targetPath) && fs.existsSync(targetPath);
}

function summarizeImage(label, image, extra = {}) {
  const representations = typeof image.getScaleFactors === "function"
    ? image.getScaleFactors().map((scaleFactor) => ({
        scaleFactor,
        size: image.getSize(scaleFactor)
      }))
    : [];

  return {
    label,
    isEmpty: image.isEmpty(),
    size: image.getSize(),
    representations,
    ...extra
  };
}

function logProbe(label, factory, extra = {}) {
  try {
    const image = factory();
    console.log(JSON.stringify(summarizeImage(label, image, extra), null, 2));
  } catch (error) {
    console.log(JSON.stringify({
      label,
      error: error instanceof Error ? error.message : String(error),
      ...extra
    }, null, 2));
  }
}

async function logFileIconProbe(label, targetPath, extra = {}) {
  try {
    const image = await app.getFileIcon(targetPath, { size: "normal" });
    console.log(JSON.stringify(summarizeImage(label, image, extra), null, 2));
  } catch (error) {
    console.log(JSON.stringify({
      label,
      error: error instanceof Error ? error.message : String(error),
      ...extra
    }, null, 2));
  }
}

app.whenReady().then(async () => {
  const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  const svgPath = path.join(root, "Resources", "App", "Assets.xcassets", "AppIcon.appiconset", "brand-source.svg");
  const icnsPath = path.join(root, "Resources", "App", "U-Right.icns");
  const pngPath = path.join(root, "Resources", "App", "Assets.xcassets", "AppIcon.appiconset", "icon_32x32@2x.png");
  const trayPngPath = path.join(root, "build", "electron", "Debug", "mac-arm64", "U-Right.app", "Contents", "Resources", "tray-icon.png");
  const packagedIcnsPath = path.join(root, "build", "electron", "Debug", "mac-arm64", "U-Right.app", "Contents", "Resources", "icon.icns");

  const svg = fileExists(svgPath) ? fs.readFileSync(svgPath, "utf8") : "";
  const svgDataUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

  logProbe("svg-data-url", () => nativeImage.createFromDataURL(svgDataUrl), {
    source: svgPath,
    exists: fileExists(svgPath)
  });
  logProbe("svg-file-path", () => nativeImage.createFromPath(svgPath), {
    source: svgPath,
    exists: fileExists(svgPath)
  });
  logProbe("icns-repo-path", () => nativeImage.createFromPath(icnsPath), {
    source: icnsPath,
    exists: fileExists(icnsPath)
  });
  logProbe("png-repo-path", () => nativeImage.createFromPath(pngPath), {
    source: pngPath,
    exists: fileExists(pngPath)
  });
  logProbe("png-packaged-tray-path", () => nativeImage.createFromPath(trayPngPath), {
    source: trayPngPath,
    exists: fileExists(trayPngPath)
  });
  logProbe("icns-packaged-path", () => nativeImage.createFromPath(packagedIcnsPath), {
    source: packagedIcnsPath,
    exists: fileExists(packagedIcnsPath)
  });
  await logFileIconProbe("file-icon-icns-repo-path", icnsPath, {
    source: icnsPath,
    exists: fileExists(icnsPath)
  });
  await logFileIconProbe("file-icon-packaged-app-path", path.join(root, "build", "electron", "Debug", "mac-arm64", "U-Right.app"), {
    source: path.join(root, "build", "electron", "Debug", "mac-arm64", "U-Right.app"),
    exists: fileExists(path.join(root, "build", "electron", "Debug", "mac-arm64", "U-Right.app"))
  });
  await logFileIconProbe("file-icon-icns-packaged-path", packagedIcnsPath, {
    source: packagedIcnsPath,
    exists: fileExists(packagedIcnsPath)
  });

  app.quit();
}).catch((error) => {
  console.error(error);
  app.exit(1);
});
