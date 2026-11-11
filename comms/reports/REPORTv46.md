# REPORT v46  (mode: repair)
## やったこと
- 項目1: 完了。`app/shots.json` の screens を `touched` 1件のみにした（`/?demo=1`、wait 600 → clickAt [190,400] → wait 100。定義は従来のまま）。`home` と `hold` を削除。JSON は有効（screens.length = 1 を確認）。
- 項目2: 完了。`app/src`・index.html・CSS/JS は未変更（`git diff --stat -- app` は shots.json のみ）。`npm run build` を1回実行し成功、error なし。
- 項目3: この REPORT。

## ORDER からの逸脱
なし

## 動作確認
- `npm run build` のみ（12 modules, built in 65ms）。ブラウザ・probe・dev サーバーは起動していない（ORDER 通り）。

## デモモード
変更なし。

## 既知の問題・妥協点
- 撮影が healthy になるかは次の公式撮影まで未確認。

## 変更した主なファイル
- app/shots.json
- comms/reports/REPORTv46.md

## 司令塔への申し送り
- healthy=true になったら shots.json を home / touched に戻す検討を。
