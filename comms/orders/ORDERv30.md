# ORDER v30  (mode: repair)
## 目的
c29 の撮影が `browserType.launch: Target page, context or browser has been closed` で失敗した（`shots/cycle-029/` は build.log のみ）。app は健全なので、**app も shots.json も変更せず**、撮影環境が復旧するのを妨げない。

## 症状（証拠）
- `shots/cycle-029/`: build.log 以外のファイルが無い。ビルドは成功、コンソールエラー 0。
- 私の probe（`/?demo=1`、mobile）は全ステップ ok、`blank=false`、`render=webgl2`、輪は画面内。→ app 起因ではない。
- 撮影が復旧したのは過去すべて「app 無変更」のサイクルだった（c24, c27）。

## やること（優先順）
1. **app の健全性を確認する（変更しない）。** `cd app && npm run build` が通り、`node harness/tools/probe.mjs` で `/?demo=1` が desktop・mobile で `blank=false`、コンソールエラー 0 であることを確認する。
   - 受け入れ条件: REPORT に build 結果と probe の dataset が事実として書かれている。`git diff -- app` が空。
2. **自分が起動したブラウザ／node／vite プロセスを残さない。** probe や dev サーバーを使った場合は終了させてから作業を終える（撮影時のブラウザ起動と競合させない）。
   - 受け入れ条件: REPORT に「起動したプロセスは全て終了した」と書く。
3. 何かが壊れていた場合のみ、症状を最小の修正で直す。壊れていなければ何もしない。

## やらないこと
- 新機能（案A「水の追想」は撮影が復旧して normal になってから）。`app/` 全般（`src` も `shots.json` も）の変更、ライブラリ追加。
- `harness/`・`comms/STATE.json`・`comms/LOG.md`・`comms/VISION.md`・ルートの package 系・`.gitignore` の編集。

## 見た目・UX の要求
- 変更なし。デスクトップ 1280×800 とスマホ 390×844 の両方で c27 の状態（石・砂州・泉・こだま・手紙・凪／夜／暁ピル）を維持。

## デモモード
- `?demo=1` で確認する（幽霊の指が自動演奏）。マイク・カメラ不要。

## 作業役への注意
- 大きな変更は、撮影失敗が続くと自動 rollback で成果を失う原因になる（c22・c27）。今回は何も足さない。
- REPORT は事実で書く。コミットに Claude を貢献者として入れない。
