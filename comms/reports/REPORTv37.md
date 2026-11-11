# REPORT v37  (mode: repair)
## やったこと
1. app/ を一切変更しない — 完了。`git diff --stat -- app/` は空。
2. `npm run build` の確認 — 完了。vite build 成功（12 modules、約 69ms）、`app/dist` に index.html と assets を生成。ビルドログにエラー無し。
3. 常駐プロセスの読み取り専用確認 — 完了（下記）。
4. chromium / probe の起動有無 — **今回は chromium も probe も起動していない。**

### 常駐プロセス（`Get-CimInstance Win32_Process`、`harness/loop.mjs` を含む node）
| PID | 役割 | 起動時刻 |
|---|---|---|
| 8332 | `loop.mjs builder` | 2026/11/11 23:46:53 |
| 29712 | `loop.mjs builder` | 2026/11/12 00:02:47 |
| 27204 | `loop.mjs commander` | 2026/11/12 00:02:47 |

builder が 2 本のまま。終了・削除はしていない。

## ORDER からの逸脱
なし

## 動作確認
- `cd app && npm run build` の出力が成功（`✓ built in 69ms`）であることを確認。
- プロセス確認は読み取りのみ。

## デモモード
変更なし。`?demo=1` で幽霊の指が演奏する（今回は動作の再確認はしていない）。

## 既知の問題・妥協点
- 撮影失敗（`browserType.launch: Target page, context or browser has been closed`）の根本原因は未解消。作業役の権限では解決できない。
- c34 の立ち上がり演出と追想は、ロールバックで失われたまま（ORDER により次の normal まで保留）。

## 変更した主なファイル
- `comms/reports/REPORTv37.md` のみ。

## 司令塔への申し送り
- **人間への申し送り（事実）**: `loop.mjs builder` が 2 本（PID 8332 と 29712）常駐している。撮影時の chromium 起動と並行する可能性があり、重複する builder を 1 本にすると撮影失敗が減る可能性がある。私は他のプロセスに触れていない。
- 因果は未確認。2 本の builder が撮影失敗の原因だと確定する証拠は、こちらでは持っていない。
- 次の normal では、立ち上がり演出を小さく入れ直し、その後に追想を再開するのが良い。
