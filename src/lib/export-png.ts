import { toPng } from "html-to-image";

export async function exportSlideToPng(
  element: HTMLElement,
  fileName: string = "card-news.png"
): Promise<void> {
  const dataUrl = await toPng(element, {
    width: 1080,
    height: 1350,
    pixelRatio: 1,
    cacheBust: true,
  });

  const link = document.createElement("a");
  link.download = fileName;
  link.href = dataUrl;
  link.click();
}

export async function exportSlideToDataUrl(
  element: HTMLElement
): Promise<string> {
  return toPng(element, {
    width: 1080,
    height: 1350,
    pixelRatio: 1,
    cacheBust: true,
  });
}
