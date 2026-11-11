# ORDER v32  (mode: repair)
## 目的
c31 の公式撮影が `browserType.launch: Target page, context or browser has been closed` で失敗した（画像ゼロ、healthy=false）。app 自体は無変更・probe で健全なので、撮影が確実に通る状態にして健全性を取り戻す。

## やること（優先順）
1. **健全性の再確認（app/ は原則無変更）**。`cd app && npm run build` → `node harness/tools/probe.mjs` を desktop / mobile で **1 本ずつ順に**実行（並列にしない）。`?demo=1` で ok=true・blank=false・consoleErrors=[]。
   - 受け入れ条件: build 成功、両ビューポートでコンソールエラー 0、画面が白くない。
2. **撮影の負荷を下げる（`app/shots.json` のみ）**。現状 4 画面のうち `echo`（`touched` とほぼ同じ絵）を `recall` に置き換える（画面数は 4 のまま、増やさない）。
   - `recall`: `url: "/?demo=1&recall=1"`, steps `[{"wait": 3800}]`。各画面の wait 合計は 4 秒以下。
   - `touched` のクリック位置は `[420, 360]` 付近（390×844 でも画面内）。
   - 受け入れ条件: probe で `recall` 相当を実行して `recallGen ≥ 1`、blank=false、コンソールエラー 0。**これが 1 度でも失敗したら `shots.json` を元に戻し、app/ は無変更で終える**（何も変えないのが最善の修復）。
3. **後始末**。自分が起動した vite / chromium / node は全て終了してから終える。他人が起動した古い dev サーバ（PID 26576 など）は触らない（プロジェクト外・管轄外）。

## やらないこと
- 新機能・UI の追加・「響」の CSS 変更・シェーダー（`wave-gl.js`）・追想の仕様変更・ライブラリ追加。ORDER v31 の「響」の階層改善は次の normal に送る。
- `harness/`・`comms/STATE.json`・`comms/LOG.md`・`comms/VISION.md`・ルートの package 系・`.gitignore` の編集。
- 撮影を並列起動すること、probe を同時に複数走らせること。

## 見た目・UX の要求
- 変更しない（c30 と同一の見た目を保つ）。デスクトップ 1280×800 とスマホ 390×844 の両方で白画面・崩れが無いことだけ確認する。

## デモモード
- `?demo=1`（通常）と `?demo=1&recall=1`（追想評価）。カメラ・マイク不要。

## 作業役への注意
- 撮影起動の失敗で自動 rollback されると成果を失う。変更は `shots.json` の 1 ファイルに限定し、probe で確認できなければ戻す。
- REPORT には build 結果、probe の dataset 値、**生成された画像を実際に開いて見て確認した事実**を書く（数値だけで済ませない）。コミットに Claude を貢献者として入れない。
