# ORDER v38  (mode: repair)
## 目的
app を変更せずに、撮影（ヘルスチェック）が healthy=true で通る状態を保つ。c37 も `browserType.launch: Target page, context or browser has been closed` で撮影が失敗したが、司令塔の probe では app は健全。

## 症状（引用）
- `shots/cycle-037/meta.json`: build ok、`screens: []`、healthy=false、reasons=「撮影処理の失敗: browserType.launch: Target page, context or browser has been closed」。
- コンソールエラー 0 件、ビルド成功。
- 司令塔 probe（モバイル、`?demo=1`）: blank=false、`dataset.render=webgl2`、石・「響」・ガラスのバーが崩れなく表示。
- 常駐: `loop.mjs builder` が PID 8332 と PID 29712 の 2 本、`commander` が PID 27204 の 1 本（司令塔が確認）。
- c37 で、同一サイクルの builder が二重に走り、`git commit` が `cannot lock ref 'HEAD'` で競合した（REPORTv37 追記）。

## やること（優先順）
1. **app/ を一切変更しない。** 受け入れ条件: `git diff --stat -- app/` が空。
2. **`npm run build` が成功することを確認する**（ビルドのみ）。受け入れ条件: 終了コード 0、`app/dist` が生成される。
3. **常駐プロセスの現況を読み取り専用で確認し、REPORT に書く。** `Get-CimInstance Win32_Process` で `harness/loop.mjs` を含む node の本数・PID・起動時刻を事実として書く。終了・削除はしない。builder が 2 本のままなら、人間への申し送りに書く。
4. REPORT に「今回 chromium / probe を起動したか」を明記する（今回も起動しない）。
5. `git commit` が `cannot lock ref 'HEAD'` で失敗したら、`git log` で同内容のコミットが既にあるかを確認し、重複なら自分の版は破棄して REPORT に一行書く。再試行の連打はしない。

## やらないこと
- `app/` の編集（新機能、追想の復活、立ち上がりアニメーションの再導入、CSS 変更を含む）。ヘルスが回復して normal になるまで保留。
- `harness/`、`comms/STATE.json`、`comms/LOG.md`、`comms/VISION.md`、ルートの package 系、`.gitignore` の編集。
- 他プロセスの終了、プロジェクト外への操作、probe・撮影の起動。

## 見た目・UX の要求
- 変更なし。desktop・mobile とも c34（score 6）に近い、静かな水面・石・「響」・ガラスのバーの見た目のまま。

## デモモード
- 変更なし。`?demo=1` で幽霊の指が演奏する。

## 作業役への注意
- 「何もしないことが正解」のサイクル。余計な編集で app を壊さない。
- normal に戻ったら、まず c34 の立ち上がり演出を小さく入れ直し、その後に追想（コミット `a2641c2` の `recall.js` 等）を再開する。今は着手しない。
- REPORT は今回実際に確認した事実のみを書く。コミットに Claude を貢献者として入れない。
