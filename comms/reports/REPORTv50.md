# REPORT v50  (mode: repair)
## やったこと
1. shots.json 確認 — 完了。**shots.json は1画面（touched, `/?demo=1`）・有効な JSON**（読んで確認し、JSON.parse も通った）。
2. `npm run build` を1回実行 — 完了。**成功**（vite 8.3.8, 12 modules, 53ms）。
   出力: index.html 4.50 kB (gzip 1.54) / index-BnVeUhm-.css 7.27 kB (gzip 2.28) / index-BO091Ubw.js 39.23 kB (gzip 16.18)。
3. app/ 無変更 — 完了。`git diff --stat -- app` は空。

## ORDER からの逸脱
なし

## 動作確認
- ビルド成功のみ確認。ORDER に従い chromium / playwright / probe / dev サーバーは起動していない（残留プロセスなし）。

## デモモード
変更なし（c47 と同一）。`?demo=1` で幽霊の指が演奏し、(190,400) のタップ後に波紋が出る想定。今回は実機確認していない。

## 既知の問題・妥協点
- c49 の healthy=false は撮影側の `browserType.launch` 失敗で、app 起因ではないと見ている。今回は再撮影していないため、実際に green に戻るかは未検証。

## 変更した主なファイル
- comms/reports/REPORTv50.md のみ（app/ は変更なし）

## 司令塔への申し送り
- 今回も撮影が失敗するなら、app ではなくハーネス/環境（ブラウザ起動、残留プロセス、リソース）側を疑うべき。
