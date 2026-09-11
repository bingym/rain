const TRACKS = [
  { name: '下雨', artist: '李志', url: 'https://drive-cdn.1994.link/rain-project/下雨.m4a' },
  { name: '你离开了南京从此没有人和我说话', artist: '李志', url: 'https://drive-cdn.1994.link/rain-project/你离开了南京从此没有人和我说话.m4a' },
  { name: '关于郑州的记忆', artist: '李志', url: 'https://drive-cdn.1994.link/rain-project/关于郑州的记忆.m4a' },
  { name: '天空之城', artist: '李志', url: 'https://drive-cdn.1994.link/rain-project/天空之城.m4a' },
  { name: '梵高先生', artist: '李志', url: 'https://drive-cdn.1994.link/rain-project/梵高先生.m4a' },
  { name: '这个世界会好吗', artist: '李志', url: 'https://drive-cdn.1994.link/rain-project/这个世界会好吗.m4a' },
];
const RAIN_URL = 'https://drive-cdn.1994.link/rain-project/rain001.m4a';
const QUOTES = [
  '“ 你离开了南京，从此没有人和我说话 ”',
  '“ 梵高先生，你的向日葵正在燃烧 ”',
  '“ 这个世界会好吗 ”',
  '“ 天空之城，雨落下来，没有声音 ”',
  '“ 关于郑州的记忆，是潮湿的 ”',
  '“ 下雨了，适合想你，也适合写代码 ”',
];

const $ = (id) => document.getElementById(id);
const playBtn = $('play-btn');
const pauseBtn = $('pause-btn');
const stateLabel = $('state-label');
const nowPlaying = $('now-playing');
const npText = $('np-text');
const trackListEl = $('track-list');
const rainVol = $('rain-volume'), rainVolVal = $('rain-volume-val');
const musicVol = $('music-volume'), musicVolVal = $('music-volume-val');
const intensity = $('rain-intensity'), intensityVal = $('rain-intensity-val');
const rainMuteBtn = $('rain-mute');
const musicMuteBtn = $('music-mute');
const themeBtn = $('theme-btn');
const iconSun = $('icon-sun');
const iconMoon = $('icon-moon');
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
let rainDropRGB = '200,220,214';

function setTheme(t, persist = true) {
  document.documentElement.dataset.theme = t;
  if (persist) {
    try { localStorage.setItem('rain.theme', t); } catch (e) {}
  }
  const light = t === 'light';
  iconSun.hidden = !light; // 浅色显示太阳，深色显示月亮
  iconMoon.hidden = light;
  if (themeColorMeta) themeColorMeta.content = light ? '#e9e6dc' : '#0b0f0e';
  rainDropRGB = light ? '48,78,72' : '200,220,214';
}

// 主题初始化：内联脚本已按 localStorage / 系统偏好设好，这里只做同步
(function initTheme() {
  const t = document.documentElement.dataset.theme || 'dark';
  setTheme(t, false);
})();
themeBtn.addEventListener('click', () => {
  setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
});

const rainAudio = new Audio(RAIN_URL);
rainAudio.loop = true;
rainAudio.preload = 'auto';
const musicAudio = new Audio();
musicAudio.preload = 'auto';

let trackIndex = Number(localStorage.getItem('rain.track') || 0) || 0;
if (trackIndex < 0 || trackIndex >= TRACKS.length) trackIndex = 0;
let isPlaying = false;
let rainOn = localStorage.getItem('rain.rainOn') !== 'false';
let musicOn = localStorage.getItem('rain.musicOn') !== 'false';

rainAudio.volume = Number(localStorage.getItem('rain.rainVol') ?? 0.8);
musicAudio.volume = Number(localStorage.getItem('rain.musicVol') ?? 0.45);
rainVol.value = Math.round(rainAudio.volume * 100);
musicVol.value = Math.round(musicAudio.volume * 100);
rainVolVal.textContent = rainVol.value;
musicVolVal.textContent = musicVol.value;

function loadTrack(i, autoplay) {
  trackIndex = (i + TRACKS.length) % TRACKS.length;
  localStorage.setItem('rain.track', String(trackIndex));
  musicAudio.src = TRACKS[trackIndex].url;
  renderTracks();
  updateNowPlaying();
  updateMediaSession();
  if (autoplay) musicAudio.play().catch(() => {});
}

function renderTracks() {
  if (!trackListEl) return;
  trackListEl.innerHTML = '';
  TRACKS.forEach((t, i) => {
    const li = document.createElement('li');
    if (i === trackIndex) li.classList.add('active');
    li.innerHTML = `<span class="idx">${String(i + 1).padStart(2, '0')}</span>
      <span><div class="t-name">${t.name}</div><div class="t-art">${t.artist}</div></span>
      <span class="t-state">${i === trackIndex ? (isPlaying && musicOn ? '▶' : '·') : ''}</span>`;
    li.addEventListener('click', () => {
      loadTrack(i, true);
      if (!isPlaying) setPlaying(true);
      else if (!musicOn) { musicOn = true; syncMusic(); }
    });
    trackListEl.appendChild(li);
  });
}

function updateNowPlaying() {
  const t = TRACKS[trackIndex];
  npText.textContent = `雨声 · ${t.name} — ${t.artist}`;
  nowPlaying.hidden = !isPlaying;
  nowPlaying.querySelector('.eq')?.classList.toggle('paused-eq', !(isPlaying && musicOn));
}

function updateMasterUI() {
  // 互斥显示：播放中只显示 pause，暂停只显示 play
  if (playBtn) playBtn.hidden = isPlaying;
  if (pauseBtn) pauseBtn.hidden = !isPlaying;
  if (playBtn) playBtn.setAttribute('aria-pressed', String(!isPlaying));
  if (pauseBtn) pauseBtn.setAttribute('aria-pressed', String(isPlaying));
  stateLabel.textContent = isPlaying ? 'RAINING — 正在下雨' : 'PAUSED — 已暂停';
  renderTracks();
  updateNowPlaying();
}

async function setPlaying(on) {
  isPlaying = on;
  if (on) {
    try {
      if (rainOn) await rainAudio.play();
      if (musicOn) await musicAudio.play();
    } catch (e) { /* autoplay blocked, keep UI */ }
  } else {
    rainAudio.pause();
    musicAudio.pause();
  }
  updateMasterUI();
}

function syncRain() {
  if (!rainMuteBtn) return;
  rainMuteBtn.textContent = rainOn ? 'ON' : 'OFF';
  rainMuteBtn.classList.toggle('is-on', rainOn);
  rainMuteBtn.setAttribute('aria-pressed', String(rainOn));
  localStorage.setItem('rain.rainOn', String(rainOn));
  if (!isPlaying) return;
  if (rainOn) rainAudio.play().catch(() => {});
  else rainAudio.pause();
}
function syncMusic() {
  const on = musicOn;
  if (musicMuteBtn) {
    musicMuteBtn.textContent = on ? 'ON' : 'OFF';
    musicMuteBtn.classList.toggle('is-on', on);
    musicMuteBtn.setAttribute('aria-pressed', String(on));
  }
  localStorage.setItem('rain.musicOn', String(on));
  if (!isPlaying) { updateNowPlaying(); renderTracks(); return; }
  if (on) musicAudio.play().catch(() => {});
  else musicAudio.pause();
  updateNowPlaying(); renderTracks();
}

playBtn?.addEventListener('click', () => setPlaying(true));
pauseBtn?.addEventListener('click', () => setPlaying(false));
rainMuteBtn?.addEventListener('click', () => { rainOn = !rainOn; syncRain(); });
musicMuteBtn?.addEventListener('click', () => { musicOn = !musicOn; syncMusic(); });
$('prev-btn')?.addEventListener('click', () => loadTrack(trackIndex - 1, isPlaying && musicOn));
$('next-btn')?.addEventListener('click', () => loadTrack(trackIndex + 1, isPlaying && musicOn));
musicAudio.addEventListener('ended', () => loadTrack(trackIndex + 1, true));

rainVol?.addEventListener('input', () => {
  rainAudio.volume = rainVol.value / 100;
  if (rainVolVal) rainVolVal.textContent = rainVol.value;
  localStorage.setItem('rain.rainVol', String(rainAudio.volume));
});
musicVol?.addEventListener('input', () => {
  musicAudio.volume = musicVol.value / 100;
  if (musicVolVal) musicVolVal.textContent = musicVol.value;
  localStorage.setItem('rain.musicVol', String(musicAudio.volume));
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName || '')) {
    e.preventDefault(); setPlaying(!isPlaying);
  } else if (e.key === 'm' || e.key === 'M') { musicOn = !musicOn; syncMusic(); }
  else if (e.key === 'r' || e.key === 'R') { rainOn = !rainOn; syncRain(); }
  else if (e.key === 't' || e.key === 'T') { setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'); }
});

function updateMediaSession() {
  if (!('mediaSession' in navigator)) return;
  const t = TRACKS[trackIndex];
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.name, artist: t.artist, album: 'Rain × 李志',
      artwork: [{ src: './icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
    });
    navigator.mediaSession.setActionHandler('play', () => setPlaying(true));
    navigator.mediaSession.setActionHandler('pause', () => setPlaying(false));
    navigator.mediaSession.setActionHandler('previoustrack', () => loadTrack(trackIndex - 1, true));
    navigator.mediaSession.setActionHandler('nexttrack', () => loadTrack(trackIndex + 1, true));
  } catch {}
}

// quote rotation
const quoteEl = $('quote');
let qi = 0;
setInterval(() => {
  quoteEl.classList.add('fade');
  setTimeout(() => {
    qi = (qi + 1) % QUOTES.length;
    quoteEl.textContent = QUOTES[qi];
    quoteEl.classList.remove('fade');
  }, 600);
}, 8000);

// ---- rain canvas ----
const canvas = $('rain-canvas');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, drops = [];
let intensityValNum = Number(intensity.value);

function resize() {
  W = canvas.width = Math.floor(innerWidth * devicePixelRatio);
  H = canvas.height = Math.floor(innerHeight * devicePixelRatio);
  canvas.style.width = innerWidth + 'px';
  canvas.style.height = innerHeight + 'px';
}
addEventListener('resize', resize); resize();

function seed() {
  const count = Math.floor((innerWidth * innerHeight) / 9000);
  drops = Array.from({ length: count }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    len: (8 + Math.random() * 18) * devicePixelRatio,
    speed: (6 + Math.random() * 10) * devicePixelRatio,
    opacity: 0.12 + Math.random() * 0.34,
  }));
}
seed();
addEventListener('resize', seed);

intensity?.addEventListener('input', () => {
  if (intensityVal) intensityVal.textContent = intensity.value;
  intensityValNum = Number(intensity.value);
});

function frame() {
  ctx.clearRect(0, 0, W, H);
  const density = intensityValNum / 100; // 0.01..1
  const active = Math.floor(drops.length * (0.15 + density * 0.85));
  const isLight = document.documentElement.dataset.theme === 'light';
  // 雨势越大线越粗、越长、越不透明；light 模式额外加对比度
  ctx.lineCap = 'round';
  ctx.lineWidth = devicePixelRatio * (0.9 + density * 1.5);
  const wind = Math.sin(Date.now() / 4000) * devicePixelRatio * 0.6;
  for (let i = 0; i < active; i++) {
    const d = drops[i];
    const len = d.len * (0.85 + density * 0.7);
    let alpha = d.opacity * (0.5 + density * 1.2);
    if (isLight) alpha = alpha * 1.35 + 0.08 + density * 0.18;
    alpha = Math.min(1, alpha);
    ctx.strokeStyle = `rgba(${rainDropRGB},${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x + wind, d.y + len);
    ctx.stroke();
    d.y += d.speed * (0.5 + density * 1.1);
    d.x += wind * 0.4;
    if (d.y > H) { d.y = -20; d.x = Math.random() * W; }
  }
  requestAnimationFrame(frame);
}
frame();

// ---- PWA ----
if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
let deferredPrompt = null;
const installBtn = $('install-btn');
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});
installBtn.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.hidden = true;
});

// init
loadTrack(trackIndex, false);
syncRain(); syncMusic(); updateMasterUI();
