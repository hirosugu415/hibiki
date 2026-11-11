# ORDER v46  (mode: repair)
## 目的
公式撮影の browserType.launch 回数を減らし、ヘルスを green に戻す（app のコードは変更しない）。

## 壊れている症状（証拠）
- `shots/cycle-045`: `desktop-home.png`・`desktop-touched.png` の2枚で途切れ、`meta.json`・`console-errors.log` が無い。c41〜c45 は同じ形で、いずれも 2〜3 枚撮ったあとの launch が落ちる。
- ビルド成功・差分なし・app は probe で健全。app の不具合ではなく、画面ごとの launch が積み重なって落ちている疑い。

## やること（優先順）
1. `app/shots.json` の screens を **1画面だけ** にする（`touched`: url `/?demo=1`、steps は `wait 600` → `clickAt [190,400]` → `wait 100`。現在の定義をそのまま残す）。`home` と `hold` を削除する。
   受け入れ条件: `app/shots.json` が有効な JSON で、screens が1件のみ。`git diff --stat` に変わったファイルが `app/shots.json` と REPORT 以外に無い。
2. `app/src`・`index.html`・CSS/JS は **一切変更しない**。ビルドは `npm run build` を1回だけ実行して成功を確認してよい（ブラウザは起動しない）。
   受け入れ条件: `git diff --stat -- app/src` が空。ビルドログに error が無い。
3. REPORT に、変更した事実（shots.json を1画面にした）と、ビルド結果だけを数行で書いて終える。

## やらないこと
- 新機能、見た目の変更、app/src の編集。
- chromium・playwright・probe・dev サーバーの起動。他プロセスの終了。
- `harness/`、`comms/STATE.json`、`comms/LOG.md`、`comms/VISION.md`、ルートの package 系、`.gitignore` の編集。

## 見た目・UX の要求
- 変更なし。デスクトップ・スマホとも現状（「響」、ヒント、ガラスのバー、石、波紋）を維持。

## デモモード
- 変更なし。`?demo=1` で幽霊の指が演奏する。撮影は touched の1枚で、タップ後の波紋が見える。

## 作業役への注意
- 撮影が healthy=true になったら、次サイクルで shots.json を home / touched に戻すことを検討する（司令塔が指示する）。
- 直したくなっても app/src は触らない。コミットに Claude を貢献者として入れない。
