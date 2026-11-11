# ORDER v43  (mode: repair)
## 目的
ヘルスを green に戻す。app は無変更のまま、壊れていないことを確認するだけにする。

## 壊れている症状（証拠）
- `shots/cycle-042/meta.json`: `healthy:false`、reasons =「撮影処理の失敗: browserType.launch: Target page, context or browser has been closed」、`screens` が空。撮影は `desktop-home.png` / `desktop-touched.png` までで途切れた。
- ビルドは成功（`build.log`）、コンソールエラー 0、diff は app 差分なし。司令塔の probe（mobile、`?demo=1`）で波紋が出て `dataset.audio=running`。app の不具合ではなく撮影ブラウザ側の失敗。

## やること（優先順）
1. **app/ を変更しない**。`cd app && npm run build` を 1 回だけ実行し成功を確認。
   受け入れ条件: `git diff --stat -- app` が空。ビルド成功。
2. **chromium・playwright・probe・dev サーバーなど、ブラウザやバックグラウンドプロセスを一切起動しない**。作業終了時に自分が起動したプロセスが残っていないこと。
   受け入れ条件: REPORT に「起動していない」と書ける。
3. REPORT に、実際に確認した事実（build 結果、`git status`）だけを書く。推測と事実を分ける。短く終える。

## やらないこと
- 新機能、見た目の変更、JS/CSS の編集、`shots.json` の変更。
- `harness/`、`comms/STATE.json`、`comms/LOG.md`、`comms/VISION.md`、ルートの package 系、`.gitignore` の編集。
- 他プロセスの終了。

## 見た目・UX の要求
- 変更なし。デスクトップ・スマホとも現状（「響」、ヒント、ガラスのバー、石、波紋）が維持されること。

## デモモード
- 変更なし。`?demo=1` で幽霊の指が演奏する。確認は公式撮影に任せる。

## 作業役への注意
- 直したくなっても触らない（app は健全）。
- 撮影が healthy=true になったら、次の normal で「響」の立ち上がり（フェードイン）の小さな再導入、または凪/夜/暁の色味差の強化を **1 つだけ** 検討する。
- コミットに Claude を貢献者として入れない。
