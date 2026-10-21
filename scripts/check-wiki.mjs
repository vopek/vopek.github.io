import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const profile = await mkdtemp(path.join(tmpdir(), 'miracle74-browser-'));
const executable = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browser = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run',
  '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'],
  { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let socket;
try {
  const endpoint = await new Promise((resolve, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Chrome did not start')), 20000);
    browser.once('error', error => { clearTimeout(timer); reject(error); });
    browser.stderr.on('data', chunk => {
      output += chunk;
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
  });
  socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  socket.onmessage = event => {
    const result = JSON.parse(event.data);
    if (pending.has(result.id)) {
      const { resolve, reject, timer } = pending.get(result.id);
      clearTimeout(timer); pending.delete(result.id);
      result.error ? reject(new Error(result.error.message)) : resolve(result.result);
    }
  };
  function call(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 20000);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  const { targetId } = await call('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await call('Target.attachToTarget', { targetId, flatten: true });
  const page = (method, params) => call(method, params, sessionId);
  await page('Page.enable');
  await page('Network.enable');
  // Blocking HTTP(S) proves that the catalog and its sprites work offline.
  await page('Network.setBlockedURLs', { urls: ['http://*', 'https://*'] });
  async function evaluate(expression) {
    const result = await page('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  async function navigate(relative, selector) {
    await page('Page.navigate', { url: pathToFileURL(path.join(root, relative.split('?')[0])).href + (relative.includes('?') ? '?' + relative.split('?')[1] : '') });
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      if (await evaluate(`document.readyState === 'complete' && !!document.querySelector(${JSON.stringify(selector)})`)) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Page did not render: ${relative}`);
  }
  await page('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  for (const id of ['barbarian-brute','dragon','cyclops','demon-skeleton','elf-arcanist','elf-scout']) {
    await navigate(`monsters.html?monster=${id}`, '.bestiary');
    const size = await evaluate('({height:document.documentElement.scrollHeight,width:document.documentElement.scrollWidth,viewportHeight:innerHeight,viewportWidth:innerWidth})');
    assert(size.height <= size.viewportHeight, `${id} needs vertical scrolling at 1366x768: ${size.height}`);
    assert(size.width <= size.viewportWidth, `${id} needs horizontal scrolling`);
    if (process.env.WIKI_SCREENSHOT && id === 'barbarian-brute') {
      const { data } = await page('Page.captureScreenshot', { format: 'png' });
      await writeFile(process.env.WIKI_SCREENSHOT, Buffer.from(data, 'base64'));
    }
  }
  await navigate('monsters.html', '.card');
  const monsterCount = await evaluate('document.querySelectorAll(".card").length');
  assert(monsterCount >= 171);
  for (const id of ['barbarian-dothraki','barbarian-guard','beholder','cave-rat','crypt-shambler','cyclops','demon-skeleton','dragon','dwarf-soldier','elf-arcanist','elf-scout','frost-spider','frost-troll']) {
    assert.equal(await evaluate(`!!document.querySelector('a.has-loot[href="monsters.html?monster=${id}"] .card-stats')`), true);
  }
  assert.equal(await evaluate(`document.querySelector('#search').value='elf'; document.querySelector('#search').dispatchEvent(new Event('input')); [...document.querySelectorAll('.card')].every(card=>card.textContent.toLowerCase().includes('elf'))`), true);
  assert.equal(await evaluate(`document.querySelector('#search').value='no-such-creature'; document.querySelector('#search').dispatchEvent(new Event('input')); !document.querySelector('#empty').hidden && document.querySelectorAll('.card').length===0`), true);
  await navigate('monsters.html?monster=elf', '.bestiary');
  assert.equal(await evaluate('document.querySelector("h1").textContent'), 'Elf');
  assert.equal(await evaluate('document.querySelectorAll(".slot img").length'), 7);
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('.slot img')].map(image=>image.alt)`),
    ['Red Apple', 'Arrow', 'Studded Helmet', 'Leather Boots', 'Studded Armor', 'Longsword', 'Brass Shield']);
  assert.equal(await evaluate(`Promise.all([...document.querySelectorAll('.slot img')].map(img=>img.decode().then(()=>img.naturalWidth>0).catch(()=>false))).then(results=>results.every(Boolean))`), true);
  assert.equal(await evaluate(`!!document.querySelector('svg.sprite image[href="images/monsters/elf.gif"]')`), true);
  await page('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  await navigate('monsters.html?monster=amazon', '.bestiary');
  assert.equal(await evaluate('document.querySelector("h1").textContent'), 'Amazon');
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('dl dd')].map(field=>field.textContent)`), ['110','60','172','11','15']);
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('.loot-row h3')].map(heading=>heading.textContent)`), ['Common','Uncommon','Semi-Rare','Very Rare']);
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('.slot img')].map(image=>image.alt)`),
    ['Brown Bread','Gold Coin','Skull','Leather Armor','Dagger','Sabre','Torch','Studded Shield','Small Ruby','Crystal Necklace']);
  assert.equal(await evaluate(`Promise.all([...document.querySelectorAll('.slot img')].map(img=>img.decode().then(()=>img.naturalWidth>0).catch(()=>false))).then(results=>results.every(Boolean))`), true);
  assert.equal(await evaluate(`[...document.querySelectorAll('.element')].every(element=>element.lastElementChild.textContent==='No')`), true);
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  for (const [id, hp, exp, lootCount, earthResistance, fireResistance = 'No', energyResistance = 'No'] of [
    ['barbarian-dothraki','135','75',7,'No'],
    ['barbarian-guard','265','165',10,'Yes'],
    ['beholder','260','170',9,'Yes'],
    ['cave-rat','30','10',3,'No'],
    ['crypt-shambler','330','195',9,'Yes'],
    ['cyclops','260','150',10,'No'],
    ['demon-skeleton','400','240',9,'Yes','Yes'],
    ['dragon','1000','700',20,'Yes','Yes'],
    ['dwarf-soldier','135','70',10,'Yes'],
    ['elf-arcanist','220','175',18,'Yes','Yes','Yes'],
    ['elf-scout','160','75',12,'Yes'],
    ['frost-spider','20','12',1,'No'],
    ['frost-troll','55','23',8,'No']
  ]) {
    await navigate(`monsters.html?monster=${id}`, '.bestiary');
    assert.equal(await evaluate('document.querySelector("dl dd").textContent'), hp);
    assert.equal(await evaluate('document.querySelectorAll("dl dd")[1].textContent'), exp);
    assert.equal(await evaluate('document.querySelectorAll(".slot img").length'), lootCount);
    assert.equal(await evaluate(`[...document.querySelectorAll('.element')].find(element=>element.firstElementChild.textContent==='Earth').lastElementChild.textContent`), earthResistance);
    assert.equal(await evaluate(`[...document.querySelectorAll('.element')].find(element=>element.firstElementChild.textContent==='Fire').lastElementChild.textContent`), fireResistance);
    assert.equal(await evaluate(`[...document.querySelectorAll('.element')].find(element=>element.firstElementChild.textContent==='Energy').lastElementChild.textContent`), energyResistance);
    assert.equal(await evaluate(`Promise.all([...document.querySelectorAll('.slot img')].map(img=>img.decode().then(()=>img.naturalWidth>0).catch(()=>false))).then(results=>results.every(Boolean))`), true);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  }
  await navigate('items.html', '.card');
  const itemCount = await evaluate('document.querySelectorAll(".card").length');
  assert(itemCount >= 330);
  assert.equal(await evaluate(`document.querySelector('#category').value='foods'; document.querySelector('#category').dispatchEvent(new Event('change')); document.querySelectorAll('.card').length>0 && [...document.querySelectorAll('.card')].some(card=>card.textContent.includes('Red Apple'))`), true);
  await navigate('items.html?item=2674', '.panel');
  assert.equal(await evaluate('document.querySelector("h1").textContent'), 'Red Apple');
  await navigate('monsters/skeleton.html', '.bestiary');
  assert.equal(await evaluate('document.querySelector("h1").textContent'), 'Skeleton');
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('.slot img')].map(image=>image.alt)`),
    ['Gold Coin','Bone','Torch','Mace','Hatchet','Brass Shield','Viking Helmet','Sword']);
  assert.equal(await evaluate(`Promise.all([...document.querySelectorAll('.slot img')].map(img=>img.decode().then(()=>img.naturalWidth>0).catch(()=>false))).then(results=>results.every(Boolean))`), true);
  assert.equal(await evaluate(`[...document.querySelectorAll('image')].every(image=>!image.getAttribute('href').includes('https://'))`), true);
  await navigate('items/bone.html', '.panel');
  assert.equal(await evaluate('document.querySelector("h1").textContent'), 'Bone');
  console.log(`Browser checks passed offline: ${monsterCount} monsters, ${itemCount} items, search, categories, loot icons, detail links and mobile layout.`);
  await call('Browser.close');
} finally {
  socket?.close();
  if (browser.exitCode === null) browser.kill();
  await new Promise(resolve => setTimeout(resolve, 1000));
  assert.equal(path.dirname(path.resolve(profile)), path.resolve(tmpdir()));
  assert(path.basename(profile).startsWith('miracle74-browser-'));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
