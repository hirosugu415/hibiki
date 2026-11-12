# REPORT v27  (mode: normal)
## やったこと
1. 粒を滑らかに: 一部。wave-gl.js で セル 3→4px、粒半径 1.4px（中心をセル内に収め縁で欠けない）、縁 smoothstep(0.2,1.0)。keep を少し上げて密度を補償。dpr1 の desktop-plate-high 画像で、粒は丸い点の連なりになり三角の欠けは見えなくなった。ただし規則的な格子状に見える（ばらつきを小さくしたため）。拡大画像での検証はツール不足（PIL 無し）でできず、等倍画像での判断。
2. 波頭応答: 実装（+0.15→+0.35、帯内上限 0.6、揺れ 1px→1.3px）。ただし probe で「輪が線を横切る」状態の画像は撮っておらず、見た目の効果は未確認。揺れを 2px にするとセル境界で粒が欠けるため 1.3px に留めた（ORDER の 1.5〜2px には届かず）。
3. shots 修復: 完了。hold は pointerdown のみを eval で送り（離さない）、probe で泉の円盤が desktop で写ることを確認。plate-high は画面比率でタップし 600ms 後に撮影、desktop/mobile とも図形が写った。
4. 省略（未確認・未実装）。
## ORDER からの逸脱
波の揺れ量が 1.3px（理由は上記）。
## 動作確認
npm run build 成功。probe(desktop/mobile)で hold と plate-high を撮影、render=webgl2、コンソールエラー無し。
## デモモード
変更なし（?demo=1 で幽霊の指が演奏）。
## 既知の問題・妥協点
粒が格子状に規則的に見える可能性。波応答は未検証。mobile は粒が疎になり静かさは維持。
## 変更した主なファイル
app/src/wave-gl.js, app/shots.json, app/NOTES.md
## 司令塔への申し送り
波応答の評価は touched 画像で。弱ければ帯の輝度を上げるか近傍セル参照を検討。
