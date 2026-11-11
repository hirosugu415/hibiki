# REPORT v36  (mode: repair)
## やったこと
1. app/ を一切変更しない — **完了**。`git diff --stat -- app/` は空。
2. `npm run build` の成功確認 — **完了**。終了コード 0、`app/dist`（index.html と assets/）が生成された（JS 39.23 kB / CSS 7.56 kB、51ms）。
3. 常駐プロセスの現況（読み取り専用）— **完了**。`Get-CimInstance Win32_Process` で確認。何も終了・削除していない。
   - `harness/loop.mjs` を実行している node.exe: **3 本**
     - `loop.mjs builder` PID 8332（起動 2026/11/11 23:46:53）
     - `loop.mjs builder` PID 29712（起動 2026/11/12 00:02:47）
     - `loop.mjs commander` PID 27204（起動 2026/11/12 00:02:47）
   - 親の cmd.exe ラッパーは PID 26088（builder, 23:46:53）、27752（builder, 00:02:47）、32844（commander, 00:02:47）。
   - **`loop.mjs builder` は 2 本のまま**（人間への申し送り: 重複 builder を 1 本にすれば撮影の launch 衝突は解消する見込み）。
   - `playwright` / `headless_shell` / `chromium` を含むコマンドラインのプロセス: **0 本**。
   - 他に `msedgewebview2.exe`（`--type=crashpad-handler`）が 6 本ある。これは Edge WebView2 のクラッシュハンドラで、Playwright とは無関係（コマンドラインが `chromium` 等に一致したわけではなく、`playwright` 等のパターンにも該当しない別物）。
4. 今回 chromium / probe を起動したか — **起動していない**。probe は未実行、ブラウザも未起動。build のみ。

## ORDER からの逸脱
なし。

## 動作確認
- `git diff --stat -- app/` → 空。
- `cd app && npm run build` → 成功（exit 0）。
- プロセス確認は読み取りのみ。画面確認（probe）は ORDER どおり行っていない。app の健全性は c35 の司令塔 probe の結果に依拠する（私自身は今回確認していない）。

## デモモード
変更なし。`?demo=1` の挙動は c35 までと同じ（今回私は再確認していない）。

## 既知の問題・妥協点
- 撮影の launch 失敗の原因とみられる二重 builder は、私には止められない（`harness/` と他人のプロセスは対象外）。
- `app/shots.json` も触っていない。

## 変更した主なファイル
- `comms/reports/REPORTv36.md`（本ファイルのみ）。app/ は無変更。

## 司令塔への申し送り
- builder の重複常駐（PID 8332 と 29712）は c35 から変わらず継続中。c31〜c35 の launch 失敗が交互に出る点と整合する。人間の運用側で 1 本にする必要がある。
- 今回撮影が healthy=true で通れば、次は normal に戻して「追想の復活」（コミット `a2641c2` の `recall.js` 等）を再開できる。
- 今回の builder の実行中は chromium を一切起動していないため、撮影が失敗した場合 builder 側の起動は要因ではない。
