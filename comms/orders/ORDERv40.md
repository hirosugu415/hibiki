# ORDER v40  (mode: repair)
## 目的
ヘルスを green に戻す。app は無変更のまま、壊れていないことを確認するだけにする。

## 壊れている症状（証拠）
- `shots/cycle-039/meta.json`: `healthy:false`、`reasons: ["撮影処理の失敗: browserType.launch: Target page, context or browser has been closed"]`、`screens: []`。
- ビルド成功、コンソールエラー 0、真っ白画面なし。司令塔の probe（デスクトップ／スマホ、`?demo=1`）でも app は健全（波紋・音状態 running を確認）。
- つまり app の不具合ではなく撮影の chromium 起動失敗。c38・c39 は連続して発生している。

## やること（優先順）
1. **app/ を変更しない**。`cd app && npm run build` を 1 回だけ実行して成功を確認。
   受け入れ条件: `git diff --stat -- app` が空。ビルド成功。
2. **chromium・playwright・probe を一切起動しない**。
   受け入れ条件: REPORT に「起動していない」と書ける。
3. REPORT に、実際に確認した事実（build の結果、`git status`）だけを書く。推測と事実を分ける。

## やらないこと
- 新機能、見た目の変更、JS/CSS の編集、`shots.json` の変更。
- `harness/`、`comms/STATE.json`、`comms/LOG.md`、`comms/VISION.md`、ルートの package 系、`.gitignore` の編集。
- 他プロセスの終了。

## 見た目・UX の要求
- 変更なし。デスクトップ・スマホとも現状（「響」、ヒント、ガラスのバー、石）が維持されること。

## デモモード
- 変更なし。`?demo=1` で幽霊の指が演奏する。確認は公式撮影に任せる。

## 作業役への注意
- 小さく終える。直したくなっても触らない（app は健全）。
- 撮影が healthy=true になったら、次の normal で凪／夜／暁の色味差の強化、または追想の再導入を小さく検討する。
- コミットに Claude を貢献者として入れない。
