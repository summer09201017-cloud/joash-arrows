# CLAUDE.md — joash-arrows(約阿施的得勝箭,王下13:14-19)

> archery3d 引擎聖經換皮(2026-07-15,agape250 機)。GitHub 是唯一真相;帳號 summer09201017-cloud。

## 這是什麼

3D 射箭聖經關:以利沙病房+朝東的窗戶+窗外亞蘭軍旗靶。
故事模式兩幕:①射得勝箭(拉弓/晃動/風/拋物線/靶環)②拿箭打地——**不揭示該打幾次**
(經文核心:王打三次便止住;≥5 次=完全得勝、<5=止住結局+王下13:19 教學)。
另有亞弗之戰(6 回合計分)與練弓場(無限練習)。

## 檔案地圖

- `src/game.js` 引擎+換皮全部:GAME_MODES(story/aphek/practice)、_buildRoom(病房/窗/以利沙/油燈)、
  _buildCamp(亞蘭營帳/山丘)、buildTarget(軍旗靶)、beginStrike/doStrike/stopStriking(打地幕)、
  phase 多了 "striking"、_strikePose(跪姿鎖鏡頭)。
- `src/main.js` 播報接線(story-arrow-hit/strike-begin/strike/story-end)、打地面板(#strikePanel)。
- `src/voicePhrases.js` PHRASES=雲哲、SCRIPTURES=曉臻(王下13:17、13:19,cuv 已查驗)。
- `scripts/gen-voice.mjs` 分聲烤製(samson 範式)。

## 鐵則(沿承系列)

1. 判定=畫面;關節人物/長腿 v2(本引擎=活範例);人聲=預烤 mp3 絕不用 Web Speech。
2. 病房內沒觀眾(王下13 只有王與先知)——buildCrowd=空群組,射觀眾路徑永不觸發。
3. localStorage 鍵=joash-arrows-*;SW cache=joash-arrows-nf1;dev 不註冊 SW。
4. 溝通一律繁體中文;經文改動必先 cuv 查驗。

## 部署

- Netlify 手動站 hfpc-joash-arrows(deploy 必 `--site hfpc-joash-arrows --no-build --dir dist`)。
- 大廳 hfpc-bible-games 卡片、portfolio、gamefleet sites.json 同步(見系列 HANDOFF)。
