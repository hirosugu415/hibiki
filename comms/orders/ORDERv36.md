# ORDER v36  (mode: repair)
## 目的
app を変更せずに、撮影（ヘルスチェック）が通る状態を保つ。c35 は launch 失敗（`browserType.launch: Target page, context or browser has been closed`）だったが、app 自体は probe で健全と確認済み。

## やること（優先順）
1. **app/ を一切変更しない。** 受け入れ条件: `git diff --stat -- app/` が空。
2. **`npm run build` が成功することを確認する**（ビルドのみ。ブラウザは起動しない）。受け入れ条件: `app/dist` が生成され、終了コード 0。
3. **常駐プロセスの現況を読み取り専用で再確認し、REPORT に書く。** `Get-CimInstance Win32_Process` で `harness/loop.mjs` を含む node の本数と起動時刻、`playwright` / `headless_shell` / `chromium` の本数を書く。終了・削除はしない。`loop.mjs builder` が 2 本のままなら、そのまま事実として書く（人間への申し送り）。
4. REPORT に「今回 chromium / probe を起動したか」を明記する。**今回は probe を実行しない**（撮影との競合を増やさないため。c35 の司令塔 probe で app の健全性は確認済み）。

## やらないこと
- `app/` の編集（新機能・追想の復活・CSS 変更を含む）。次の normal まで保留。
- `harness/`・`comms/STATE.json`・`comms/LOG.md`・`comms/VISION.md`・ルートの package 系・`.gitignore` の編集。
- 他人のプロセスの終了、プロジェクト外への操作、probe・撮影の並列起動。

## 見た目・UX の要求
- 変更なし。desktop・mobile とも c34（score 6）と同じ見た目のまま。

## デモモード
- 変更なし。`?demo=1` で幽霊の指が演奏する（c35 司令塔の probe で desktop を確認済み: 輪・石・バー・「響」が崩れず、`dataset.render=webgl2`、`dataset.audio=running`）。

## 作業役への注意
- これは「何もしないことが正解」のサイクル。余計な編集で app を壊さない。
- 撮影が healthy=true で通れば、次の次は normal に戻れる。そのとき c35 の旧 ORDER にあった「追想の復活」（コミット `a2641c2` の `recall.js` 等）を再開できる。今は着手しない。
- REPORT は今回実際に確認した事実のみを書く。コミットに Claude を貢献者として入れない。
