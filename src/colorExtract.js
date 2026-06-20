function colorDist([r1,g1,b1],[r2,g2,b2]) {
  return (r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2;
}

function toHex(r,g,b) {
  return '#' + [r,g,b].map(v => Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
}

function toRgb(r,g,b) {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function toHsl(r,g,b) {
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b);
  let h,s,l=(max+min)/2;
  if (max===min) { h=s=0; } else {
    const d=max-min;
    s = l > 0.5 ? d/(2-max-min) : d/(max+min);
    switch(max) {
      case r: h=((g-b)/d+(g<b?6:0))/6; break;
      case g: h=((b-r)/d+2)/6; break;
      case b: h=((r-g)/d+4)/6; break;
    }
  }
  return `hsl(${Math.round(h*360)}, ${Math.round(s*100)}%, ${Math.round(l*100)}%)`;
}

function luminance(r,g,b) {
  const [rs,gs,bs] = [r,g,b].map(c => {
    c /= 255;
    return c <= 0.03928 ? c/12.92 : ((c+0.055)/1.055)**2.4;
  });
  return 0.2126*rs + 0.7152*gs + 0.0722*bs;
}

export function getContrastColor(r,g,b) {
  return luminance(r,g,b) > 0.35 ? '#111' : '#fff';
}

export function extractColors(imageData, numColors = 6) {
  const pixels = [];
  const step = Math.max(1, Math.floor(imageData.data.length / (4 * 3000)));

  for (let i = 0; i < imageData.data.length; i += 4 * step) {
    const r=imageData.data[i], g=imageData.data[i+1], b=imageData.data[i+2], a=imageData.data[i+3];
    if (a > 100) pixels.push([r,g,b]);
  }

  if (!pixels.length) return [];

  // Init centroids via spread sampling
  const interval = Math.floor(pixels.length / numColors);
  let centroids = Array.from({length: numColors}, (_,i) => [...pixels[i*interval] || pixels[0]]);

  for (let iter = 0; iter < 12; iter++) {
    const clusters = Array.from({length: numColors}, () => []);

    for (const px of pixels) {
      let best=0, bestDist=Infinity;
      for (let c=0; c<centroids.length; c++) {
        const d = colorDist(px, centroids[c]);
        if (d < bestDist) { bestDist=d; best=c; }
      }
      clusters[best].push(px);
    }

    centroids = clusters.map((cluster, ci) => {
      if (!cluster.length) return centroids[ci];
      const sum = cluster.reduce((acc,p) => [acc[0]+p[0], acc[1]+p[1], acc[2]+p[2]], [0,0,0]);
      return sum.map(v => v / cluster.length);
    });
  }

  // Sort by frequency (approximate: cluster sizes)
  return centroids
    .map(([r,g,b]) => ({
      r: Math.round(r), g: Math.round(g), b: Math.round(b),
      hex: toHex(r,g,b),
      rgb: toRgb(r,g,b),
      hsl: toHsl(r,g,b),
    }))
    .filter((c,i,a) => {
      // remove near-duplicates
      return !a.slice(0,i).some(prev => colorDist([c.r,c.g,c.b],[prev.r,prev.g,prev.b]) < 400);
    });
}

export function exportCSS(colors) {
  return `:root {\n${colors.map((c,i) => `  --color-${i+1}: ${c.hex};`).join('\n')}\n}`;
}

export function exportTailwind(colors) {
  const entries = colors.map((c,i) => `    'brand-${i+1}': '${c.hex}',`).join('\n');
  return `// tailwind.config.js\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n${entries}\n      }\n    }\n  }\n}`;
}

export function exportHex(colors) {
  return colors.map(c => c.hex).join('\n');
}
