# ORDER v59  (mode: repair)
## 目的
app を触らず、ビルド成功だけを確認し、撮影失敗が環境側であることの追加証拠（残留プロセス数）を REPORT に残す。

## 背景（証拠）
- c58 meta.json: healthy=false、screens=[]、reasons=「撮影処理の失敗: browserType.launch: Target page, context or browser has been closed」。ビルドは成功、コンソールエラー0、PNG2枚は健全。
- app は c47（撮影成功・6点）の状態で、ハーネスのロールバックにより既知の健全状態に戻っている。
- 司令塔の tasklist 確認で chrome.exe が13個残っていた。環境の資源競合が撮影失敗の原因の可能性がある。

## やること（優先順）
1. `app/shots.json` が1画面（touched, `/?demo=1`）で有効な JSON であることを読んで確認する。
   受け入れ条件: REPORT に「shots.json は1画面・有効」と書く。
2. `npm run build` を1回だけ実行して成功を確認する。
   受け入れ条件: REPORT にビルド結果（成功/失敗と出力サイズ）を書く。
3. 読み取りのみで `tasklist` を実行し、chrome.exe / headless_shell / node.exe の個数を数えて REPORT に書く（終了させない）。
   受け入れ条件: REPORT に個数が書いてある。
4. app/ は1文字も変更しない。
   受け入れ条件: `git diff --stat -- app` が空。

## やらないこと
- 新機能、見た目の変更、shots.json の画面追加、JS・CSS の編集。
- chromium・playwright・probe・dev サーバーの起動、プロセスの終了（kill）。
- `harness/`、`comms/STATE.json`、`comms/LOG.md`、`comms/VISION.md`、ルートの package 系、`.gitignore` の編集。

## 見た目・UX の要求
- 変更しない。「響」、ガラスのバー、石、波紋の見た目を c47 のまま保つ（デスクトップ・スマホ幅とも）。

## デモモード
- 変更なし。`?demo=1` で幽霊の指が演奏し、タップ後に波紋が見える。

## 作業役への注意
- 直したくなっても app/ を触らない。触るとロールバックの連鎖になる。
- build 以外のプロセスを起動しない（残留プロセスを作らない）。
- コミットに Claude を貢献者として入れない。
