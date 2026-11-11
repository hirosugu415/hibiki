# REPORT v24  (mode: repair)
## やったこと
1. 作業開始時の確認: 完了。`git status` は `comms/STATE.json` のみ変更（ハーネス側）。`npm run build` 成功（12 modules, 59ms）。`app/src/` に `glimmer.js` は無い（audio/echo/ghost/letter/main/moods/style.css/wave-2d/wave-gl のみ）。
2. `app/shots.json` を 5 枚に削減: 完了。`home`・`touched`・`echo`・`mood-night`・`hold` のみ。`waitFor` 不使用、全 URL に `?demo=1`、name は一意。各画面の wait 合計は 2000 / 1120 / 2200 / 1200 / 2400 ms（全て 3 秒以下）、全体 8920 ms（10 秒以下）。JSON.parse 通過。
3. probe 確認: 完了。`/?demo=1` を desktop・mobile で 5 秒開き、consoleErrors は空。変更は不要だったため app/src は触っていない。

## ORDER からの逸脱
なし。（`echo` と `hold` は wait 合計を 3 秒以下・全体 10 秒以下に収めるため、待機時間を元より短くした。）

## 動作確認
- build 成功。
- probe（desktop / mobile, 5 秒）: 非ブランク、`render=webgl2`、`audio=running`、コンソールエラー無し。
- 5 枚それぞれの撮影そのものは probe で通していない（shots.json の JSON 妥当性と wait 合計のみ確認）。

## デモモード
変更なし。`?demo=1` で幽霊の指が自動演奏。カメラ・マイク不要。

## 既知の問題・妥協点
- 前回までの失敗は `chromium.launch` 時点の起動失敗で、shots.json の中身には到達していない。今回の削減で直る保証はない。原因はハーネス・環境側とみなし、app には探しに行っていない。
- `echo` の待機を短縮したため、残響が見える量は以前より少ない可能性がある。

## 変更した主なファイル
- `app/shots.json`（9 枚 → 5 枚）
- `comms/reports/REPORTv24.md`

## 司令塔への申し送り
撮影が healthy になれば、夜光虫の再発行に進める。起動失敗が続く場合は環境（残留 Chromium プロセス・メモリ等）の確認をハーネス側で。
