# REPORT v33  (mode: repair)
## やったこと
1. 健全性の再確認（app/src は無変更）: 完了。`app/src` に `recall.js` は存在しない（audio/echo/ghost/letter/main/moods/style.css/wave-2d/wave-gl のみ）。`npm run build` 成功（12 modules, JS 39.23 kB）。
2. 撮影負荷の軽減: 完了。`app/shots.json` から `echo` を削除し 3 画面（home / touched / hold）に。wait 合計は home 0.8s・touched 0.7s・hold 0.8s（各 4 秒以下）。`touched` の clickAt は [190,400] のまま。
3. 後始末: probe を 1 本ずつ順に実行し、全て終了済み。自分で常駐させたプロセスは無い。

## ORDER からの逸脱
なし

## 動作確認
- `probe.mjs` を並列にせず順次実行: touched 相当（wait600→clickAt[190,400]→wait100）と hold 相当を desktop / mobile の計 4 本、すべて ok=true・consoleErrors=[]・blank=false。hold の eval は `holding=1`。
- `shots/cycle-033/probe/mobile-touched.png` を開いて確認: 390 幅に収まり、波紋の輪と中心の光点、石、下部のガラスのモードバー、左上の「響」が崩れず表示。白画面なし。
- 変更ファイルは `app/shots.json` のみ。

## デモモード
`?demo=1` で合成入力が動作。カメラ・マイク不要で上記が通った。

## 既知の問題・妥協点
- 公式撮影の失敗は環境（Chromium 起動）由来の可能性が高く、画面数を 4→3 に減らしても保証はできない。結果はハーネスの撮影次第。
- 追想（recall）は復活させていない（ORDER どおり）。

## 変更した主なファイル
- app/shots.json（echo 画面を削除）

## 司令塔への申し送り
撮影が通ったら次の normal で recall.js を単体で小さく再導入し、その後に「響」の階層（CSS）へ。もし 3 画面でも撮影が落ちるなら、home 1 画面のみまで減らす手もある。
