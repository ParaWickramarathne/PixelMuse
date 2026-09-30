import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, Check, CheckCheck, ChevronDown, ChevronRight, ChevronsLeftRight, CircleHelp, CloudUpload, FileImage, ImagePlus, Layers, LockKeyhole, Maximize, Menu, Moon, MoveRight, RefreshCw, ShieldCheck, SlidersHorizontal, Sparkles, Sun, Trash2, WandSparkles, X, Zap } from 'lucide-react';
import { demoFile, formatBytes, formatName, optimize, readFile, type ImageItem, type OutputFormat } from './image';

type Tab = 'compress' | 'resize' | 'convert';
const presets: [string, number, number][] = [['Instagram Post',1080,1080],['Instagram Portrait',1080,1350],['Instagram Story',1080,1920],['Facebook Post',1200,630],['YouTube Thumbnail',1280,720],['HD',1920,1080]];
const readPreference = (key: string, fallback: string) => { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } };
const savePreference = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* Preferences are optional in restricted browsers. */ } };

function Logo() { return <a className="brand" href="#"><span className="brand-icon"><Sparkles size={23} fill="currentColor" /></span>Pixel<span>Muse</span><span className="brand-dot">.</span></a>; }
function BeforeAfter({ item }: { item: ImageItem }) {
  const [position, setPosition] = useState(50);
  return <div className="comparison" style={{ aspectRatio: `${item.width} / ${item.height}`, maxHeight: 380 }}>
    <img src={item.result!.url} alt="Optimized image" />
    <img src={item.url} alt="Original image" className="comparison-original" style={{ clipPath: `inset(0 ${100-position}% 0 0)` }} />
    <span className="compare-label before">Original</span><span className="compare-label after">Optimized</span>
    <div className="compare-divider" style={{ left: `${position}%` }}><span><ChevronsLeftRight size={20}/></span></div>
    <input type="range" min="0" max="100" value={position} onChange={e => setPosition(+e.target.value)} aria-label="Before and after comparison" />
  </div>;
}

export default function App() {
  const [dark, setDark] = useState(() => readPreference('pixelmuse-theme', 'light') === 'dark');
  const [menu, setMenu] = useState(false);
  const [tab, setTab] = useState<Tab>('compress');
  const [quality, setQuality] = useState(() => Math.max(10, Math.min(100, Number(readPreference('pixelmuse-quality','80')) || 80)));
  const [format, setFormat] = useState<OutputFormat>(() => { const value = readPreference('pixelmuse-format','image/webp'); return ['image/jpeg','image/png','image/webp'].includes(value) ? value as OutputFormat : 'image/webp'; });
  const [items, setItems] = useState<ImageItem[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [width, setWidth] = useState(''); const [height, setHeight] = useState('');
  const [locked, setLocked] = useState(true); const [resizeMode, setResizeMode] = useState('original');
  const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(false); const [drag, setDrag] = useState(false);
  const [errors, setErrors] = useState<string[]>([]); const [resetDialog, setResetDialog] = useState(false);
  const [faq, setFaq] = useState<number | null>(0);
  const input = useRef<HTMLInputElement>(null); const itemsRef = useRef(items); const dragCount = useRef(0); const workLock = useRef(false);
  const selected = items.find(i => i.id === selectedId) || items[0];
  const completed = items.filter(i => i.result); const originalTotal = completed.reduce((n,i) => n + i.file.size,0); const resultTotal = completed.reduce((n,i) => n + i.result!.blob.size,0);
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; savePreference('pixelmuse-theme', dark ? 'dark' : 'light'); }, [dark]);
  useEffect(() => { savePreference('pixelmuse-quality',String(quality)); }, [quality]);
  useEffect(() => { savePreference('pixelmuse-format',format); }, [format]);
  useEffect(() => {
    if (!resetDialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const background = document.querySelectorAll<HTMLElement>('header, main, footer');
    background.forEach(element => { element.inert = true; });
    const modal = document.querySelector<HTMLElement>('[role="alertdialog"]');
    const controls = modal?.querySelectorAll<HTMLButtonElement>('button');
    controls?.[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !controls?.length) return;
      const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', trap);
    return () => { background.forEach(element => { element.inert = false; }); document.removeEventListener('keydown', trap); previous?.focus(); };
  }, [resetDialog]);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => () => { itemsRef.current.forEach(i => { URL.revokeObjectURL(i.url); if (i.result) URL.revokeObjectURL(i.result.url); }); }, []);
  useEffect(() => { const handler = (e: BeforeUnloadEvent) => { if (items.some(i => i.result && !i.result.downloaded)) { e.preventDefault(); } }; window.addEventListener('beforeunload',handler); return () => window.removeEventListener('beforeunload',handler); }, [items]);
  const navigate = (next: Tab) => { setTab(next); setMenu(false); document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  async function addFiles(files: File[]) {
    if (workLock.current) return;
    workLock.current = true; setLoading(true); setErrors([]);
    const accepted: ImageItem[] = []; const rejected: string[] = [];
    for (const file of files) { try { accepted.push(await readFile(file)); } catch (e) { rejected.push((e as Error).message); } }
    setItems(prev => [...prev,...accepted]); if (accepted.length) { setSelectedId(accepted[0].id); if (resizeMode === 'original') { setWidth(String(accepted[0].width)); setHeight(String(accepted[0].height)); } }
    setErrors(rejected); setLoading(false); workLock.current = false;
  }
  async function tryDemo() { if (workLock.current) return; await addFiles([await demoFile()]); document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' }); }
  function changeDimension(axis: 'width' | 'height', value: string) {
    setResizeMode('custom'); const ratio = selected ? selected.width / selected.height : 1;
    if (axis === 'width') { setWidth(value); if (locked && value) setHeight(String(Math.max(1,Math.round(+value / ratio)))); }
    else { setHeight(value); if (locked && value) setWidth(String(Math.max(1,Math.round(+value * ratio)))); }
  }
  function changePreset(value: string) {
    setResizeMode(value);
    if (value === 'original' || value === 'half') { if (selected) { const scale = value === 'half' ? .5 : 1; setWidth(String(Math.max(1,Math.round(selected.width * scale)))); setHeight(String(Math.max(1,Math.round(selected.height * scale)))); } setLocked(true); }
    else if (value !== 'custom') { const preset = presets[+value]; setWidth(String(preset[1])); setHeight(String(preset[2])); setLocked(false); }
  }
  async function processImages() {
    if (!items.length || workLock.current) return;
    workLock.current = true; setBusy(true); setErrors([]);
    for (const item of items) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'processing', error: undefined } : i));
      try {
        const w = resizeMode === 'original' ? item.width : resizeMode === 'half' ? Math.max(1,Math.round(item.width / 2)) : +width;
        const h = resizeMode === 'original' ? item.height : resizeMode === 'half' ? Math.max(1,Math.round(item.height / 2)) : locked ? Math.max(1,Math.round(w * item.height / item.width)) : +height;
        if (resizeMode !== 'original' && resizeMode !== 'half' && (!width || !height)) throw new Error('Enter both width and height before optimizing.');
        const result = await optimize(item, { quality, format, width: w, height: h });
        if (item.result) URL.revokeObjectURL(item.result.url);
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, result, status: 'done' } : i));
      } catch (e) { setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error', error: (e as Error).message } : i)); }
    }
    setBusy(false); workLock.current = false;
  }
  function download(item: ImageItem) {
    if (!item.result) return;
    const a = document.createElement('a'); a.href = item.result.url; a.download = `${item.file.name.replace(/\.[^.]+$/,'')}-pixelmuse.${item.result.blob.type === 'image/jpeg' ? 'jpg' : item.result.blob.type.split('/')[1]}`; document.body.appendChild(a); a.click(); a.remove();
    setItems(prev => prev.map(i => i.id === item.id && i.result ? { ...i, result: { ...i.result, downloaded: true } } : i));
  }
  function reset() {
    items.forEach(i => { URL.revokeObjectURL(i.url); if (i.result) URL.revokeObjectURL(i.result.url); });
    setItems([]); setSelectedId(''); setWidth(''); setHeight(''); setQuality(80); setFormat('image/webp'); setLocked(true); setResizeMode('original'); setErrors([]); setResetDialog(false); setTab('compress');
  }
  function remove(item: ImageItem) {
    if (item.result && !item.result.downloaded && !window.confirm('Remove this image and its undownloaded result?')) return;
    URL.revokeObjectURL(item.url); if (item.result) URL.revokeObjectURL(item.result.url); setItems(prev => prev.filter(i => i.id !== item.id));
  }
  const faqs = [
    ['Are my images uploaded anywhere?', 'Never. All image processing happens inside your browser, on your own device. Your files are never sent to a server or saved by PixelMuse.'],
    ['Will compression reduce image quality?', 'JPEG and WebP use lossy compression. Balanced quality usually keeps images looking great while reducing size. Compare the results before downloading. PNG is lossless, so its size is unaffected by the quality slider.'],
    ['Which image formats are supported?', 'Upload JPG, JPEG, PNG, or WebP files up to 20 MB each. Export as JPEG, PNG, or WebP in supported browsers. PNG and WebP preserve transparency; JPEG uses a white background. Animated images export as a still frame.'],
    ['Can I resize images for social media?', 'Yes. Choose a preset for Instagram, Facebook, or YouTube, or enter custom dimensions. Fixed presets stretch to fit; use Maintain aspect ratio to preserve proportions.'],
    ['Can I process multiple images?', 'Yes. Select or drop multiple images and optimize them together. Quality and format apply to every image. With aspect ratio enabled, custom width is applied to each image while preserving its proportions. Download each result individually.'],
    ['Is PixelMuse free to use?', 'Yes. Every tool is free, with no account, subscription, or upload limits beyond what your browser can comfortably process.']
  ];

  return <>
    <header className="site-header"><div className="nav-shell"><Logo/><nav className={menu ? 'nav-links open' : 'nav-links'} aria-label="Main navigation"><button onClick={() => navigate('compress')}>Compress</button><button onClick={() => navigate('resize')}>Resize</button><button onClick={() => navigate('convert')}>Convert</button><a href="#how-it-works" onClick={() => setMenu(false)}>How it works</a></nav><div className="nav-actions"><span className="local-badge"><span/>Made for your browser</span><button className="icon-button theme-button" aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setDark(!dark)}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</button><button className="icon-button mobile-menu" aria-label="Toggle navigation" aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button></div></div></header>
    <main>
      <section className="hero"><div className="hero-glow"/><div className="eyebrow"><span><Sparkles size={13}/></span>A little lighter. A lot better.<ChevronRight size={13}/></div><h1>Smaller images.<br/><span>Same magic.</span><span className="hero-spark">✧</span></h1><p>Big on quality. Small on size. Compress, resize, and convert<br className="desktop-break"/> your images in seconds — right in your browser.</p><div className="hero-buttons"><button className="primary" onClick={() => input.current?.click()} disabled={busy || loading}><ImagePlus size={18}/>Upload images<ArrowRight size={17}/></button><button className="secondary" onClick={tryDemo} disabled={busy || loading}><span className="play-icon">▶</span>Try a demo</button></div><div className="hero-trust"><span><ShieldCheck size={14}/>100% private</span><i/><span>No account needed</span><i/><span>Always free</span></div></section>

      <section className="workspace section-shell" id="workspace" aria-label="Image optimizer">
        <div className="workspace-heading"><div><span className="section-kicker">YOUR CREATIVE SIDEKICK</span><h2>Good images. Less baggage.</h2></div><span className="secure-note"><LockKeyhole size={14}/>Your files stay yours.</span></div>
        <div className="tool-shell"><div className="tool-topbar"><div className="tool-tabs" role="tablist" aria-label="Optimization tools">{([['compress',Layers,'Compress'],['resize',Maximize,'Resize'],['convert',RefreshCw,'Convert']] as const).map(([key,Icon,label]) => <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}><Icon size={16}/>{label}</button>)}</div><span className="browser-indicator"><span/>All systems local</span></div>
          <div className="tool-body"><div className="upload-column"><input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" aria-label="Upload images" onChange={e => { void addFiles(Array.from(e.target.files || [])); e.target.value = ''; }}/>
            <button className={`dropzone ${drag ? 'dragging' : ''} ${items.length ? 'compact' : ''}`} disabled={busy || loading} onClick={() => input.current?.click()} onDragEnter={e => { e.preventDefault(); dragCount.current++; setDrag(true); }} onDragOver={e => e.preventDefault()} onDragLeave={e => { e.preventDefault(); if (--dragCount.current === 0) setDrag(false); }} onDrop={e => { e.preventDefault(); dragCount.current = 0; setDrag(false); void addFiles(Array.from(e.dataTransfer.files)); }}>
              <div className="upload-art"><div className="mini-image image-back"><FileImage size={24}/></div><div className="mini-image image-front"><CloudUpload size={32} strokeWidth={1.6}/></div><span className="art-spark">✦</span></div><h3>{loading ? 'Opening your images…' : drag ? 'Drop something wonderful.' : items.length ? 'Room for a few more?' : 'Drop your images here'}</h3><p>or <span>browse files</span> to get started</p><div className="file-types"><span>JPG</span><span>PNG</span><span>WEBP</span><i/>Up to 20 MB each</div><span className="batch-hint"><Layers size={13}/>One image or a whole batch. You choose.</span>
            </button>
            {errors.length > 0 && <div className="error-message" role="alert">{errors.map((e,i) => <p key={i}>{e}</p>)}<button onClick={() => setErrors([])} aria-label="Dismiss errors"><X size={15}/></button></div>}
            {items.length > 0 && <div className="image-list">{items.map(item => <div className={`image-row ${selected?.id === item.id ? 'selected' : ''}`} key={item.id}><button className="image-select" onClick={() => { setSelectedId(item.id); if (resizeMode === 'original' || resizeMode === 'half') { const factor = resizeMode === 'half' ? .5 : 1; setWidth(String(Math.max(1,Math.round(item.width * factor)))); setHeight(String(Math.max(1,Math.round(item.height * factor)))); } }}><img src={item.url} alt=""/><span><strong>{item.file.name}</strong><small>{item.width} × {item.height} · {formatBytes(item.file.size)} · {formatName(item.file.type)}</small><small className={item.status === 'error' ? 'error-text' : 'status'}>{item.status === 'processing' ? 'Optimizing…' : item.error || (item.result ? `${formatBytes(item.result.blob.size)} · Ready to download` : 'Ready to optimize')}</small></span></button>{item.result && <button className="icon-button" aria-label={`Download ${item.file.name}`} onClick={() => download(item)}><ArrowDownToLine size={16}/></button>}<button className="icon-button" aria-label={`Remove ${item.file.name}`} disabled={busy || loading} onClick={() => remove(item)}><X size={16}/></button></div>)}</div>}
            <div className="upload-footnote"><ShieldCheck size={15}/><span>Your images never leave your device. <strong>Promise.</strong></span></div>
          </div>
          <aside className="settings"><div className="settings-title"><h3><SlidersHorizontal size={17}/>{tab === 'compress' ? 'Make it lighter' : tab === 'resize' ? 'Find the perfect fit' : 'A fresh format'}</h3><span className="tiny-tag">{tab === 'compress' ? 'COMPRESSION' : tab.toUpperCase()}</span></div>
            <fieldset disabled={busy || loading} className="settings-fields">
            {tab === 'compress' && <><p className="settings-description">Less weight. All the good stuff.</p><div className="quality-label"><label htmlFor="quality">Image quality</label><span>{quality}<small>%</small></span></div><input id="quality" className="quality-range" type="range" min="10" max="100" value={quality} disabled={format === 'image/png'} style={{ '--range': `${(quality-10)/90*100}%` } as React.CSSProperties} onChange={e => setQuality(+e.target.value)}/><div className="range-labels"><span>Smaller file</span><span>Better quality</span></div><div className="quality-presets">{[[40,'Smallest'],[80,'Balanced'],[95,'Best quality']].map(([q,label]) => <button key={q} className={quality === q ? 'selected' : ''} disabled={format === 'image/png'} onClick={() => setQuality(+q)}>{quality === q && <Check size={12}/>} {label}</button>)}</div></>}
            {tab === 'resize' && <><p className="settings-description">A perfect size for wherever it goes.</p><label className="field-label" htmlFor="resize-preset">Resize preset</label><div className="select-wrap"><select id="resize-preset" value={resizeMode} onChange={e => changePreset(e.target.value)}><option value="original">Original size</option><option value="half">50% smaller</option>{presets.map(([name,w,h],i) => <option value={String(i)} key={name}>{name} · {w} × {h}</option>)}<option value="custom">Custom size</option></select><ChevronDown size={15}/></div><div className="dimension-fields"><label>Width<div><input aria-label="Width" type="number" min="1" max="16384" placeholder="Auto" value={width} onChange={e => changeDimension('width',e.target.value)}/><span>px</span></div></label><span>×</span><label>Height<div><input aria-label="Height" type="number" min="1" max="16384" placeholder="Auto" value={height} onChange={e => changeDimension('height',e.target.value)}/><span>px</span></div></label></div><label className="checkbox-label"><input type="checkbox" checked={locked} onChange={e => { setLocked(e.target.checked); if (e.target.checked && selected && width) setHeight(String(Math.max(1,Math.round(+width * selected.height / selected.width)))); }}/><LockKeyhole size={13}/>Maintain aspect ratio</label>{!locked && <p className="field-note">Exact dimensions stretch the image to fit.</p>}</>}
            {tab === 'convert' && <><p className="settings-description">The right format makes a difference.</p><div className="format-explainer"><FileImage size={23}/><span>Current format<strong>{selected ? formatName(selected.file.type) : 'Add an image to get started'}</strong></span></div></>}
            <div className="format-field"><label className="field-label" htmlFor="output-format">Output format<span className="recommended">{format === 'image/webp' ? 'Recommended' : format === 'image/png' ? 'Lossless' : 'Universal'}</span></label><div className="select-wrap"><select id="output-format" value={format} onChange={e => setFormat(e.target.value as OutputFormat)}><option value="image/webp">WebP</option><option value="image/jpeg">JPEG</option><option value="image/png">PNG</option></select><ChevronDown size={15}/></div></div>
            {tab === 'convert' && format !== 'image/png' && <div className="convert-quality"><div className="quality-label"><label htmlFor="convert-quality">Image quality</label><span>{quality}%</span></div><input id="convert-quality" type="range" min="10" max="100" value={quality} onChange={e => setQuality(+e.target.value)}/></div>}
            <div className="setting-tip"><Zap size={15}/><p>{format === 'image/png' ? 'PNG keeps transparency and full quality. The quality slider does not affect PNG size.' : format === 'image/jpeg' ? 'Great for photos. Transparent areas get a clean white background.' : 'WebP brings smaller files and crisp quality. A little win for the web.'}</p></div>
            </fieldset>
            <button className="primary optimize-button" disabled={!items.length || busy || loading} onClick={processImages}>{busy ? <RefreshCw size={17} className="spin"/> : <WandSparkles size={18}/>} {busy ? 'Optimizing your images…' : items.length > 1 ? `Optimize ${items.length} images` : 'Optimize image'}{!busy && <ArrowRight size={16}/>}</button><p className="settings-bottom">{resizeMode !== 'original' ? `Resize + ${formatName(format)} · ${quality}% quality` : 'Fast, free, and entirely on your device.'}</p>
          </aside></div>
          <div className="tool-bottom"><span><span className="green-dot"/>{items.length ? `${items.length} image${items.length > 1 ? 's' : ''} in your workspace` : 'Your next great image starts here.'}</span><button disabled={!items.length || busy || loading} onClick={() => items.some(i => i.result && !i.result.downloaded) ? setResetDialog(true) : reset()}><RefreshCw size={13}/>Reset workspace</button></div>
        </div>
        {selected?.result && <section className="results" aria-label="Optimization results"><div className="results-header"><div><span className="section-kicker">A LITTLE PIXEL MAGIC</span><h2>Looking good. Feeling lighter.</h2></div><span className="savings-badge"><CheckCheck size={16}/>{selected.result.blob.size <= selected.file.size ? `${Math.round((1-selected.result.blob.size/selected.file.size)*100)}% smaller` : `${Math.round((selected.result.blob.size/selected.file.size-1)*100)}% larger`}</span></div><div className="result-layout"><div><BeforeAfter item={selected}/><p className="comparison-caption"><ChevronsLeftRight size={14}/>Slide to see the difference. Both previews fit the same frame.</p></div><div className="result-summary"><h3>Your image, optimized.</h3><dl>{[['Original size',formatBytes(selected.file.size)],['Optimized size',formatBytes(selected.result.blob.size)],['Space saved',`${selected.file.size >= selected.result.blob.size ? '' : '−'}${formatBytes(Math.abs(selected.file.size-selected.result.blob.size))}`],['Original dimensions',`${selected.width} × ${selected.height}`],['New dimensions',`${selected.result.width} × ${selected.result.height}`],['Format',`${formatName(selected.file.type)} → ${formatName(selected.result.blob.type)}`],['Quality',selected.result.blob.type === 'image/png' ? 'Lossless' : `${selected.result.quality}%`]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{selected.result.blob.size > selected.file.size && <p className="field-note">This output is larger. Try a lower quality, smaller dimensions, or WebP.</p>}<button className="primary" onClick={() => download(selected)}><ArrowDownToLine size={17}/>Download optimized image</button></div></div>{completed.length > 1 && <div className="batch-stats"><div><small>Images optimized</small><strong>{completed.length} / {items.length}</strong></div><div><small>Original total</small><strong>{formatBytes(originalTotal)}</strong></div><div><small>Optimized total</small><strong>{formatBytes(resultTotal)}</strong></div><div><small>{originalTotal >= resultTotal ? 'Total saved' : 'Size increase'}</small><strong>{formatBytes(Math.abs(originalTotal-resultTotal))}</strong></div></div>}</section>}
        <div className="benefits-strip"><span><ShieldCheck/>Private by design</span><span><Zap/>Lightning fast</span><span><Layers/>Batch-friendly</span><span><CheckCheck/>No quality compromises*</span></div><p className="quality-disclaimer">*You control the balance. Preview your results before you download.</p>
      </section>

      <section className="how-section section-shell" id="how-it-works"><div className="section-heading"><span className="section-kicker">LESS WORK. MORE FLOW.</span><h2>Three steps. Zero fuss.</h2><p>From a heavy file to a happy little image.</p></div><div className="steps">{[{n:'01',Icon:CloudUpload,title:'Drop it in',text:'A photo, a screenshot, or a whole folder of ideas. Start with your images.'},{n:'02',Icon:SlidersHorizontal,title:'Make it yours',text:'Dial in the quality, find the right size, and pick your perfect format.'},{n:'03',Icon:ArrowDownToLine,title:'Take it with you',text:'Preview the magic, download your images, and get back to creating.'}].map(({n,Icon,title,text},i) => <div className="step" key={n}><div className="step-top"><span className="step-icon"><Icon size={22}/></span><span className="step-number">{n}</span>{i < 2 && <MoveRight className="step-arrow" size={26}/>}</div><h3>{title}</h3><p>{text}</p></div>)}</div></section>
      <section className="features-section section-shell" id="features"><div className="section-heading"><span className="section-kicker">SMALL DETAILS. BIG DIFFERENCE.</span><h2>Everything your pixels need.</h2><p>A thoughtful little toolkit for your everyday creative work.</p></div><div className="features-grid">{[{Icon:Layers,title:'Smarter compression',text:'Find your sweet spot between a tiny file and a beautiful image.',tag:'Less is more'},{Icon:Maximize,title:'A size for every story',text:'From a social post to your next website. Get the dimensions just right.',tag:'Ready for anywhere'},{Icon:RefreshCw,title:'A change of format',text:'JPG, PNG, or WebP. Give your images a new look behind the scenes.',tag:'Keep it flexible'},{Icon:ChevronsLeftRight,title:'See for yourself',text:'Compare the before and after. Because the details deserve a closer look.',tag:'Every pixel matters'}].map(({Icon,title,text,tag}) => <article className="feature-card" key={title}><span className="feature-icon"><Icon size={21}/></span><h3>{title}</h3><p>{text}</p><span className="feature-tag">{tag}<ArrowUpRightIcon/></span></article>)}</div></section>
      <section className="privacy-section section-shell" id="privacy"><div className="privacy-card"><div className="privacy-art"><div><ShieldCheck size={48} strokeWidth={1.3}/></div><span className="privacy-lock"><LockKeyhole size={17}/></span></div><div className="privacy-copy"><span className="section-kicker">YOUR IMAGES. YOUR BUSINESS.</span><h2>What happens in your browser,<br/>stays in your browser.</h2><p>No uploads. No cloud storage. No peeking. PixelMuse does all the work on your device, so your files are only ever yours.</p><div><span><Check size={14}/>100% local processing</span><span><Check size={14}/>No account required</span></div></div><span className="privacy-decoration">✧</span></div></section>
      <section className="faq-section section-shell"><div><span className="section-kicker">A LITTLE CLARITY</span><h2>Glad you asked.</h2><p>A few things you might be wondering.</p><span className="faq-decoration"><CircleHelp size={35} strokeWidth={1.3}/></span></div><div className="faq-list">{faqs.map(([question,answer],i) => <div className={`faq-item ${faq === i ? 'expanded' : ''}`} key={question}><button aria-expanded={faq === i} aria-controls={`faq-${i}`} onClick={() => setFaq(faq === i ? null : i)}>{question}<span>{faq === i ? '−' : '+'}</span></button>{faq === i && <p id={`faq-${i}`}>{answer}</p>}</div>)}</div></section>
      <section className="bottom-cta section-shell"><span className="cta-spark">✧</span><h2>Make room for more possibilities.</h2><p>Your next lighter, brighter image is one drop away.</p><button className="primary" onClick={() => { document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' }); input.current?.click(); }} disabled={busy || loading}>Let’s lighten things up<ArrowRight size={17}/></button></section>
    </main>
    <footer><div className="footer-top section-shell"><div><Logo/><p>A little less weight. A little more possibility.</p></div><div className="footer-links"><a href="#workspace">The tools</a><a href="#how-it-works">How it works</a><a href="#privacy">Your privacy<ShieldCheck size={12}/></a></div></div><div className="footer-bottom section-shell"><span>© {new Date().getFullYear()} PixelMuse. Made for the little details.</span><span>Built with care. <span className="purple">And a little pixel magic.</span><Sparkles size={12}/></span></div></footer>
    {resetDialog && <div className="modal-backdrop" onKeyDown={e => { if (e.key === 'Escape') setResetDialog(false); }}><div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="reset-title"><span className="feature-icon"><Trash2 size={23}/></span><h2 id="reset-title">Start fresh?</h2><p>You have optimized images you haven’t downloaded yet. Resetting will clear all images and restore the default settings.</p><div><button autoFocus className="secondary" onClick={() => setResetDialog(false)}>Keep my images</button><button className="primary" onClick={reset}>Reset workspace</button></div></div></div>}
  </>;
}
function ArrowUpRightIcon() { return <ArrowRight size={13} style={{ transform: 'rotate(-40deg)' }}/>; }
