/** Export only the SVG artwork, never the surrounding toolbar or instructions. */
export function prepareSketchExport(svg: SVGSVGElement, pixelRatio = 1) {
  const scale = Math.min(3, Math.max(2, Number.isFinite(pixelRatio) ? pixelRatio : 2));
  const width = Math.round(640 * scale);
  const height = Math.round(230 * scale);
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.querySelectorAll('text').forEach((node) => node.remove());
  // Standalone SVG must not depend on page styles or accessibility attributes.
  for (const attribute of ['class', 'style', 'role', 'aria-label']) copy.removeAttribute(attribute);
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  copy.setAttribute('width', String(width));
  copy.setAttribute('height', String(height));
  return { source: new XMLSerializer().serializeToString(copy), width, height };
}

export async function sketchPng(svg: SVGSVGElement, pixelRatio = 1): Promise<Blob> {
  const { source, width, height } = prepareSketchExport(svg, pixelRatio);
  const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }));
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('图像导出超时')), 15_000);
      image.onload = () => { clearTimeout(timeout); resolve(); };
      image.onerror = () => { clearTimeout(timeout); reject(new Error('无法读取练习图像')); };
      image.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('无法创建导出画布');
    context.drawImage(image, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('无法生成 PNG')), 'image/png');
    });
  } finally {
    image.onload = null;
    image.onerror = null;
    URL.revokeObjectURL(url);
  }
}

export function downloadSketch(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `无边春-排线练习-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
  try {
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    // Give mobile browsers time to consume the download URL.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
