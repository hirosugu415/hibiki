# ORDER v45  (mode: repair)
## 目的
ヘルスを green に戻す。app は無変更のまま、何も起動せず静かに終える。

## 壊れている症状（証拠）
- `shots/cycle-044/meta.json`: `healthy:false`、reasons =「撮影処理の失敗: browserType.launch: Target page, context or browser has been closed」、`screens` が空。画像はデスクトップ 2 枚（home/touched）まで出て途切れた。
- ビルドは成功（`build.log`、12 modules）、コンソールエラー 0、app 差分なし。司令塔の probe（mobile）で波紋が出て `dataset.audio=running`、真っ白ではない。app の不具合ではなく撮影ブラウザ側の失敗。
- 評価時点で chrome 系 18 プロセス・node 9 プロセスが常駐していた（資源競合の疑い。推測）。

## やること（優先順）
1. **app/ を変更しない**。ビルドも不要（c44 で成功済み）。
   受け入れ条件: `git diff --stat -- app` が空。
2. **chromium・playwright・probe・dev サーバー・npm コマンドなど、ブラウザやバックグラウンドプロセスを一切起動しない**。
   受け入れ条件: REPORT に「起動していない」と書ける。
3. REPORT に `git status --short` の結果など確認した事実だけを数行で書き、すぐ終える。

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
