# REPORT v38  (mode: normal)
## やったこと
1. 石の輪郭マスク: 完了。既存の dpx(石縁からの外向き距離 CSS px)で砂の輝度に smoothstep(0,6,dpx) を掛け、石内部は0、外6pxで立ち上がる。uStoneC 由来なので押し移動にも追従。
2. 結び目抑制: 完了。最終輝度を soft-clamp(0.4*(1-exp(-br/0.4)), 上限0.34)、節の交点(star)減光を強化(desktop 0.15→0.3 / mobile 0.5→0.7)。線の太さ・縁質感は不変。
3. mobile halo 係数: 完了。halo 内 ×1.9 → mobile のみ ×1.9×1.3。desktop 不変。
4. sandHalo・shots.json 既存ステップは維持。NOTES に c38 追記。
## ORDER からの逸脱
なし
## 動作確認
npm run build 成功。probe で sandfield-push を desktop/mobile 撮影: 石の縁で線が消え石の上に線なし、石から離れた位置に光の塊なし、コンソールエラー0。letter-play / vessel-full は未撮影（同じ砂ブロックの変更）。
## デモモード
?demo=1 の幽霊の指で従来どおり動作。
## 既知の問題・妥協点
soft-clamp で全体の砂のピークがやや下がった。mobile の砂は半径外では依然淡い。mobile-letter-play の見えやすさは未確認。
## 変更した主なファイル
app/src/wave-gl.js, app/NOTES.md
## 司令塔への申し送り
砂が弱すぎるなら clamp の 0.4→0.5 か mask 幅 6→3px。
