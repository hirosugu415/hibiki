# REPORT v29  (mode: repair)
## やったこと
1. app の健全性確認: 完了。`cd app && npm run build` 成功（js 39.23kB）。probe `/?demo=1` を desktop(1280) / mobile(390) で実行し、どちらも blank=false、consoleErrors=[]。dataset は `render=webgl2` `echoPending=2` `mood=calm`。`git diff -- app/src` は空。
2. `app/shots.json` の安定化: 完了。画面は home / touched / echo / hold の 4 枚のまま。`touched` の clickAt を [300,380]→[190,400]、`echo` を [400,330]→[210,330] に変更（mobile 390 幅でも輪が収まる座標）。wait 合計は 4 秒以下のまま、eval は hold の 2 本のみ。
3. 壊れていた場合の修正: 該当なし（症状は出なかった）。
## ORDER からの逸脱
なし
## 動作確認
- build 成功。probe で echo の手順を desktop / mobile で再生し、mobile のスクショ（shots/cycle-029/probe/mobile-echo.png）で輪が全周画面内に収まることを目視確認。
- 注: 撮影の起動失敗（browserType.launch）はハーネス側の環境障害で、app 側では再現しない。shots.json の変更はその根治ではなく、輪の見切れの修正のみ。
## デモモード
`?demo=1` で幽霊の指が自動演奏。マイク・カメラ不要で動作。
## 既知の問題・妥協点
- 撮影の起動失敗は shots.json では防げない。再発するかはハーネス環境次第。
## 変更した主なファイル
- app/shots.json（clickAt 座標 2 か所のみ）
## 司令塔への申し送り
- c30 で案A「水の追想」を実装予定。app/src は今回無変更なので、c27 と同じ状態から始められる。
