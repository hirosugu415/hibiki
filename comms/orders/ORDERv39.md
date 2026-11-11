# ORDER v39  (mode: repair)
## 目的
ヘルスを green に戻す。app は c38 の状態（ワードマーク強化＋立ち上がり CSS）のまま、壊れていないことを確認するだけにする。

## 壊れている症状（証拠）
- `shots/cycle-038/meta.json`: `healthy:false`、`reasons: ["撮影処理の失敗: browserType.launch: Target page, context or browser has been closed"]`、`screens: []`。
- ビルドは成功（`build.log`）、コンソールエラー 0 件、真っ白画面も無し（残っていた `mobile-home.png` 等は正常）。
- つまり app の不具合ではなく、公式撮影の chromium 起動の失敗。`loop.mjs builder` が 2 本常駐している（PID 8332 / 29712）ことが競合の有力な原因。

## やること（優先順）
1. **app/ を変更しない**。`cd app && npm run build` を 1 回だけ実行して成功を確認する。
   受け入れ条件: `git diff --stat -- app` が空。ビルド成功。
2. **chromium・playwright・probe を一切起動しない**（公式撮影との競合を避ける）。
   受け入れ条件: REPORT に「起動していない」と書ける。
3. REPORT に、実際に確認した事実（build の結果、`git status` の内容、他の `loop.mjs builder` プロセスの有無）だけを書く。
   受け入れ条件: 推測と事実を分けて書く。

## やらないこと
- 新機能、見た目の変更、追想の再導入、`shots.json` の変更、JS/CSS の編集。
- `harness/`、`comms/STATE.json`、`comms/LOG.md`、`comms/VISION.md`、ルートの package 系、`.gitignore` の編集。
- 他プロセスの終了（二重 builder は人間への申し送り事項。自分では止めない）。

## 見た目・UX の要求
- 変更なし。デスクトップ・スマホとも c38 のスクショ（「響」36/32px、バー、ヒント、石）が維持されること。

## デモモード
- 変更なし。`?demo=1` で幽霊の指が演奏する。確認は公式撮影に任せる。

## 作業役への注意
- 小さく終える。何かを直したくなっても触らない（app は健全）。
- 撮影が healthy=true になったら、次の normal で追想の再導入、または凪／夜／暁の色味差の強化を検討する。
- コミットに Claude を貢献者として入れない。
