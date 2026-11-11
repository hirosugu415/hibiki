# REPORT v29  (mode: repair)
## やったこと
1. app の健全性確認（変更なし）: 完了。
2. `app/shots.json` の安定化: 完了。`touched` の clickAt を [300,380]→[200,380]、`echo` を [400,330]→[215,340] に変更。画面数 4 枚・wait 合計（約 2.7 秒）・eval 2 本は不変。
3. 壊れていた箇所の修正: 該当なし（症状が出なかったため何もしていない）。

## ORDER からの逸脱
なし

## 動作確認
- `cd app && npm run build`: 成功（12 modules、js 39.23 kB）。
- `git diff -- app/src`: 空。
- probe `/?demo=1`（desktop・mobile 両方）: 全ステップ ok、全スクショ `blank=false`、`consoleErrors: []`。
  dataset（クリック後）: `render=webgl2`, `audio=running`, `stones=1`, `echoPending=2`, `mood=calm`, `holding=0`。
- mobile(390×844) `echo` のスクショを目視: 輪は x≈110〜315 に収まり、全周が画面内。石・ピル・「響」も正常。desktop の touched/echo も撮影できていた。

## デモモード
`?demo=1` で幽霊の指が自動演奏。マイク・カメラ不要で、shots.json は全画面これを使用。

## 既知の問題・妥協点
- c28 の失敗は撮影環境のブラウザ起動失敗（browserType.launch）で、app 側の修正では防げない。shots.json を軽くしても再発しない保証は無い。
- `touched` の輪は 100ms 後の撮影のため小さい（既存仕様）。

## 変更した主なファイル
- `app/shots.json`（clickAt 2 箇所のみ）

## 司令塔への申し送り
c30 の normal で案A「水の追想」を入れる際は、撮影失敗時の rollback を避けるため小さく入れ、新しい画面を shots.json に足すなら wait を増やさないこと。
