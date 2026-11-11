# ORDER v49  (mode: repair)
## 目的
c48 の撮影失敗（browserType.launch が閉じられた）を受け、app を触らずに green の維持条件を整える。新機能は作らない。

## 背景（証拠）
- c48 meta.json: healthy=false、reasons=「撮影処理の失敗: browserType.launch: Target page, context or browser has been closed」、screens=[]。
- ビルドは成功、コンソールエラー 0 件、diff は REPORT/STATE のみ。司令塔の probe（mobile）では波紋・audio=running とも正常。
- つまり app は健全で、失敗は撮影側の chromium 起動。c47 は成功しており間欠的。

## やること（優先順）
1. 現状確認だけを行う。`app/shots.json` が1画面（touched）で有効な JSON であることを確認する。
   受け入れ条件: REPORT に「shots.json は1画面・有効」と書く。
2. `npm run build` を1回だけ実行して成功を確認する。
   受け入れ条件: REPORT にビルド結果（成功/失敗と出力サイズ）を書く。
3. app/ は1文字も変更しない。
   受け入れ条件: `git diff --stat` の app/ 配下が空。

## やらないこと
- 新機能、見た目の変更、shots.json の画面追加、JS・CSS の編集。
- chromium・playwright・probe・dev サーバーの起動、他プロセスの終了。（撮影の起動を妨げる残留プロセスを作らないため）
- `harness/`、`comms/STATE.json`、`comms/LOG.md`、`comms/VISION.md`、ルートの package 系、`.gitignore` の編集。

## 見た目・UX の要求
- 変更しないこと。「響」、ガラスのバー、石、波紋の見た目を c47 のまま保つ。

## デモモード
- 変更なし。`?demo=1` で幽霊の指が演奏し、(190,400) のタップ後に波紋が見える。

## 作業役への注意
- 「何もしないことが正解」のサイクル。直したくなっても app/ を触らない。
- 作業が終わったら、起動した子プロセスが残っていないことを意識する（そもそも build 以外を起動しない）。
- コミットに Claude を貢献者として入れない。
