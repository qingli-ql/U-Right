import fs from "node:fs";
import path from "node:path";

const URIGHT_BRAND_SVG = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="url(#panel)"/>
  <rect x="20" y="20" width="472" height="472" rx="128" fill="url(#inner)"/>

  <path d="M116 144H172V296C172 345 194 369 239 369C273 369 297 355 315 329L352 357C323 399 283 423 227 423C149 423 116 378 116 301V144Z" fill="#172327"/>

  <path d="M224 341L286 138H341L401 184L365 198L326 186L278 350L224 341Z" fill="url(#beam)"/>
  <path d="M323 132L410 160L345 224L323 132Z" fill="url(#beamHead)"/>

  <circle cx="362" cy="298" r="16" fill="#172327" opacity="0.92"/>
  <circle cx="394" cy="266" r="13" fill="#172327" opacity="0.72"/>
  <circle cx="420" cy="236" r="10" fill="#172327" opacity="0.5"/>

  <defs>
    <linearGradient id="panel" x1="256" y1="0" x2="256" y2="512" gradientUnits="userSpaceOnUse">
      <stop stop-color="#D8B17A"/>
      <stop offset="1" stop-color="#C28B4B"/>
    </linearGradient>
    <linearGradient id="inner" x1="256" y1="26" x2="256" y2="486" gradientUnits="userSpaceOnUse">
      <stop stop-color="#F2DEC0"/>
      <stop offset="1" stop-color="#D8B27B"/>
    </linearGradient>
    <linearGradient id="beam" x1="269" y1="138" x2="305" y2="350" gradientUnits="userSpaceOnUse">
      <stop stop-color="#D48D45"/>
      <stop offset="1" stop-color="#1E8C84"/>
    </linearGradient>
    <linearGradient id="beamHead" x1="352" y1="136" x2="388" y2="204" gradientUnits="userSpaceOnUse">
      <stop stop-color="#E0A15A"/>
      <stop offset="1" stop-color="#2A8A83"/>
    </linearGradient>
  </defs>
</svg>
`.trim();

export function getUrightBrandDataURL() {
  const sourcePath = path.join(process.cwd(), "Resources", "App", "Assets.xcassets", "AppIcon.appiconset", "brand-source.svg");
  const svg = fs.existsSync(sourcePath) ? fs.readFileSync(sourcePath, "utf8") : URIGHT_BRAND_SVG;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}
