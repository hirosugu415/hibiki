# REPORT v36  (mode: repair)
## やったこと
1. app/ を一切変更しない — 完了。`git diff --stat -- app/` は空（作業開始時の変更は `comms/STATE.json` のみ＝ハーネス側）。
2. `npm run build` — 完了。`vite build` 成功、終了コード 0。`app/dist` 生成（index.html 4.50 kB / css 7.56 kB / js 39.23 kB、12 modules）。
3. 常駐プロセスの現況（読み取り専用・2026/11/12 05:03 時点、`Get-CimInstance Win32_Process`）— 完了。終了・削除はしていない。
   - `node harness/loop.mjs builder`: **node.exe 2 本** — PID 8332（11/11 23:46:53 起動、親 cmd 26088）と PID 29712（11/12 00:02:47 起動、親 cmd 27752）。**2 本のまま**。
   - `node harness/loop.mjs commander`: node.exe 1 本 — PID 27204（11/12 00:02:47 起動、親 cmd 32844）。
   - `playwright` / `headless_shell` / `chromium`: **0 本**（Playwright 由来の chromium は存在しない）。
   - 参考: `msedgewebview2.exe --type=crashpad-handler` が 6 本（11/06〜11/12 03:54 起動）。コマンドライン上は crashpad ハンドラで、本件の撮影とは無関係に見えるが、起源は未確認。
4. 今回 chromium / probe を起動したか — **起動していない**。probe も撮影も実行していない（ビルドのみ）。

## ORDER からの逸脱
なし

## 動作確認
- `cd app && npm run build` → 成功（上記）。
- プロセス一覧は読み取りのみ。app の見た目は未変更のため再撮影・probe はしていない（ORDER 指示どおり）。

## デモモード
変更なし。`?demo=1` の動作は c35 司令塔の probe 確認（render=webgl2、audio=running）に依拠しており、今回は自分では再確認していない。

## 既知の問題・妥協点
- **`loop.mjs builder` が 2 本同時に常駐している**（人間への申し送り）。c31〜c35 の launch 失敗が交互に出るパターンと整合するが、因果は状況証拠のみで、私は確定できていない。私はハーネス・他プロセスに触れない。
- 今ターン自体が二重 builder のどちらか片方であり、もう片方が同時に走っている可能性がある。

## 変更した主なファイル
なし（app/ 無変更。追加は本 REPORT のみ）。

## 司令塔への申し送り
- 人間が重複 builder（PID 8332 か 29712 のどちらか）を止めれば、撮影衝突が解消する可能性が高い。
- 撮影が healthy=true で通ったら、次の normal で「追想の復活」（`a2641c2` の `recall.js` 等）か、静止画の情報量改善に進める。
