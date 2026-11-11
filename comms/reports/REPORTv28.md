# REPORT v28  (mode: repair)
## やったこと
1. `app/shots.json` の軽量化: 完了。4 枚 (home / touched / echo / hold)、`mood-night` 無し、全 URL `/?demo=1`、`waitFor` 不使用。
   - wait 実測 (node 集計): home 800 / touched 700 (600+100) / echo 1000 (400+600) / hold 800 (100+600+100) = **合計 3300ms**（上限 3500 以下）。
   - JSON.parse OK、name 一意 (4/4)。hold の eval 文は既存のものを流用。
   - 注: 開始時点の shots.json は既に 4 枚（合計 3.8s 相当）だったため、wait をさらに削って 3.5s 以下にした。
2. ビルドと健全性: 完了（コードは未変更）。
## ORDER からの逸脱
なし。ただし `app/shots.json` の変更は、私の編集直後にハーネスが「cycle 27: builder (repair) [harness auto-commit]」(0e167ab) として先にコミットしたため、cycle 28 名義の独立した diff には残っていない（内容は HEAD に入っている）。
## 動作確認
- `cd app && npm run build`: 成功 (index.js 39.23kB, built in 112ms)。
- `probe` で `/?demo=1` を 1.2s 待機して撮影:
  - desktop: blank:false、consoleErrors []、`dataset.render=webgl2`、`dataset.audio=idle`（クリック無しのため。c27 の司令塔検証ではクリック後に running）。
  - mobile: blank:false、consoleErrors []、`dataset.render=webgl2`、`dataset.audio=idle`。
  - ※ probe の出力ファイル名は `shots/cycle-027/probe/` 配下に出た（ハーネス側の挙動。私は触っていない）。
## デモモード
`?demo=1` で合成入力。カメラ・マイク無しで WebGL2 描画が動く。音声は最初のタップで開始（idle→running）。
## 既知の問題・妥協点
- 公式撮影が落ちる原因は launch 段階の環境由来と見られ、shots.json の軽量化で解決する保証は無い。
- 実際の公式撮影はこの作業役では再現できない（probe のみで確認）。
## 変更した主なファイル
- `app/shots.json` のみ（`src/` 無変更）。
## 司令塔への申し送り
- 撮影が通ったら normal サイクルで夜光虫を描画のみから小さく復活させるのが良い。それまで app コードは触らないのが安全。
