import "./styles.css";
import { ArcheryGame, GAME_MODES } from "./game.js";
import { AudioManager } from "./audio.js";
import { speakLine, setVoiceEnabled } from "./voice.js";
import { hasSavedGame, loadSettings, saveSettings } from "./storage.js";

const ui = {
  canvas: document.querySelector("#gameCanvas"),
  cameraButton: document.querySelector("#cameraButton"),
  totalScore: document.querySelector("#totalScore"),
  bullseyeCount: document.querySelector("#bullseyeCount"),
  modeCode: document.querySelector("#modeCode"),
  endLabel: document.querySelector("#endLabel"),
  arrowLabel: document.querySelector("#arrowLabel"),
  lastRingLabel: document.querySelector("#lastRingLabel"),
  phaseLabel: document.querySelector("#phaseLabel"),
  statusMessage: document.querySelector("#statusMessage"),
  modeLabel: document.querySelector("#modeLabel"),
  difficultyLabel: document.querySelector("#difficultyLabel"),
  distanceLabel: document.querySelector("#distanceLabel"),
  windLabel: document.querySelector("#windLabel"),
  endScoreLabel: document.querySelector("#endScoreLabel"),
  audioStatus: document.querySelector("#audioStatus"),
  saveStatus: document.querySelector("#saveStatus"),
  installButton: document.querySelector("#installButton"),
  installHint: document.querySelector("#installHint"),
  saveButton: document.querySelector("#saveButton"),
  loadButton: document.querySelector("#loadButton"),
  menuButton: document.querySelector("#menuButton"),
  audioButton: document.querySelector("#audioButton"),
  pauseButton: document.querySelector("#pauseButton"),
  touchControls: document.querySelector("#touchControls"),
  drawMeterFill: document.querySelector("#drawMeterFill"),
  drawMeterText: document.querySelector("#drawMeterText"),
  steadyFill: document.querySelector("#steadyFill"),
  steadyValue: document.querySelector("#steadyValue"),
  strikePanel: document.querySelector("#strikePanel"),
  strikeCountLabel: document.querySelector("#strikeCountLabel"),
  strikeStopButton: document.querySelector("#strikeStopButton"),
  matchOverlay: document.querySelector("#matchOverlay"),
  overlayEyebrow: document.querySelector("#overlayEyebrow"),
  overlayTitle: document.querySelector("#overlayTitle"),
  overlayText: document.querySelector("#overlayText"),
  resumeButton: document.querySelector("#resumeButton"),
  overlayMenuButton: document.querySelector("#overlayMenuButton"),
  overlayLoadButton: document.querySelector("#overlayLoadButton"),
  homeScreen: document.querySelector("#homeScreen"),
  modeCardGrid: document.querySelector("#modeCardGrid"),
  modeDescription: document.querySelector("#modeDescription"),
  menuDifficultySelect: document.querySelector("#menuDifficultySelect"),
  audioSelect: document.querySelector("#audioSelect"),
  modeMetaTitle: document.querySelector("#modeMetaTitle"),
  modeMetaGoal: document.querySelector("#modeMetaGoal"),
  startMatchButton: document.querySelector("#startMatchButton"),
  commentaryBar: document.querySelector("#commentaryBar"),
  continueSavedButton: document.querySelector("#continueSavedButton"),
};

const settings = loadSettings();
const audio = new AudioManager();
audio.setEnabled(settings.audioEnabled !== false);

const game = new ArcheryGame({
  canvas: ui.canvas,
  touchRoot: ui.touchControls,
});
window.__joash3d = game; // dev hook:Playwright 凍結畫面/數值驗證用(比照 baseball3d)
window.__game = game; // /smoke3d 通用鉤子

let selectedModeId = game.modeId;
let selectedDifficulty = game.difficulty;
let audioEnabled = settings.audioEnabled !== false;

function persistSettings() {
  saveSettings({
    difficulty: selectedDifficulty,
    modeId: selectedModeId,
    audioEnabled,
  });
}

function setMeterFill(element, value) {
  element.style.transform = `scaleX(${Math.max(0, Math.min(1, value))})`;
}

function setAudioState(enabled) {
  audioEnabled = enabled;
  audio.setEnabled(enabled);
  setVoiceEnabled(enabled);
  ui.audioStatus.textContent = enabled ? "開啟" : "靜音";
  ui.audioButton.textContent = enabled ? "音效開啟" : "音效靜音";
  ui.audioSelect.value = enabled ? "on" : "off";
  persistSettings();
}

function syncMenuCards() {
  for (const button of ui.modeCardGrid.querySelectorAll(".mode-card")) {
    button.classList.toggle("selected", button.dataset.mode === selectedModeId);
  }

  const mode = GAME_MODES[selectedModeId];
  ui.modeDescription.textContent = mode.description;
  ui.modeMetaTitle.textContent = mode.label;
  ui.modeMetaGoal.textContent = mode.goal;
}

function syncMenuControls() {
  ui.menuDifficultySelect.value = selectedDifficulty;
  syncMenuCards();
}

function syncGameConfigurationToMenu() {
  selectedModeId = game.modeId;
  selectedDifficulty = game.difficulty;
  syncMenuControls();
}

function syncOverlay(overlay) {
  ui.matchOverlay.classList.toggle("visible", overlay.visible);
  ui.overlayEyebrow.textContent = overlay.eyebrow;
  ui.overlayTitle.textContent = overlay.title;
  ui.overlayText.textContent = overlay.text;
  ui.resumeButton.hidden = !overlay.canResume;
}

function openHomeScreen() {
  game.openHomeMenu();
  audio.stopCrowd(); // 回選單收掉觀眾環境音
  syncGameConfigurationToMenu();
  ui.homeScreen.classList.add("visible");
}

function closeHomeScreen() {
  ui.homeScreen.classList.remove("visible");
}

function unlockAudio() {
  audio.unlock();
}

// —— 中文播報:畫面字幕條+預烤 mp3 人聲同步唸(人聲鐵律:沒烤過的句子只出字幕) ——
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// spoken=實際唸出的固定句(對應 voicePhrases 預烤 mp3;含環數/分數的字幕只唸固定部分)
function pushCommentary(text, tone = "info", spoken = text) {
  const bar = ui.commentaryBar;
  if (!bar || !text) return;
  bar.hidden = false;
  bar.dataset.tone = tone;
  bar.textContent = text;
  // 重播動畫
  bar.style.animation = "none";
  void bar.offsetWidth;
  bar.style.animation = "";
  speakLine(spoken);
}

// 開幕/終幕經文(曉臻烤製;與 voicePhrases SCRIPTURES 同字)
const SCRIPTURE_ARROW =
  "列王紀下十三章十七節:這是耶和華的得勝箭,就是戰勝亞蘭人的箭;因為你必在亞弗攻打亞蘭人,直到滅盡他們。";
const SCRIPTURE_LESSON =
  "列王紀下十三章十九節:神人向他發怒,說:應當擊打五六次,就能攻打亞蘭人直到滅盡;現在只能打敗亞蘭人三次。";

function impactCommentary(event) {
  if (event.miss) {
    return pick([
      { sub: "偏出靶外——脫靶了,調整呼吸再來。", say: "脫靶了,調整呼吸再來。" },
      { sub: "這箭飄了……看看風旗,往反方向補償。", say: "可惜,偏了一點。" },
    ]);
  }
  if (event.isBull) {
    return pick([
      { sub: "正中軍旗紅心!十環!", say: "十環!正中軍旗紅心!" },
      { sub: "十環!好一箭,又穩又準!", say: "好一箭!這是得勝的箭!" },
    ]);
  }
  if (event.isGold) {
    return pick([
      { sub: `${event.ring} 環,命中金心區!`, say: "九環!命中金心!" },
      { sub: `${event.ring} 環!離紅心只差一點點!`, say: "漂亮的一箭!" },
    ]);
  }
  if (event.ring >= 7) {
    return { sub: `${event.ring} 環,穩穩命中!`, say: "好箭!穩穩命中!" };
  }
  return { sub: `${event.ring} 環,上靶了——再往中心修正。`, say: "上靶了,再往中心修正。" };
}

function handleGameEvent(event) {
  switch (event.type) {
    case "match-start": {
      audio.whistle();
      audio.vibrate(18);
      // 病房裡沒有觀眾(王下13)——不開體育場環境音
      if (game.modeId === "story") {
        pushCommentary("以利沙說:你用手拿弓,開朝東的窗戶——射箭吧!", "info", "以利沙說:你用手拿弓,開朝東的窗戶,射箭吧!");
      } else {
        pushCommentary(pick(["亞弗之戰開打!拉弓,瞄準,穩住呼吸!", "瞄準亞蘭軍旗——開戰!"]));
      }
      break;
    }
    case "draw-start":
      break;
    case "release":
      audio.swish();
      audio.vibrate(14);
      break;
    case "impact": {
      if (event.miss) {
        audio.thud(0.5);
      } else if (event.isGold) {
        audio.scoreSting();
        audio.horn();
        audio.vibrate([35, 25, 55]);
      } else {
        audio.rebound();
        audio.vibrate(22);
      }
      const line = impactCommentary(event);
      pushCommentary(line.sub, event.isGold ? "hot" : event.miss ? "cool" : "info", line.say);
      break;
    }
    case "story-arrow-hit": {
      // 得勝箭命中:曉臻唸整節經文(蓋過命中播報)
      pushCommentary("「這是耶和華的得勝箭……你必在亞弗攻打亞蘭人,直到滅盡他們。」(王下13:17)", "hot", SCRIPTURE_ARROW);
      break;
    }
    case "strike-begin": {
      audio.buzzer();
      pushCommentary("以利沙說:取幾枝箭來,打地吧!", "info", "以利沙說:取幾枝箭來,打地吧!");
      break;
    }
    case "strike": {
      audio.thud(0.8);
      audio.vibrate(30);
      break;
    }
    case "story-end": {
      if (event.win) {
        audio.horn();
        audio.vibrate([110, 50, 120]);
        pushCommentary(
          `擊打 ${event.count} 次,沒有止住——直到滅盡他們!完全的得勝!`,
          "hot",
          "打得好!完全的得勝,直到滅盡他們!",
        );
      } else {
        audio.thud(0.6);
        pushCommentary(
          `打了 ${event.count} 次便止住了……「應當擊打五六次!」(王下13:19)`,
          "cool",
          SCRIPTURE_LESSON,
        );
      }
      ui.saveStatus.textContent = hasSavedGame() ? "已有存檔" : "尚未存檔";
      break;
    }
    case "end-complete": {
      audio.buzzer();
      pushCommentary(`第 ${event.endNumber} 回合結束,本回合 ${event.endScore} 分!`, "info", "本回合結束!");
      break;
    }
    case "match-end": {
      audio.horn();
      audio.vibrate([110, 50, 120]);
      pushCommentary(
        `亞弗之戰結束!總分 ${event.total},評等 ${event.grade}!`,
        "hot",
        "戰役結束!",
      );
      ui.saveStatus.textContent = hasSavedGame() ? "已有存檔" : "尚未存檔";
      break;
    }
    default:
      break;
  }
}

game.onEvent = handleGameEvent;

game.onHudUpdate = (state) => {
  ui.totalScore.textContent = String(state.totalScore);
  ui.bullseyeCount.textContent = String(state.bullseyeCount);
  // 頂欄模式卡窄,放兩字短碼;完整名稱在側欄 modeLabel
  ui.modeCode.textContent = ({ 得勝的箭: "故事", 亞弗之戰: "亞弗", 王的練弓場: "練習" })[state.modeLabel] || state.modeLabel;
  ui.endLabel.textContent = `${state.endNumber}/${state.endCount}`;
  ui.arrowLabel.textContent = `第 ${Math.min(state.arrowInEnd + 1, state.arrowsPerEnd)}/${state.arrowsPerEnd} 箭`;
  ui.lastRingLabel.textContent =
    state.lastRing === null ? "—" : state.lastRing === 0 ? "脫靶" : `${state.lastRing} 環`;
  ui.phaseLabel.textContent = state.phaseLabel;
  ui.statusMessage.textContent = state.message;
  ui.modeLabel.textContent = state.modeLabel;
  ui.difficultyLabel.textContent = state.difficultyLabel;
  ui.distanceLabel.textContent = state.distanceLabel;
  ui.windLabel.textContent = state.windText;
  ui.endScoreLabel.textContent = String(state.endScore);
  ui.drawMeterText.textContent =
    state.phaseLabel === "拉弓"
      ? state.drawPower >= 1
        ? "拉滿!放箭!"
        : `${Math.round(state.drawPower * 100)}%`
      : "按住拉弓";
  ui.steadyValue.textContent = `${Math.round(state.steadiness * 100)}%`;
  setMeterFill(ui.drawMeterFill, state.drawPower);
  { // 07-14 拍板:中下方大拉弓力道條
    const bp = document.getElementById("bigPower"), bf = document.getElementById("bigPowerFill");
    if (bp) {
      bp.hidden = state.phaseLabel !== "拉弓";
      bf.style.transform = `scaleX(${Math.min(1, state.drawPower)})`;
      bf.classList.toggle("full", state.drawPower >= 1);
    }
  }
  setMeterFill(ui.steadyFill, state.steadiness);
  // 打地面板(故事模式第二幕)
  ui.strikePanel.hidden = !state.striking;
  ui.strikeCountLabel.textContent = String(state.strikeCount);
  syncOverlay(state.overlay);
};

syncGameConfigurationToMenu();
setAudioState(audioEnabled);
ui.saveStatus.textContent = hasSavedGame() ? "已有存檔" : "尚未存檔";

ui.modeCardGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".mode-card");
  if (!button) {
    return;
  }

  unlockAudio();
  audio.uiTap();
  selectedModeId = button.dataset.mode;
  syncMenuCards();
  persistSettings();
});

ui.menuDifficultySelect.addEventListener("change", (event) => {
  selectedDifficulty = event.target.value;
  persistSettings();
});

ui.audioSelect.addEventListener("change", (event) => {
  unlockAudio();
  audio.uiTap();
  setAudioState(event.target.value === "on");
});

ui.startMatchButton.addEventListener("click", () => {
  unlockAudio();
  audio.uiTap();
  game.applyPresentation({
    difficulty: selectedDifficulty,
    modeId: selectedModeId,
  });
  game.startSelectedMatch();
  closeHomeScreen();
  ui.saveStatus.textContent = "開始新比賽";
});

function loadIntoUi() {
  const loaded = game.loadGame();
  if (loaded) {
    syncGameConfigurationToMenu();
    closeHomeScreen();
  }
  ui.saveStatus.textContent = loaded ? "已讀取存檔" : "沒有可讀取的存檔";
}

ui.continueSavedButton.addEventListener("click", () => {
  unlockAudio();
  audio.uiTap();
  loadIntoUi();
});

ui.loadButton.addEventListener("click", loadIntoUi);
ui.overlayLoadButton.addEventListener("click", loadIntoUi);

ui.menuButton.addEventListener("click", () => {
  unlockAudio();
  audio.uiTap();
  openHomeScreen();
});

ui.overlayMenuButton.addEventListener("click", () => {
  unlockAudio();
  audio.uiTap();
  openHomeScreen();
});

ui.cameraButton.addEventListener("click", () => {
  game.cycleCameraView();
});

ui.saveButton.addEventListener("click", () => {
  unlockAudio();
  audio.uiTap();
  game.saveGame();
  ui.saveStatus.textContent = "已手動存檔";
});

ui.audioButton.addEventListener("click", () => {
  unlockAudio();
  audio.uiTap();
  setAudioState(!audioEnabled);
});

ui.pauseButton.addEventListener("click", () => {
  unlockAudio();
  audio.uiTap();
  game.togglePause();
});

ui.strikeStopButton.addEventListener("click", () => {
  unlockAudio();
  audio.uiTap();
  game.stopStriking();
});

ui.resumeButton.addEventListener("click", () => {
  unlockAudio();
  audio.uiTap();
  game.resume();
});

window.addEventListener("pointerdown", unlockAudio, { passive: true });
window.addEventListener("keydown", unlockAudio, { passive: true });

let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  ui.installButton.hidden = false;
  ui.installHint.textContent = "已偵測到可安裝版本，點一下就能加入主畫面。";
});

ui.installButton.addEventListener("click", async () => {
  unlockAudio();
  audio.uiTap();
  if (!deferredInstallPrompt) {
    ui.installHint.textContent = "如果是 iPhone，請用分享選單的「加入主畫面」。";
    return;
  }

  deferredInstallPrompt.prompt();
  const outcome = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  ui.installButton.hidden = true;
  ui.installHint.textContent =
    outcome.outcome === "accepted" ? "安裝要求已送出。" : "你可以之後再安裝。";
});

window.addEventListener("appinstalled", () => {
  ui.installButton.hidden = true;
  ui.installHint.textContent = "已安裝到裝置。";
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    game.saveGame(true);
  }
});

// dev(localhost)不註冊 SW——SW 快取會讓每次改動都吃到「上一版」,害測試誤判(07-11 踩雷)
if ("serviceWorker" in navigator && !["localhost", "127.0.0.1"].includes(location.hostname)) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      ui.installHint.textContent = "Service Worker 註冊失敗，但仍可直接遊玩。";
    });
  });
}

game.start();
