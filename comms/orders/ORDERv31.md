# ORDER v31  (mode: repair)
## 目的
c30 の撮影が「browserType.launch: Target page, context or browser has been closed」で起動失敗した（`meta.json` の reasons、`screens: []`）。app 自体は司令塔の probe で健全だったので、**app を壊さずに撮影が通る状態を保つ**ことだけを行う。

## やること（優先順）
1. **健全性の確認（変更なしが基本）**: `npm run build` を実行し成功を確認。`node harness/tools/probe.mjs` で `/?demo=1`（desktop・mobile）と `/?demo=1&recall=1`（mobile）を実行し、blank=false・consoleErrors=[] を確認する。
   - 受け入れ条件: 3 本の probe がすべて ok、コンソールエラー 0、`recall=1` で `dataset.memory≥3` かつ `recallGen≥1`。
2. **プロセスの後始末**: 自分が起動した node / vite / chromium が残っていないことを確認し、残っていれば自分で起動したものだけ終了する（プロジェクト外のプロセスは触らない）。撮影の起動失敗は残存プロセスや重い直前処理が一因のことがある。
   - 受け入れ条件: REPORT に、終了確認を行った旨を事実として書く。
3. **壊れが見つかった場合のみ**、最小の修正を行う。症状（ビルドログ・コンソールエラー・白画面）を REPORT に引用すること。見つからなければ app/ は無変更でよい（それが正解）。

## やらないこと
- 新機能、UI 追加、見た目の変更、`wave-gl.js` の変更、`shots.json` の変更（画面追加・wait 増加）。
- 追想（recall.js）の仕様変更。`?recall` の評価用パラメータの削除。
- `harness/`・`comms/STATE.json`・`comms/LOG.md`・`comms/VISION.md`・ルートの package 系・`.gitignore` の編集。

## 見た目・UX の要求
- 変更しない。デスクトップ 1280×800・スマホ 390×844 とも c30 と同じ見た目（「響」・石・幽霊の輪・「触れてみてください」・下部ガラスピル）を保つ。

## デモモード
- `?demo=1`（通常）と `?demo=1&recall=1`（追想評価）。カメラ・マイク不要。

## 作業役への注意
- 撮影の起動失敗が続くと自動 rollback で成果（追想）を失う（c22・c27）。作業を最小に保ち、重いテストや長時間の probe を連続で走らせない。終了時にプロセスを残さない。
- コミットに Claude を貢献者として入れない。REPORT には build 結果と probe の値を事実として書く。
