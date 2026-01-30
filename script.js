import { race } from "racing-bars";
import * as d3 from "d3-dsv";

/**
 * 1. DESIGN & STYLING
 */
const style = document.createElement('style');
style.innerHTML = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; background: #0b0b0b; color: #fff; font-family: 'Segoe UI', sans-serif; overflow: hidden; }
  #setup-ui { padding: 20px; max-width: 550px; margin: 0 auto; display: flex; flex-direction: column; gap: 12px; min-height: 100vh; justify-content: center; }
  
  .header h1 { 
    margin: 0; font-size: 28px; font-weight: 900; text-align: center;
    background: linear-gradient(to right, #007aff, #00ff88);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    text-transform: uppercase;
  }

  .input-group { display: flex; flex-direction: column; gap: 4px; position: relative; }
  .input-group label { font-size: 10px; font-weight: bold; color: #007aff; text-transform: uppercase; }
  input, select { padding: 12px; background: #1c1c1e; border: 1px solid #333; border-radius: 10px; color: #fff; font-size: 14px; }
  
  .mapping-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 15px; background: #1c1c1e; border-radius: 12px; border: 1px solid #007aff44; }
  
  /* THEME DEFINITIONS */
  #race-container { display: none; width: 100vw; height: 100vh; justify-content: center; align-items: center; position: relative; overflow: hidden; }
  
  /* Modern Dark Theme */
  .theme-dark { background: #0b0b0b !important; color: #fff !important; }
  /* Clean White Theme */
  .theme-light { background: #ffffff !important; color: #000 !important; }
  /* RgRank Blue Theme */
  .theme-blue { background: radial-gradient(circle, #001d3d 0%, #000814 100%) !important; color: #fff !important; }
  /* Gold/Luxury Theme */
  .theme-gold { background: #1a1a1a !important; border-top: 5px solid #ffca3a; }

  /* BACKGROUND LOGO - FIXED VISIBILITY */
  .bg-watermark {
    position: absolute;
    top: 13%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80px;
    opacity: 0.15; 
    z-index: 1;
    pointer-events: none;
  }

  #race { width: 100%; height: 90%; max-width: 56.25vh; position: relative; z-index: 2; }
  
  .primary-btn { padding: 16px; background: linear-gradient(135deg, #007aff, #0051af); border: none; border-radius: 12px; color: #fff; font-weight: 800; cursor: pointer; width: 100%; text-transform: uppercase; }
  .secondary-btn { padding: 8px 12px; background: #2c2c2e; border: 1px solid #444; border-radius: 6px; color: #bbb; font-size: 11px; cursor: pointer; }

  /* DATE STYLING */
  .racing-bars-date { margin-bottom: 25px !important; font-weight: 900 !important; font-size: 40px !important; }
`;
document.head.appendChild(style);

/**
 * 2. UI LAYOUT
 */
document.body.innerHTML = `
  <div id="setup-ui">
    <div class="header"><h1>RgRank Reel Studio Pro</h1></div>
    
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px;">
      <div class="input-group">
        <label>Visual Theme</label>
        <select id="in-theme">
        <option value="theme-light">Clean White</option>
          <option value="theme-dark">Midnight Dark</option>
          <option value="theme-blue">Deep Ocean</option>
          <option value="theme-gold">Luxury Gold</option>
        </select>
      </div>
      <div class="input-group">
        <label>Icon Style</label>
        <select id="in-type">
          <option value="flag">Flags</option>
          <option value="player">Players</option>
          <option value="club">Clubs</option>
        </select>
      </div>
    </div>

    <div class="input-group">
      <label>API URL</label>
      <input type="text" id="in-json-url" value="">
      <button class="secondary-btn" id="btn-csv-export" style="margin-top:5px;">🛠 Download CSV Helper</button>
    </div>

    <div class="input-group">
      <label>Upload CSV</label>
      <input type="file" id="csvUpload" accept=".csv">
    </div>

    <div class="mapping-grid">
      <div class="input-group"><label>Date Key</label><input type="text" id="map-date" value="date"></div>
      <div class="input-group"><label>Name Key</label><input type="text" id="map-name" value="country.value"></div>
      <div class="input-group"><label>Value Key</label><input type="text" id="map-value" value="value"></div>
      <div class="input-group"><label>Code Key</label><input type="text" id="map-code" value="country.id"></div>
    </div>

    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px;">
      <div class="input-group">
        <label>Video Title</label>
        <input type="text" id="in-title" value="RgRank Highlights">
      </div>
      <div class="input-group"><label>Speed (ms)</label><input type="number" id="in-speed" value="600"></div>
    </div>

    <button id="btn-run" class="primary-btn">Create Video</button>
  </div>

  <div id="race-container">
    <img src="https://i.ibb.co/p7dFGDP/RgRank-Logo.png" id="logo-bg" class="bg-watermark">
    <div id="race"></div>
  </div>
`;

/**
 * 3. CORE LOGIC
 */
const getNested = (obj, path) => path ? path.split('.').reduce((o, i) => (o ? o[i] : null), obj) : null;

function startRace(rawData) {
  const selectedTheme = document.getElementById('in-theme').value;
  const typeMode = document.getElementById('in-type').value;
  const container = document.getElementById('race-container');
  const logo = document.getElementById('logo-bg');

  // Apply Theme Classes
  container.className = selectedTheme;
  // Adjust logo filter based on theme
  logo.style.filter = (selectedTheme === 'theme-light') ? 'grayscale(1) opacity(0.5)' : 'brightness(0) invert(1)';

  const config = {
    title: document.getElementById('in-title').value,
    showIcons: true,
    showControls: false,
    topN: 12,
    tickDuration: parseInt(document.getElementById('in-speed').value) || 600,
    margin: { top: 120, right: 200, bottom: 120, left: 100 },
    labelsPosition: "outside", 
    iconPosition: "after",
    
    dataTransform: (data) => {
      let list = (Array.isArray(data) && data[0]?.page !== undefined) ? data[1] : (data.standings?.[0]?.table || data.matches || data);
      return list.filter(d => d).map(item => {
        const name = getNested(item, document.getElementById('map-name').value) || "Unknown";
        const codeRaw = getNested(item, document.getElementById('map-code').value) || "";
        const code = codeRaw.toString().toLowerCase().trim();
        let icon = "";
        if (code) {
          if (typeMode === 'player') icon = `https://www.futbin.com/content/fifa24/img/players/${code}.png`;
          else if (typeMode === 'club') icon = `https://tmssl.akamaized.net/images/wappen/head/${code}.png`;
          else icon = `https://flagcdn.com/w160/${code}.png`;
        }
        return { 
            date: getNested(item, document.getElementById('map-date').value) || "2024", 
            name, 
            value: Number(getNested(item, document.getElementById('map-value').value)) || 0, 
            icon 
        };
      });
    },
    iconStyle: { width: '48px', height: '48px', borderRadius: typeMode === 'player' ? '50%' : '6px' }
  };

  document.getElementById("setup-ui").style.display = "none";
  container.style.display = "flex";
  race(rawData, "#race", config);
}

// HANDLERS
document.getElementById('btn-run').onclick = async () => {
  const fileInput = document.getElementById('csvUpload');
  const urlInput = document.getElementById('in-json-url').value;
  if (fileInput.files.length > 0) {
    const reader = new FileReader();
    reader.onload = (e) => startRace(d3.csvParse(e.target.result));
    reader.readAsText(fileInput.files[0]);
  } else {
    try {
      const res = await fetch(urlInput);
      const json = await res.json();
      startRace(json);
    } catch (e) { alert("Data Error"); }
  }
};