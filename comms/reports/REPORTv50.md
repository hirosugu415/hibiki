# REPORT v50  (mode: normal)
## やったこと
1. clearing の減衰緩和: 完了。main.js tick で clearK を滑らかに上下（上昇 tau0.8s / 下降 1.2s）、clearing 中だけ damping を最大 +0.0004（0.04%、0.5% 以内）。probe: タップ後 k=0.39→0.83(clearing)→dry 後 0.51→0.17 と段差なく戻る。rain 無しでは clearK=0 で従来の pal をそのまま渡す（通常 shots は c49 と同一）。
2. ムード別の雨: 完了（確認中心）。calm/night/dawn の desktop スクショで輪の質感・明るさは各ムードの既存輪と同質、背景は home と同系統。ずれを見つけられなかったので色・粒の調整は入れていない（迷ったら変更しない）。shots.json に rain-night / rain-dawn を追加（`rain=0.6`、ムード切替は eval の click()）。
3. 長時間安定: 完了。`rain=1` を 120s 放置: dataset.rain は 30 サンプル全て 1.00（min=max=1）、weather=rain、同時輪数の最大 2（上限 6）、コンソールエラー 0。
## ORDER からの逸脱
なし（デバッグ用に dataset.clearK / rainLive を追加）。
## 動作確認
npm run build 成功。probe（desktop）で上記数値とスクショ 3 枚（calm/night/dawn）を確認。mobile のムード雨スクショは自分では見ていない。
## デモモード
`?demo=1&seed=1&rain=0.6` 等は従来通り。無操作 40s 以降に自動で雨。
## 既知の問題・妥協点
- 減衰 +0.0004 は輪の寿命で約 15% の延び程度で、見た目の差は僅か。0.5% 上限ぎりぎりまで上げると不安定側に近づくので控えめにした。
- drizzle の輪の周囲の小点は、夜光虫（glimmer）の粒と判断し手を入れていない。
## 変更した主なファイル
app/src/main.js, app/shots.json, app/NOTES.md
## 司令塔への申し送り
雨は一通り完成。次は別方向（発想サイクル向き）でも良さそう。
