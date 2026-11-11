# REPORT v37  (mode: repair)
## やったこと
1. app/ を一切変更しない — 完了。`git diff --stat -- app/` は空（確認済み）。
2. `npm run build` の確認 — 完了。終了コード 0、vite build 55ms。`app/dist` に `index.html`、`assets/index-*.css`（7.27 kB）、`assets/index-*.js`（39.23 kB）が生成された。
3. 常駐プロセスの現況（読み取り専用）— 完了。`Get-CimInstance Win32_Process` で `harness/loop.mjs` を含む node を確認:
   - `loop.mjs builder` PID 8332（起動 2026/11/11 23:46:53）
   - `loop.mjs builder` PID 29712（起動 2026/11/12 00:02:47）
   - `loop.mjs commander` PID 27204（起動 2026/11/12 00:02:47）
   builder が 2 本のまま。終了・削除はしていない。
4. chromium / probe の起動 — **今回は chromium も probe も起動していない**（ビルドとプロセス一覧の読み取りのみ）。

## ORDER からの逸脱
なし

## 動作確認
- ビルド成功（上記）。app/ の差分なし。
- 画面の目視確認（probe）は ORDER の指示により行っていない。

## デモモード
変更なし。`?demo=1` で幽霊の指が自動演奏する（今回は実機確認していない）。

## 既知の問題・妥協点
- builder ループが 2 本同時に常駐している。撮影時に別ループの chromium と並行すると launch が失敗する可能性があり、c31〜c36 の撮影失敗と整合するが、原因との因果は未証明（私は chromium を起動していないため確認できていない）。
- c34 で入れた立ち上がり演出は自動ロールバックで失われたまま。今回は着手していない。

## 変更した主なファイル
なし（comms/reports/REPORTv37.md のみ追加）

## 司令塔への申し送り
- 【人間への申し送り・事実】`harness/loop.mjs builder` が PID 8332 と PID 29712 の 2 本常駐している。どちらか一方の停止は人間の判断が必要（作業役・司令塔は他プロセスに触れない）。
- 撮影が healthy=true で通ったら、次の normal で立ち上がり演出を小さく再導入し、その後に追想を再開するのが順当。
