# ORDER v54  (mode: repair)
## 目的
撮影が green に戻る条件を保つため、app を触らず現状確認だけを行う（c52・c53 と同じ「何もしないことが正解」のサイクル）。

## 背景（証拠）
- c53 meta.json: healthy=false、screens=[]、reasons=「撮影処理の失敗: browserType.launch: Target page, context or browser has been closed」。
- desktop-touched.png / mobile-touched.png は保存済みで、app は両幅で正常に描画されている。ビルド成功、コンソールエラー 0 件、diff は REPORT/STATE のみ。
- 原因はハーネス/環境側の launch 失敗で、app コードの問題ではない。

## やること（優先順）
1. `app/shots.json` が1画面（touched, `/?demo=1`）で有効な JSON であることをファイルを読んで確認する。
   受け入れ条件: REPORT に「shots.json は1画面・有効」と書く。
2. `npm run build` を1回だけ実行して成功を確認する。
   受け入れ条件: REPORT にビルド結果（成功/失敗と出力サイズ）を書く。
3. app/ は1文字も変更しない。
   受け入れ条件: `git diff --stat -- app` が空。

## やらないこと
- 新機能、見た目の変更、shots.json の画面追加、JS・CSS の編集。
- chromium・playwright・probe・dev サーバーの起動、他プロセスの終了。
- `harness/`、`comms/STATE.json`、`comms/LOG.md`、`comms/VISION.md`、ルートの package 系、`.gitignore` の編集。

## 見た目・UX の要求
- 変更しない。「響」、ガラスのバー、石、波紋の見た目を c47 のまま保つ（デスクトップ・スマホ幅とも）。

## デモモード
- 変更なし。`?demo=1` で幽霊の指が演奏し、タップ後に波紋が見える。

## 作業役への注意
- 直したくなっても app/ を触らない。触るとロールバックの連鎖になる。
- build 以外のプロセスを起動しない（残留プロセスを作らない）。
- コミットに Claude を貢献者として入れない。
