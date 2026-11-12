# REPORT v75  (mode: normal)
## やったこと
1. 外側リング抑制: 完了。SIM シェーダに花専用の吸収帯 uBowl（1.3R→1.75R で立ち上がり 2.3R→3.0R で消える、なだらか）を追加。新しい縁線は作らず、花の外側の同心リングと石側への波が消えた（desktop-bowl-on で目視）。
2. mobile の濃さ: 完了。×0.72 補正を撤廃（振幅 0.95）。外側リングが消えたので泡化せず、6枚が分離して見える。
3. 余韻: 完了。shots.json に bowl-late（wait 3900、発火後約2.4s）を追加。駆動を終端 0.9s かけて減衰させ、花が薄く残って消える。リング残骸・泡・筋なしを desktop/mobile で目視。
4. bowl-on / bowl-off 維持、NOTES 更新: 完了。
## ORDER からの逸脱
- 撮影用の小変更: ?bowl=demo の間だけ幽霊の打を止めた（花以外の波紋が bowl-late に写り込んだため）。通常/他の撮影は不変。
## 動作確認
- npm run build 成功。probe（desktop/mobile）でコンソールエラー0。bowl-on / bowl-late を目視。desktop は花びら6枚を1枚ずつ数えて6。mobile も6枚を数えられた（desktop より丸く淡いが輪郭は背景から分離）。
## デモモード
- ?demo=1&seed=1&hour=13&bowl=demo で1.5s後に発火。カメラ・マイク不要。
## 既知の問題・妥協点
- mobile の花は desktop より輪郭がやや柔らかい。mobile は desktop より早く消える（4.3s でほぼ消滅）。
- 吸収帯は発火中のみ有効なので、その間に花の外側 1.3〜3R で打った波は弱まる（約4s）。
- 実指での誤検出は未検証（閾値は変更していない）。
## 変更した主なファイル
app/src/wave-gl.js, app/src/main.js, app/shots.json, app/NOTES.md
## 司令塔への申し送り
- bowl は十分仕上がった。次は別の面（初見導線など）へ。
