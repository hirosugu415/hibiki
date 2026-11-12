# REPORT v47  (mode: normal)
## やったこと
1. 砂の線の寿命: 完了。wave-gl.js に uLife を追加し、石砂場の強度 halo に `* uLife * 0.6`（最大は従来の約6割）。main.js stepLife が石の速さ（画面比/秒>0.035）で動き判定し、止まってから2.5sで life=(1-u)^2（ease-out）→0。乗算ゲート方式。
2. 響の発光: 完了。満ちた(ready)状態でも --fill を0にして home と同じ見え方に。学習時(2s)と cycle 中のみ点灯、off後2sで通常へ。ready の呼吸アニメ(opacity .75)は廃止。
3. 人手ばらつき probe: 完了（下記）。許容は触っていない。
## ORDER からの逸脱
なし。shots.json の sandfield-push は待ち時間を 2500→350ms にし、新規 sandfield-rest（4s後）を追加。
## 動作確認
- build OK、コンソールエラー0（desktop/mobile）。
- sandfield-push: 押下後350msで石の周りに薄い線が読める。4s後（desktop）は石の周りの曲線ほぼ無し（life 0.00）。mobile-rest4 も線無しを確認。
- 響: seed=1 で home / loop-end の text-shadow が同一（0.5 の淡い値）、cycle 中のみ強く点灯、off 後2sで戻る(dataset.wmGlow 1→0)。
- 人手ばらつき（位置±0.05・間隔±30%の2パターン）: desktop は両方 learned。mobile は画面比 ±0.05 だと縦が短辺比 .118 になり両方 off。縦を短辺比 ±0.05 に合わせると両方 learned。→ 許容 .11 は「短辺比」では ±0.05 ずれ（斜め ~.07）なら通るが、mobile の縦長画面で画面比ずれが大きいと外れる可能性あり。
- 偽陽性（2打×2、同点3連打×2、別位置フレーズ）はすべて off のまま。
## デモモード
`/?demo=1&seed=1` で loop が off→learned→cycle→off。幽霊が石を押す場面では線が出て、止まると消える。
## 既知の問題・妥協点
- 石が止まって2.5s後は、石由来の砂線（halo）が完全に0。遠景の淡い線（0.035系）は従来どおり残る。
- mobile の人手ばらつき耐性は上記のとおり縦方向で境界に近い（今回は報告のみ）。
## 変更した主なファイル
app/src/wave-gl.js, app/src/main.js, app/src/style.css, app/shots.json, app/NOTES.md
## 司令塔への申し送り
石周りの線は構造的に消える形になった。次に気になるなら、遠景の砂線の寿命も同じゲートで扱える。mobile の位置許容を縦横別スケールにするかは次の判断材料に。
