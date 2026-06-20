import { useState, useRef, useCallback } from 'react';
import { extractColors, getContrastColor, exportCSS, exportTailwind, exportHex } from './colorExtract';

export default function App() {
  const [colors, setColors]     = useState([]);
  const [imgSrc, setImgSrc]     = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [exportFmt, setExportFmt] = useState('css');
  const [copied, setCopied]     = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const canvasRef               = useRef(null);
  const fileRef                 = useRef(null);

  const processFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target.result;
      setImgSrc(src);
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const MAX = 300;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        canvas.width  = img.width  * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const extracted = extractColors(data, 6);
        setColors(extracted);
        setLoading(false);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  const getExportText = () => {
    if (exportFmt === 'css') return exportCSS(colors);
    if (exportFmt === 'tailwind') return exportTailwind(colors);
    return exportHex(colors);
  };

  const copyExport = () => {
    navigator.clipboard.writeText(getExportText());
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const copyColor = (hex, i) => {
    navigator.clipboard.writeText(hex);
    setCopiedIdx(i); setTimeout(() => setCopiedIdx(null), 1500);
  };

  return (
    <div className="app">
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <header>
        <div className="logo">
          <svg width="32" height="32" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="7" fill="white" stroke="#F0F0F0" strokeWidth="1"/>
            <circle cx="12" cy="14" r="6" fill="#FF6B6B" opacity="0.85"/>
            <circle cx="20" cy="14" r="6" fill="#FFE66D" opacity="0.85"/>
            <circle cx="16" cy="20" r="6" fill="#4ECDC4" opacity="0.85"/>
          </svg>
          <div>
            <h1 className="logo-text">ColorDrop</h1>
            <p className="tagline">Extract color palettes from any image.</p>
          </div>
        </div>
      </header>

      <div
        className={`drop-zone ${dragging ? 'over' : ''} ${imgSrc ? 'has-image' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current.click()}
      >
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => processFile(e.target.files[0])} />

        {imgSrc ? (
          <img src={imgSrc} alt="uploaded" className="preview-img" />
        ) : (
          <div className="drop-prompt">
            <span className="drop-icon">↓</span>
            <span className="drop-text">Drop an image here</span>
            <span className="drop-sub">or click to browse &mdash; JPG, PNG, WEBP</span>
          </div>
        )}
      </div>

      {loading && <div className="loading-bar"><div className="loading-fill" /></div>}

      {colors.length > 0 && (
        <>
          <div className="swatches">
            {colors.map((c, i) => (
              <div
                key={i}
                className="swatch"
                style={{ background: c.hex }}
                onClick={() => copyColor(c.hex, i)}
                title={`Click to copy ${c.hex}`}
              >
                <div className="swatch-info" style={{ color: getContrastColor(c.r, c.g, c.b) }}>
                  <span className="swatch-hex">{c.hex}</span>
                  <span className="swatch-sub">{copiedIdx === i ? 'copied!' : c.hsl.split(',')[0].trim()}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="color-detail-row">
            {colors.map((c, i) => (
              <div key={i} className="color-detail">
                <div className="cd-dot" style={{ background: c.hex }} />
                <div className="cd-values">
                  <span className="cd-hex">{c.hex}</span>
                  <span className="cd-rgb">{c.rgb}</span>
                  <span className="cd-hsl">{c.hsl}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="export-section">
            <div className="export-header">
              <div className="export-tabs">
                {['css','tailwind','hex'].map(f => (
                  <button key={f} className={`etab ${exportFmt === f ? 'active' : ''}`} onClick={() => setExportFmt(f)}>
                    {f === 'css' ? 'CSS variables' : f === 'tailwind' ? 'Tailwind config' : 'Hex list'}
                  </button>
                ))}
              </div>
              <button className="copy-export-btn" onClick={copyExport}>
                {copied ? 'copied!' : 'copy'}
              </button>
            </div>
            <pre className="export-code">{getExportText()}</pre>
          </div>

          <button className="reset-btn" onClick={() => { setColors([]); setImgSrc(null); }}>
            Try another image
          </button>
        </>
      )}
    </div>
  );
}
