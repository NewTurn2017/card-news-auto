import { toPng } from "html-to-image";
import { getFontByFamily } from "@/data/fonts";

// ─── Font Embedding (only used font, only needed subsets) ────

const CONCURRENT_LIMIT = 5;

async function fetchAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

async function fetchUrlsWithLimit(
  urls: string[],
  limit: number
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  let idx = 0;

  async function worker() {
    while (idx < urls.length) {
      const url = urls[idx++];
      try {
        results.set(url, await fetchAsDataUrl(url));
      } catch {
        // skip failed font chunk
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, urls.length) }, () => worker()));
  return results;
}

function textMatchesUnicodeRange(chars: Set<number>, rangeStr: string): boolean {
  const ranges = rangeStr.split(",").map((r) => r.trim());
  return ranges.some((range) => {
    // Handle wildcard like U+AC?? (replace ? with range)
    const wildcardMatch = range.match(/U\+([0-9A-Fa-f?]+)/);
    if (!wildcardMatch) return false;
    const pattern = wildcardMatch[1];

    if (pattern.includes("?")) {
      const start = parseInt(pattern.replace(/\?/g, "0"), 16);
      const end = parseInt(pattern.replace(/\?/g, "F"), 16);
      for (const code of chars) {
        if (code >= start && code <= end) return true;
      }
      return false;
    }

    const rangeMatch = range.match(/U\+([0-9A-Fa-f]+)(?:-([0-9A-Fa-f]+))?/);
    if (!rangeMatch) return false;
    const start = parseInt(rangeMatch[1], 16);
    const end = rangeMatch[2] ? parseInt(rangeMatch[2], 16) : start;
    for (const code of chars) {
      if (code >= start && code <= end) return true;
    }
    return false;
  });
}

async function buildFontEmbedCSS(element: HTMLElement): Promise<string> {
  const fontFamily = window.getComputedStyle(element).fontFamily;
  const font = getFontByFamily(fontFamily);
  if (!font?.cdnUrl) return "";

  // Fetch font CSS from CDN
  const res = await fetch(font.cdnUrl);
  const css = await res.text();

  // Get unique character codes from the element text
  const text = element.textContent || "";
  const charCodes = new Set<number>();
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code !== undefined) charCodes.add(code);
  }

  // Parse @font-face blocks and keep only needed unicode ranges
  const faceRegex = /@font-face\s*\{[^}]+\}/g;
  const allFaces = css.match(faceRegex) || [];

  const neededFaces = allFaces.filter((face) => {
    const rangeMatch = face.match(/unicode-range:\s*([^;]+)/);
    if (!rangeMatch) return true; // no range = always include
    return textMatchesUnicodeRange(charCodes, rangeMatch[1]);
  });

  if (neededFaces.length === 0) return "";

  // Extract URLs from needed faces
  const urlRegex = /url\(["']?(https?:\/\/[^"')]+)["']?\)/g;
  const urls: string[] = [];
  for (const face of neededFaces) {
    for (const match of face.matchAll(urlRegex)) {
      urls.push(match[1]);
    }
  }

  // Fetch font files with concurrency limit
  const dataUrlMap = await fetchUrlsWithLimit([...new Set(urls)], CONCURRENT_LIMIT);

  // Replace URLs with data URLs
  let result = neededFaces.join("\n");
  for (const [url, dataUrl] of dataUrlMap) {
    result = result.replaceAll(url, dataUrl);
  }

  return result;
}

// ─── Image Embedding (convert external URLs to data URLs) ────

async function embedExternalImages(element: HTMLElement): Promise<() => void> {
  const restoreFns: (() => void)[] = [];

  // Find all elements with background-image containing external or blob URLs
  const allElements = element.querySelectorAll("*");
  const targets = [element, ...Array.from(allElements)] as HTMLElement[];

  for (const el of targets) {
    const bgImage = el.style.backgroundImage;
    if (!bgImage) continue;

    // Match both http(s) and blob URLs
    const urlMatch = bgImage.match(/url\(["']?((?:https?|blob):[^"')]+)["']?\)/);
    if (!urlMatch) continue;

    const imageUrl = urlMatch[1];
    // Skip if already a data URL
    if (imageUrl.startsWith("data:")) continue;
    try {
      const dataUrl = await fetchAsDataUrl(imageUrl);
      const original = el.style.backgroundImage;
      el.style.backgroundImage = `url(${dataUrl})`;
      restoreFns.push(() => {
        el.style.backgroundImage = original;
      });
    } catch {
      // skip failed image — will render without it
    }
  }

  // Also handle <img> tags (http(s) and blob URLs)
  const imgs = element.querySelectorAll("img");
  for (const img of Array.from(imgs)) {
    if (!img.src || (!img.src.startsWith("http") && !img.src.startsWith("blob:"))) continue;
    try {
      const dataUrl = await fetchAsDataUrl(img.src);
      const original = img.src;
      img.src = dataUrl;
      restoreFns.push(() => {
        img.src = original;
      });
    } catch {
      // skip
    }
  }

  return () => restoreFns.forEach((fn) => fn());
}

// ─── Export Functions ─────────────────────────────────────────

function getBaseOptions(): Parameters<typeof toPng>[1] {
  return {
    width: 1080,
    height: 1350,
    pixelRatio: 1,
    cacheBust: true,
    filter: (node: Element) => {
      // Skip all external stylesheets — we handle fonts via fontEmbedCSS
      if (
        node instanceof HTMLLinkElement &&
        node.rel === "stylesheet" &&
        node.href &&
        !node.href.startsWith(window.location.origin)
      ) {
        return false;
      }
      return true;
    },
  };
}

async function toPngWithFont(element: HTMLElement): Promise<string> {
  const fontEmbedCSS = await buildFontEmbedCSS(element);
  const restore = await embedExternalImages(element);
  try {
    const options = getBaseOptions();
    // Only pass fontEmbedCSS when non-empty; passing "" disables html-to-image's
    // own font detection, causing fallback to system fonts with different metrics.
    if (fontEmbedCSS) {
      return await toPng(element, { ...options, fontEmbedCSS });
    }
    return await toPng(element, options);
  } finally {
    restore();
  }
}

export async function exportSlideToPng(
  element: HTMLElement,
  fileName: string = "card-news.png"
): Promise<void> {
  const dataUrl = await toPngWithFont(element);

  const link = document.createElement("a");
  link.download = fileName;
  link.href = dataUrl;
  link.click();
}

export async function exportSlideToDataUrl(
  element: HTMLElement
): Promise<string> {
  return toPngWithFont(element);
}

export async function exportAllPng(
  slideElements: HTMLElement[],
  projectTitle: string
): Promise<void> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  for (let i = 0; i < slideElements.length; i++) {
    const dataUrl = await toPngWithFont(slideElements[i]);
    const base64 = dataUrl.split(",")[1];
    const paddedIdx = String(i + 1).padStart(2, "0");
    zip.file(`${projectTitle}_slide_${paddedIdx}.png`, base64, { base64: true });
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `${projectTitle}.zip`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportPdf(
  slideElements: HTMLElement[],
  projectTitle: string
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [1080, 1350] });

  for (let i = 0; i < slideElements.length; i++) {
    if (i > 0) pdf.addPage([1080, 1350]);
    const dataUrl = await toPngWithFont(slideElements[i]);
    pdf.addImage(dataUrl, "PNG", 0, 0, 1080, 1350);
  }

  pdf.save(`${projectTitle}.pdf`);
}
