// joash-arrows 故事模式端到端驗證:得勝箭命中 → 打地 ≥5=完全得勝 / <5=止住結局 + 亞弗之戰計分
// 用法:node verify-joash.mjs <url> <outDir>
import { chromium } from "playwright";

const [url, outDir] = process.argv.slice(2);
const EXE = process.env.CHROME_EXE ||
  "C:/Users/agape250/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe";
const errors = [];
const results = {};
const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console.error: " + m.text()); });

await page.goto(url, { waitUntil: "load", timeout: 25000 });
await page.bringToFront();
await page.waitForTimeout(1200);

const G = "__joash3d";
const waitPhase = async (phase, timeout = 8000) => {
  await page.waitForFunction(([g, p]) => window[g] && window[g].phase === p, [G, phase], { timeout });
};

// —— 故事模式:射中得勝箭 ——
await page.evaluate((g) => {
  const game = window[g];
  game.applyPresentation({ difficulty: "kids", modeId: "story" });
  document.querySelector("#startMatchButton").click();
}, G);
await waitPhase("ready");
results.storyStart = await page.evaluate((g) => window[g].mode.label, G);
await page.waitForTimeout(1400); // 讓鏡頭 lerp 到定位
await page.screenshot({ path: outDir + "/story-aiming.png" }); // 過肩瞄準視角(房內看窗外軍旗靶)
// 拉滿放箭(kids 難度 aimAssist 0.68,瞄準中心必中)
await page.evaluate((g) => { const game = window[g]; game.beginDraw(); game.drawT = 99; game.releaseDraw(); }, G);
await waitPhase("scored");
results.arrowRing = await page.evaluate((g) => window[g].lastRing, G);
await page.screenshot({ path: outDir + "/story-arrow-scored.png" });

// —— 進打地幕,打 6 次 → 完全得勝 ——
await page.evaluate((g) => window[g].advanceAfterScore(), G);
await waitPhase("striking");
await page.waitForTimeout(400);
await page.screenshot({ path: outDir + "/story-strike-pose.png" });
for (let i = 0; i < 6; i += 1) {
  await page.evaluate((g) => window[g].doStrike(), G);
  await page.waitForTimeout(420); // 過 strikeAnimT 0.18 防抖門檻
}
results.strikeCount6 = await page.evaluate((g) => window[g].strikeCount, G);
await page.evaluate((g) => window[g].stopStriking(), G);
await page.waitForTimeout(300);
results.winOverlay = await page.evaluate((g) => ({ ...window[g].overlay }), G);
await page.screenshot({ path: outDir + "/story-ending-win.png" });

// —— 再來一輪:打 3 次就住手 → 止住結局(王下13:19) ——
await page.evaluate(() => document.querySelector("#overlayMenuButton").click());
await page.waitForTimeout(400);
await page.evaluate((g) => { document.querySelector("#startMatchButton").click(); }, G);
await waitPhase("ready");
await page.evaluate((g) => { const game = window[g]; game.beginDraw(); game.drawT = 99; game.releaseDraw(); }, G);
await waitPhase("scored");
await page.evaluate((g) => window[g].advanceAfterScore(), G);
await waitPhase("striking");
for (let i = 0; i < 3; i += 1) {
  await page.evaluate((g) => window[g].doStrike(), G);
  await page.waitForTimeout(420);
}
await page.evaluate((g) => window[g].stopStriking(), G);
await page.waitForTimeout(300);
results.lessonOverlay = await page.evaluate((g) => ({ ...window[g].overlay }), G);
await page.screenshot({ path: outDir + "/story-ending-lesson.png" });

// —— 亞弗之戰:1 箭計分照舊 ——
await page.evaluate(() => document.querySelector("#overlayMenuButton").click());
await page.waitForTimeout(400);
// 走真 UI 點模式卡(直接 applyPresentation 會被開始鈕用選單狀態蓋回去)
await page.click('.mode-card[data-mode="aphek"]');
await page.click("#startMatchButton");
await waitPhase("ready");
await page.evaluate((g) => { const game = window[g]; game.beginDraw(); game.drawT = 99; game.releaseDraw(); }, G);
await waitPhase("scored");
results.aphek = await page.evaluate((g) => ({ ring: window[g].lastRing, total: window[g].totalScore, mode: window[g].mode.label }), G);
await page.screenshot({ path: outDir + "/aphek-scored.png" });

// —— 選單/病房全景截圖(目檢以利沙+窗) ——
await page.evaluate((g) => { window[g].openHomeMenu(); }, G);
await page.waitForTimeout(300);
await page.evaluate((g) => {
  const game = window[g];
  // 手動把相機拉到側上方看病房(以利沙床+窗+王)
  const realRender = game.renderer.render.bind(game.renderer);
  game.renderer.render = () => {};
  game.camera.position.set(4.6, 3.4, -3.6);
  game.camera.lookAt(-0.8, 1.0, 0.6);
  realRender(game.scene, game.camera);
}, G);
await page.screenshot({ path: outDir + "/room-overview.png" });

console.log(JSON.stringify({ results, errors }, null, 2));
await browser.close();
