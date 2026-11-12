# REPORT v73  (mode: normal)
## やったこと
1. 星形の模様 `?bowl=demo`: 完了。起動1.5sに(0.5,0.4)で発火。半径0.14S の輪上24点を cos(nθ)・同一周波数(kR≈7)で駆動。desktop/mobile とも花びら状の対称模様（n=5 → 10 ローブの花）が出た。最初の setTimeout 駆動版は headless(sim が実時間の1/3)で波長が崩れ「扇」状になったため、tick の dt（sim 時間）駆動に変更して解決。
2. 音: 完了。6回(450ms)の再発音、vel 0.3→0.1。dataset.bowl="n,x,y,持続ms"（未発火"0"、?bowl=0 は"off"、終了で ms=0）。
3. こすり検出: 完了。反転4回/1s・bbox≤0.24S・クールダウンは発火中(3s)。probe で 直線ドラッグ・円(gather のみ)・遅い往復(600ms)=不発、速い往復=n=5、やや遅い(200ms)=n=3 を確認。
4. デモ: 完了。ghost.js rub() を loopAct に追加、seed=1 で約17sに発火（20s 時点 dataset.bowl="5,0.500,0.400,3000"）。
5. shots.json に bowl-on / bowl-off（wait 3200）追加、NOTES 追記: 完了。
## ORDER からの逸脱
なし（guard() 不変）。
## 動作確認
build 成功、コンソールエラー 0（desktop/mobile）。bowl=demo の画面を desktop/mobile で目視。
## デモモード
カメラ不要。?demo=1 は約17sに自動でこする→花が立つ。
## 既知の問題・妥協点
- desktop は石が中心下に重なる（星は石の上方）。n=5 は cos(5θ) の符号反転で10ローブに見える（花としては成立）。
- 実機検証は PointerEvent 合成のみ。実指/マウスの細かい揺れでの誤検出は未検証。f は画面幅で決まる固定式。
- ?bowl=0 の画像は未目視（dataset=off のみ確認）。
## 変更した主なファイル
app/src/main.js, app/src/ghost.js, app/shots.json, app/NOTES.md
## 司令塔への申し送り
bowl-on で花が見えれば天井は破れるはず。次は n の見た目調整（ローブ数が n の2倍に見える点）か、石との重なり回避。
