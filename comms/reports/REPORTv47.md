# REPORT v47  (mode: normal)
## やったこと
1. shots.json を1画面に絞る: 完了。`app/shots.json` は `touched` のみ（url `/?demo=1`、wait 600 → clickAt [190,400] → wait 100）。`home` と `hold` を削除。JSON をパースして screens=1 を確認。
2. 下部ガラスバーのヒット領域確認: 完了。CSS を読んだ結果、すべて 44×44px 以上だったため **CSS は変更していない**。
   - 凪/夜/暁 (`#bar button.mood`): width 76px × height 48px
   - 音量 (`#mute`): min-width 48px × height 48px（width は内容次第で 48px 以上）
   - スマホ幅向けの @media による縮小は無い。バー全体の幅はおよそ 305px で 390px 幅に収まる（計算上の見積もり。実機では未確認）。
3. `npm run build` を1回実行: 成功（12 modules、index-BO091Ubw.js 39.23 kB）。

## ORDER からの逸脱
なし

## 動作確認
- ビルド成功。shots.json の JSON 妥当性を node で確認。
- ORDER の指示どおり chromium / playwright / probe / dev サーバーは起動していない。そのため画面の目視確認とコンソールエラー確認は行っていない（app/src は未変更なので見た目は従前と同一のはず）。

## デモモード
変更なし。`?demo=1` で幽霊の指が演奏し、touched で (190,400) のタップ後の波紋が見える想定。

## 既知の問題・妥協点
- 撮影が実際に成功するかは、ハーネス側の再撮影の結果待ち。
- バー幅 305px は CSS からの手計算で、実測ではない。

## 変更した主なファイル
- `app/shots.json`（3画面 → 1画面）

## 司令塔への申し送り
- app/ 配下の変更は shots.json のみ。ヒット領域は既に基準を満たしていたため CSS は触っていない。
- 撮影が green になったら、ORDER の規則どおり2サイクル連続 green を確認してから画面を増やすのがよい。
