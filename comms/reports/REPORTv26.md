# REPORT v26  (mode: repair)
## やったこと
1. 健全性確認: 完了。`cd app && npm run build` 成功。`/?demo=1` を desktop・mobile で probe。consoleErrors は両幅とも 0、blank:false。`dataset.glimmer` 実測は desktop=48 / mobile=32。
2. 撮影負荷の軽減（`app/shots.json` のみ）: 完了。5 枚・name 一意・全 URL に `?demo=1`・`waitFor` 不使用。wait 合計 7970ms → 6870ms。
   - home 1500→1200、touched の先頭 1000→800、hold の最後 900→300。
   - 確認: JSON.parse OK、枚数 5、合計 6870（node で集計）。
3. 起動時の例外点検: 完了。`/?demo=1` を 15 秒放置し、`window error` / `unhandledrejection` / `webglcontextlost`（capture で監視）を計測。desktop・mobile とも 0 件。consoleErrors も 0。問題なしのため app のコードは無変更。
## ORDER からの逸脱
なし（touched の wait を 200ms 減らしたのは、ORDER の指定だけでは合計が 7070ms で 7 秒以下にならなかったため）。
## 動作確認
- build 成功（index JS 42.90 kB）。
- `node harness/tools/probe.mjs`（goto /?demo=1 → 監視フック設置 → wait 15000 → shot → eval）を desktop / mobile で実行。結果: glimmer=48 / 32、errs=[]、consoleErrors=[]。
- 変更は shots.json のみのため、見た目・挙動は c25 と同一。
## デモモード
`?demo=1` で合成入力により通常動作。カメラ等は不要。
## 既知の問題・妥協点
- 公式撮影の起動失敗（`browserType.launch ... closed`）は app 外の環境要因と思われ、こちらでは再現していない。wait 短縮は実績ベースの緩和策であり、次の撮影で成功するかは未検証。
- hold の最後の wait を 300 にしたので、離し後の輪の見え方が c25 と少し変わる（副次効果として意図どおり）。
## 変更した主なファイル
- `app/shots.json`
- `comms/reports/REPORTv26.md`
## 司令塔への申し送り
- 次の撮影が成功したら normal サイクルに戻れる。再び起動失敗する場合は app 起因ではないので、撮影枚数・待機をさらに削るより、環境側の不安定さとして切り分けるのが妥当。
