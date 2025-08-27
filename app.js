// Simple weather app using Open-Meteo (no API key) and Nominatim for geocoding
const q = document.getElementById('q');
const searchBtn = document.getElementById('searchBtn'); // may be null when button removed

if (searchBtn) {
  searchBtn.onclick = handleSearch; // Add event listener for search button
}
const locBtn = document.getElementById('locBtn');
const status = document.getElementById('status');
const currentCard = document.getElementById('current');
const placeEl = document.getElementById('place');
const timeEl = document.getElementById('time');
const tempEl = document.getElementById('temp');
const descEl = document.getElementById('desc');
const windEl = document.getElementById('wind');
const humEl = document.getElementById('humidity');
const presEl = document.getElementById('pressure');
const forecastEl = document.getElementById('forecast');
const forecastSection = document.getElementById('forecast-section');
const addFavBtn = document.getElementById('addFav');
const favoritesList = document.getElementById('favorites');
const favBtn = document.getElementById('favBtn');
const favDropdown = document.getElementById('favDropdown');
const clearFavs = document.getElementById('clearFavs');
const unitToggleLocal = document.getElementById('unitToggleLocal');
const suggestionsEl = document.getElementById('suggestions');
const weatherIconEl = document.getElementById('weatherIcon');
const themeBtn = document.getElementById('themeBtn');
const themeBtnMobile = document.getElementById('themeBtnMobile');

// START: ADDED SVG ICONS
const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
// END: ADDED SVG ICONS


let unit = localStorage.getItem('unit') || 'C';
let lastPlace = null;
let suggestions = [];
let focusedSuggestion = -1;
const loader = document.createElement('div');
loader.className = 'loader';

function fadeIn(el){
  el.style.opacity = 0;
  el.style.transform = 'translateY(6px)';
  requestAnimationFrame(()=>{ el.style.transition = 'all 220ms ease'; el.style.opacity=1; el.style.transform='none'; });
}

function debounce(fn, wait=300){
  let t;
  return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), wait); };
}

function setStatus(msg, important=false){
  status.textContent = msg;
  if(important) status.style.color = getComputedStyle(document.body).getPropertyValue('--accent') || 'black';
  else status.style.color = '';
}

async function geocodePlace(text) {
  console.log("Geocoding for:", text); // Debug log
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=6&addressdetails=1`;
  const res = await fetch(url, {headers:{'User-Agent':'WeatherAPP (example)'}});
  const data = await res.json();
  return data; // array of results
}

async function fetchWeather(lat, lon){
  // Use Open-Meteo: hourly + daily summary
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m,pressure_msl&daily=temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,weathercode&timezone=auto`;
  // show loader in status
  status.innerHTML = ''; status.appendChild(loader);
  const res = await fetch(url);
  const j = await res.json();
  status.removeChild(loader);
  return j;
}

function showCurrent(place, geo, weather){
  lastPlace = {place, geo, weather};
  placeEl.textContent = place;
  const cw = weather.current_weather;
  const tC = Math.round(cw.temperature);
  tempEl.textContent = `${formatTemp(tC)}`;
  descEl.textContent = `${translateWeatherCode(weather.daily?.weathercode?.[0]) || ''}`;
  weatherIconEl.textContent = mapWeatherToEmoji(weather.daily?.weathercode?.[0] ?? weather.current_weather.weathercode);
  timeEl.textContent = new Date().toLocaleString();
  windEl.textContent = `${Math.round(cw.windspeed)} km/h`;
  humEl.textContent = (getHourlyValue(weather, 'relativehumidity_2m') || '—') + '%';
  presEl.textContent = (getHourlyValue(weather, 'pressure_msl') || '—') + ' hPa';
  currentCard.classList.remove('hidden');
  renderForecast(weather.daily);
  // update favorites button state
  updateFavButtonState();
}

function getHourlyValue(weather, key){
  // Safely get the hourly value that matches the current weather time
  if(!weather || !weather.hourly || !weather.hourly[key] || !weather.hourly.time) return null;
  const currentTime = weather.current_weather && weather.current_weather.time;
  if(!currentTime) return null;
  const idx = weather.hourly.time.indexOf(currentTime);
  if(idx === -1) return null;
  return weather.hourly[key][idx];
}

function renderForecast(daily){
  forecastEl.innerHTML = '';
  if(!daily || !daily.time) {
      if(forecastSection) forecastSection.classList.add('hidden'); // Hide section if no data
      return;
  }
  const days = daily.time.map((t,i)=>({
    date:t,
    max:daily.temperature_2m_max[i],
    min:daily.temperature_2m_min[i]
  }));
  days.forEach(d=>{
    const el = document.createElement('div');
    el.className = 'day card';
    const date = new Date(d.date);
    el.innerHTML = `<div class="day-name">${date.toLocaleDateString(undefined,{weekday:'short'})}</div><div class="day-max">${formatTemp(Math.round(d.max))}</div><div class="day-min">${formatTemp(Math.round(d.min))}</div>`;
    forecastEl.appendChild(el);
    fadeIn(el);
  });
  if(forecastSection) forecastSection.classList.remove('hidden');
}

function formatTemp(c){
  if(unit === 'C') return `${c}°`;
  return `${Math.round(c * 9/5 + 32)}°`;
}

function translateWeatherCode(code){
  if(code === undefined || code === null) return '';
  const map = {
    0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog',
    48: 'Depositing rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain', 71: 'Slight snow',
    73: 'Moderate snow', 75: 'Heavy snow', 95: 'Thunderstorm',
  };
  return map[code] || 'Mixed';
}

function mapWeatherToEmoji(code){
  const m = {
    0: '☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',51:'🌦️',53:'🌦️',55:'🌧️',61:'🌧️',63:'🌧️',65:'⛈️',71:'🌨️',73:'🌨️',75:'❄️',95:'⛈️'
  };
  return m[code] || '☁️';
}

async function handleSearch() {
  const text = q.value.trim();
  if(!text) return setStatus('Please type a place to search.');
  setStatus('Searching…');
  const results = await geocodePlace(text);
  if(!results || results.length===0) return setStatus('No results found. Try a nearby city or full name.');
  
  const pick = results[0];
  setStatus(`Loading weather for ${pick.display_name}` , true);
  const weather = await fetchWeather(pick.lat, pick.lon);
  showCurrent(pick.display_name, pick, weather);
  q.value = '';
  suggestionsEl.classList.add('hidden');
  focusedSuggestion = -1;
  q.blur();
  setStatus('Updated');
}

async function useLocation(){
  if(!navigator.geolocation) return setStatus('Geolocation not supported in this browser.');
  setStatus('Requesting location…');
  navigator.geolocation.getCurrentPosition(async pos=>{
    const {latitude, longitude} = pos.coords;
    setStatus('Loading weather for your location…', true);
    const weather = await fetchWeather(latitude, longitude);
    const rev = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
    const j = await rev.json();
    showCurrent(j.display_name || 'Your location', {lat:latitude,lon:longitude}, weather);
    setStatus('Updated');
  }, err=>{
    setStatus('Permission denied or unable to get location.');
  });
}

function saveFav(place){
  try{
    const favs = JSON.parse(localStorage.getItem('favs')||'[]');
    if(!lastPlace || !lastPlace.geo) return setStatus('No place selected to favorite.');
    const key = `${lastPlace.geo.lat},${lastPlace.geo.lon}`;
    if(favs.find(f=>f.key===key)){
      setStatus('Already in favorites.');
      return false;
    }
    const entry = {key, name:lastPlace.place, lat:lastPlace.geo.lat, lon:lastPlace.geo.lon};
    favs.push(entry);
    localStorage.setItem('favs', JSON.stringify(favs));
    try{ renderFavs(); updateFavButtonState(); }catch(e){}
    setStatus(`Saved to favorites (${favs.length}).` , true);
    return true;
  }catch(err){
    console.error('Failed to save favorite', err);
    setStatus('Failed to save favorite. See console.');
    return false;
  }
}

function removeFavByLastPlace(){
  try{
    if(!lastPlace || !lastPlace.geo) return setStatus('No place selected.');
    const key = `${lastPlace.geo.lat},${lastPlace.geo.lon}`;
    const favs = JSON.parse(localStorage.getItem('favs')||'[]').filter(x=>x.key!==key);
    localStorage.setItem('favs', JSON.stringify(favs));
    try{ renderFavs(); updateFavButtonState(); }catch(e){}
    setStatus('Removed from favorites.');
    return true;
  }catch(err){
    console.error('Failed to remove favorite', err);
    setStatus('Failed to remove favorite. See console.');
    return false;
  }
}

function getFavs(){ return JSON.parse(localStorage.getItem('favs')||'[]'); }
function isLastPlaceFavorited(){
  if(!lastPlace || !lastPlace.geo) return false;
  const key = `${lastPlace.geo.lat},${lastPlace.geo.lon}`;
  return getFavs().some(f=>f.key===key);
}

function updateFavButtonState(){
  const fav = isLastPlaceFavorited();
  addFavBtn.textContent = fav ? 'Remove favorite' : 'Add to favorites';
  fav ? addFavBtn.classList.add('remove') : addFavBtn.classList.remove('remove');
}

function renderFavs(){
  if(!favoritesList) return;
  const favs = getFavs();
  favoritesList.innerHTML = '';
  if(favs.length===0){
    favoritesList.innerHTML = '<li style="color:var(--muted); text-align:center; padding: 1rem 0;">No favorites yet</li>';
    return;
  }
  favs.forEach(f=>{
    const li = document.createElement('li');
    li.textContent = f.name;
    const btnContainer = document.createElement('div');
    const btn = document.createElement('button');
    btn.textContent = 'Open';
    btn.onclick = async ()=>{
      setStatus('Loading favorite…', true);
      const weather = await fetchWeather(f.lat, f.lon);
      showCurrent(f.name, {lat:f.lat,lon:f.lon}, weather);
      if(favDropdown) favDropdown.classList.add('hidden');
    };
    const del = document.createElement('button');
    del.textContent = '×';
    del.className = 'link';
    del.onclick=()=>{
      const remaining = getFavs().filter(x=>x.key!==f.key);
      localStorage.setItem('favs', JSON.stringify(remaining));
      renderFavs();
      updateFavButtonState();
    };
    btnContainer.append(btn, del);
    li.appendChild(btnContainer);
    favoritesList.appendChild(li);
  });
}

if(clearFavs) clearFavs.onclick = ()=>{localStorage.removeItem('favs');renderFavs(); updateFavButtonState();}
addFavBtn.onclick = ()=>{ if(isLastPlaceFavorited()) removeFavByLastPlace(); else saveFav(); };
q.onkeydown = (e)=>{if(e.key==='Enter') handleSearch();}
if(locBtn) locBtn.onclick = ()=> useLocation();
if(unitToggleLocal){
  unitToggleLocal.checked = unit === 'F';
  unitToggleLocal.onchange = ()=>{
    unit = unitToggleLocal.checked ? 'F' : 'C';
    localStorage.setItem('unit', unit);
    if(lastPlace) showCurrent(lastPlace.place, lastPlace.geo, lastPlace.weather);
  };
}

function populateSuggestions(results){
  suggestions = results;
  focusedSuggestion = -1;
  suggestionsEl.innerHTML = '';
  results.forEach((r, i)=>{
    const li = document.createElement('li');
    li.textContent = r.display_name;
    li.tabIndex = 0;
    li.onclick = async ()=>{
      q.value = '';
      suggestionsEl.classList.add('hidden');
      focusedSuggestion = -1;
      q.blur();
      setStatus('Loading…', true);
      const weather = await fetchWeather(r.lat, r.lon);
      showCurrent(r.display_name, r, weather);
      setStatus('Updated');
    };
    li.onkeydown = (e)=>{if(e.key==='Enter') li.click();}
    suggestionsEl.appendChild(li);
  });
  suggestionsEl.classList.remove('hidden');
}

q.addEventListener('input', debounce(async (e)=>{
  const v = e.target.value.trim();
  if(v.length<2){ suggestionsEl.classList.add('hidden'); return; }
  const res = await geocodePlace(v);
  if(res && res.length) populateSuggestions(res.slice(0,6));
}, 260));

q.addEventListener('keydown', (e)=>{
  const items = suggestionsEl.querySelectorAll('li');
  if(items.length===0 || suggestionsEl.classList.contains('hidden')) return;
  if(e.key==='ArrowDown'){ e.preventDefault(); focusedSuggestion = Math.min(focusedSuggestion+1, items.length-1); items[focusedSuggestion].focus(); }
  else if(e.key==='ArrowUp'){ e.preventDefault(); focusedSuggestion = Math.max(focusedSuggestion-1, 0); items[focusedSuggestion].focus(); }
  else if (e.key === 'Enter' && focusedSuggestion > -1) { items[focusedSuggestion].click(); }
});

document.addEventListener('click', (e)=>{ 
    if(!e.target.closest('.search-container')) suggestionsEl.classList.add('hidden'); 
    if(!e.target.closest('.fav-wrapper')) favDropdown.classList.add('hidden');
});

if(favBtn && favDropdown){
  favBtn.addEventListener('click', (e)=>{
    e.stopPropagation();
    favDropdown.classList.toggle('hidden');
  });
}

// START: UPDATED THEME FUNCTION
function applyTheme(name){
  document.body.classList.toggle('light-theme', name === 'light');
  if (themeBtn) {
    themeBtn.innerHTML = name === 'light' ? moonIcon : sunIcon;
  }
  if (themeBtnMobile) {
    themeBtnMobile.innerHTML = name === 'light' ? moonIcon : sunIcon;
  }
}
// END: UPDATED THEME FUNCTION

function toggleTheme(){
  const current = document.body.classList.contains('light-theme') ? 'light' : 'dark';
  const next = current === 'light' ? 'dark' : 'light';
  localStorage.setItem('theme', next);
  applyTheme(next);
}

if(themeBtn) themeBtn.onclick = toggleTheme;
if(themeBtnMobile) themeBtnMobile.onclick = toggleTheme;

// Init
renderFavs();
setStatus('Ready — type a place or allow location.');
applyTheme(localStorage.getItem('theme') || 'dark');