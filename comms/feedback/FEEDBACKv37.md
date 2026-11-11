SCORE: 3/10
DIRECTION: polish
SUMMARY: app無変更の修復。撮影launch失敗でヘルスNG（上限3点）。appはprobeで健全
# FEEDBACK v37

## VISION 適合（絶対のルールを守れているか）
違反の証拠は無い（守れている）。ただし公式ヘルスは NG。
- `shots/cycle-037/meta.json`: build ok、`screens: []`、healthy=false、reasons=「撮影処理の失敗: browserType.launch: Target page, context or browser has been closed」。コンソールエラー 0 件。公式スクショは 0 枚。
- 司令塔 probe（`?demo=1`、モバイル 390×844、3 秒待機）の `probe/mobile-demo.png`: 暗い水面、左上「響」、中央の石、幽霊の指による光の輪、下部のガラスのバー（凪／夜／暁／音）、一言ヒント「触れてみてください」。はみ出し・崩れ無し。`blank=false`、`dataset.render=webgl2`（audio は未操作のため `idle`）。

## 採点の根拠
- ヘルス NG は規定により最大 3 点。app の質を下げた結果ではなく、撮影インフラの失敗が理由。
- app 自体は c34（6 点相当）の見た目を維持。ただし評価証拠が無いため点数には反映しない。
- REPORT の主張（app/ 差分なし、ビルド成功、builder 2 本常駐、chromium 未起動）は `diff.stat.txt`（app/ の差分無し）および司令塔のプロセス確認と一致する。同一サイクルの builder が二重に走った記述も整合する。
- 司令塔のプロセス確認: `node harness/loop.mjs builder` が PID 8332（11/11 23:46:53 起動）と PID 29712（11/12 00:02:47 起動）の 2 本、`commander` が PID 27204 の 1 本。状況は c35〜c37 で変わらない。

## 動作確認で分かったこと
- 単独の probe は成功し、app も chromium も健全。公式撮影だけが失敗する。二重 builder が撮影の chromium 起動と競合するという仮説が、状況証拠としてさらに強まった。app 側で直せる問題ではない。
- 司令塔・作業役には `harness/` や他プロセスに触れる権限が無いので、解消には人間が重複 builder（PID 8332 か 29712 の片方）を停止するしかない。

## 方向性の判断
polish（現状維持）。app を変えても撮影の失敗は直らない。むしろ変更が自動ロールバックを誘発して価値ある差分（立ち上がり演出、追想）が失われてきた。人間の対応が済むまで app は凍結するのが最善。

## 次に最も効くこと
1. app/ を一切変更しない（`git diff --stat -- app/` が空）。
2. `npm run build` の成功だけを確認する。chromium / probe は起動しない。
3. 重複 builder の現況（PID・起動時刻）を REPORT に事実として記録し、人間への申し送りとして残す。
