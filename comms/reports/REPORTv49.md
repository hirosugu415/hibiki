# REPORT v49  (mode: normal)
## やったこと
- 1 雨の核: 完了（一部逸脱あり→下）。`main.js` に雨ブロック追加。idle 40s 未満は rain=0（home・3秒体験は不変）、40〜90s は 0.35 上限の小雨、以降 1.0 へ。雨粒は輪(振幅 0.07〜0.14、通常打 0.5 の 1/3 以下)＋音 level 0.12(≤15%)、同時 6 個まで、石の半径×1.9 とバー/響/ヒント領域を避ける。ミュート中は audio 側で無音。
- 2 退く／雨あがり: 完了。tap 後 2s で rain 0.02（<0.2）、その後 weather=clearing→dry を probe で確認。輪の減衰の調整は未実施（dataset のみ。ORDER の「無理なら」に従う）。
- 3 dataset/shots: 完了。dataset.rain/weather、shots.json に rain-drizzle(0.3)/rain-heavy(1) を追加（desktop・mobile は自動）。既存 shots は変更なし。
## ORDER からの逸脱
- 雨粒は `tap(…,false)`+quietTap ではなく `ripple()`+`audio.play()` を直接呼ぶ。tap() は砂の目覚め・初音・石の応答・光を伴い、振幅も ≥0.3 で「1/3 以下」を満たせないため。残像・覚える水・砂・石には触れない。
## 動作確認
- build OK。`?demo=1&seed=1&rain=1` desktop: rain 1.00/rain、小さな輪が散り、糸・筋・白点なし。コンソールエラー 0。
- 触れる → 2s 後 0.02 clearing → 約 5s 後 dry。
- 非デモ `/?q=1` 放置 77s: 0.27 drizzle（自然な立ち上がり）。mobile rain=0.3: 0.30 drizzle、エラー 0。
## デモモード
- 通常 `?demo=1` は雨なし（回帰なし）。`&rain=x` で即時開始、触れるまで固定。幽霊の打は rain 指定時以外は「操作」扱い。
## 既知の問題・妥協点
- 小雨は輪が疎ら（2〜4s 間隔）で静止画では 0〜1 個しか見えないことがある。clearing 中の減衰緩和は未実装。長時間(150s 超)の本降りの見た目は未検証。
## 変更した主なファイル
- app/src/main.js, app/shots.json, app/NOTES.md
## 司令塔への申し送り
- 雨の質感は既存輪と同じで派手さは無い。強化は「雨の視覚強化」禁止のため触れていない。
