# REPORT v37  (mode: normal)
## やったこと
1. 完了: 砂の輝度の基準を石までの距離 halo に変更（wave-gl.js）。波頭 lit（石に届いてから開く）× halo。全面覚醒・手紙再生でも砂は halo が上限。
2. 完了: halo 外に薄い残り（寝 0.035／波エネルギー時 0.05 相当）。最初 0.07/0.12 にしたら遠景の線が石周りと同格に見えたため下げた。
3. 完了: 外径 max(3.2R, 短辺28%)。mobile は 3.2R=141px。石が端でも距離計算なので片側が切れない（pushed shot で確認）。
4. 完了: dataset.sandHalo="1,半径比"（desktop 4.00 / mobile 3.20）。shots.json に sandfield-push を追加（石を押した後の静止画、stone が 0.5,0.6 → 約 0.3,0.4 へ）。
## ORDER からの逸脱
半径比は desktop で 4.0（28%ルールが 3.2R を超えるため。仕様どおり）。halo 内を ×1.9 に濃くした（局在させると弱く見えたため）。
## 動作確認
build 成功。probe で letter-play 相当（desktop/mobile）と石を押した後を確認、consoleErrors 0。desktop は砂線が石の周り約200px に集まり、遠景は気配のみ。
## デモモード
?demo=1 の幽霊の指だけで確認。
## 既知の問題・妥協点
mobile は砂が小さく淡め。halo 内の節線の結び目（hub）が石と近いと目立つ。石が 1 個固定なので「石の数」は常に 1。drift 系は未再撮影（ロジックは同じ）。
## 変更した主なファイル
app/src/wave-gl.js, app/src/main.js, app/shots.json, app/NOTES.md
## 司令塔への申し送り
残す退路: 外の残りを上げたければ wave-gl.js の min(0.035,..) と mix(0.05,..) を調整。
