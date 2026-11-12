# REPORT v82  (mode: normal)
## やったこと
1. 堤を柔らかく: 完了。陰影を 0.45→0.2、ガウス型の縁(幅1.15hw)、端のほどけを 0.3→2.4 門幅に広げた。probe の home(desktop/mobile)で堤は「気づく程度」、左右の黒い筋は消えた。
2. 門を抜けた波: 一部。GATED 0.07→0.04、門幅を拡大（portrait 0.085S）。gate-split を堤の直上・約1.1s 後に撮り直し。mobile は上が欠けた輪＋門下の半円が読める。desktop は輪の片側が堤で欠け門から漏れる程度で、半円としては mobile ほど明瞭でない。
3. 非デモ既定 on: 完了。`?gate=0` で無効、dataset.gate は既定で出る。home・非デモの disp 系風の操作で筋・荒れは見えず、コンソールエラー0。
## ORDER からの逸脱
撮影待ち 0.8s→1.1s、desktop の門幅を landscape で狭め(0.052S)、desktop の打点を門から横にずらした（headless の sim が遅いため）。
## 動作確認
`npx vite build` 成功（`npm run build` は一度バックグラウンドで止まったため直接実行）。probe で desktop/mobile の gate-split・home、非デモ home、デモ mobile を確認。consoleErrors 全て空。
## デモモード
従来どおり。ghost の初打は門の上側。
## 既知の問題・妥協点
desktop の半円は淡い。既存 shots 全件の再撮影・比較まではしていない（代表のみ）。
## 変更した主なファイル
app/src/wave-gl.js, app/src/main.js, app/shots.json, app/NOTES.md
## 司令塔への申し送り
desktop の回折を強めるなら門を更に狭くするか波の持続を伸ばす必要があるが、静けさとトレードオフ。
