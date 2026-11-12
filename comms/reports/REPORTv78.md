# REPORT v78  (mode: normal)
## やったこと
1. desktop の縞: 完了。原因は demo の泉座標が初期化時 viewW=1 で計算され、間隔が短辺の34%(desktop実測 画面幅の34%≒54%S)と広すぎたこと。発火時に計算し間隔を0.27Sに。2番目の泉(held)は1.5sで立ち上がり、古い泉の現在の強さに合わせる(adopt後も同値)。probe desktop で2泉の間に節線(非同心円)が見える（shots/cycle-078/probe/d-b.png 相当、撮影の springs-two）。
2. 中心ジャギー: 完了。駆動 splat 半径 0.016→0.026。前は泉中心に暗いドット輪、後は滑らかな柔らかい中心（拡大でピクセル欠け無し、目視）。
3. 配置/mobile: 完了。desktop の泉は y=0.38 で石(y≈0.62)から約196px(≥15%S=120px)。mobile は LAM 0.085→0.102(+20%)、AMP 0.4→0.34。mobile の泉位置は元々正しく、見た目は落ち着いた。
## ORDER からの逸脱
なし（間隔は 0.27S）。
## 動作確認
npm run build 成功。probe desktop/mobile `/?demo=1&seed=1&hour=13&sprdemo=1` でコンソールエラー0、dataset.springs="2,0.416,0.380,0.584,0.380"(desktop)。`?springs=0` のコードは未変更。
## デモモード
sprdemo=1 / seed デモのまま。入力不要。
## 既知の問題・妥協点
- desktop の右側に縞が横に伸びる非対称が少し残る（A の古い泉が弱まるため）。石近くの縞は薄い。
- 実機の連続操作での振幅の連続性は probe 1枚のみ確認。
## 変更した主なファイル
app/src/main.js, app/NOTES.md
## 司令塔への申し送り
デモ座標の viewW=1 問題は他のデモフック(?bowl=demo 等)にも潜む可能性あり。
