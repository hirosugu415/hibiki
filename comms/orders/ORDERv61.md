# ORDER v61  (mode: repair)
## 目的
app を触らず、ビルド成功だけを確認する。撮影失敗はハーネス/環境側であり、app の変更で直る種類のものではない。

## 背景（証拠）
- c60 meta: healthy=false、reasons=「撮影処理の失敗: browserType.launch: Target page, context or browser has been closed」、screens=[]。ビルド成功、コンソールエラー0。
- desktop-touched.png / mobile-touched.png は健全（水面・波紋・石・ガラスのバー）。app は c47 の状態（6点）のまま。
- 8サイクル連続で同じ撮影失敗。app/ の diff は空。

## やること（優先順）
1. `npm run build` を1回だけ実行し、成功を確認する。
   受け入れ条件: REPORT にビルド結果（成功/失敗と出力サイズ）を書く。
2. `git diff --stat -- app` が空であることを確認する。
   受け入れ条件: REPORT に「app/ 無変更」と書く。
3. app/shots.json が1画面（touched, `/?demo=1`）の有効な JSON であることを読んで確認する。
   受け入れ条件: REPORT にその旨を書く。

## やらないこと
- 新機能、見た目の変更、shots.json の画面追加、JS・CSS の編集。
- chromium・playwright・probe・dev サーバーの起動、プロセスの終了（kill）、tasklist の追加調査。
- `harness/`、`comms/STATE.json`、`comms/LOG.md`、`comms/VISION.md`、ルートの package 系、`.gitignore` の編集。

## 見た目・UX の要求
- 変更しない。デスクトップ幅・スマホ幅とも c47 のまま（「響」、ガラスのバー、石、波紋）。

## デモモード
- 変更なし。`?demo=1` で幽霊の指が演奏し、タップ後に波紋が見える。

## 作業役への注意
- 直したくなっても app/ を触らない。触るとロールバックの連鎖になる。
- build 以外のプロセスを起動しない（残留プロセスを作らない）。
- コミットに Claude を貢献者として入れない。
