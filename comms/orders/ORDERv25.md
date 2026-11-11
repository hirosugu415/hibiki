# ORDER v25  (mode: repair)

## 目的
app を無変更のまま、撮影が途中で途切れても証拠が残るよう `app/shots.json` を最小の3枚にする。

## 症状（引用）
- `shots/cycle-024/` に `desktop-home.png` と `build.log` のみ。`meta.json` が無く、ヘルス判定が出ていない（c19・c20・c22・c23 では `browserType.launch: Target page, context or browser has been closed`）。
- 今回は起動を越えて home が撮れたので、撮影が進んでいる途中で途切れた可能性がある（`touched` 以降の click・wait・eval で止まった疑い）。
- アプリ側は無実: probe（mobile, `/?demo=1`）で非ブランク、`render=webgl2`、`audio=running`、consoleErrors 空、build 成功。

## やること（優先順）
1. **作業開始時の確認**: `git status` と `npm run build` を実行し、事実だけ REPORT に書く。`app/src/glimmer.js` が無いこと。
   - 受け入れ条件: build 成功、`glimmer.js` 不在。
2. **`app/shots.json` を 3 枚にする**: 順に `home`（wait 1500 のみ）、`touched`（wait 800 → clickAt [300,380] → wait 150）、`mood-night`（click `#mood-night` → wait 1000）。`echo`・`hold` は削除。`eval` 不使用、`waitFor` 不使用、全 URL に `?demo=1`。
   - 受け入れ条件: JSON.parse が通る、`name` が一意、全体の wait 合計 4 秒以下。
3. **probe で1回確認**: `shots.json` の3画面と同じ手順を `node harness/tools/probe.mjs <steps.json>` で desktop・mobile 各1回実行し、各 shot が非ブランクで consoleErrors が空であること。
   - 受け入れ条件: 6 枚とも `ok:true`・`blank:false`。

## やらないこと
- `app/src/` の変更、新機能、見た目の変更、夜光虫の復元。
- `harness/`・`comms/STATE.json`・`comms/LOG.md`・`comms/VISION.md`・ルートの package 系・`.gitignore` の編集、外部通信、新規ライブラリ。
- 撮影途切れの原因を app に探しに行くこと。

## 見た目・UX の要求
- 変更なし。desktop 1280×800・mobile 390×844 とも現状（左上「響」、下部の凪／夜／暁ピル、石、輪、「触れてみてください」）を維持。

## デモモード
- `?demo=1` で幽霊の指が自動演奏。カメラ・マイク不要。例: `[{"goto":"/?demo=1"},{"wait":1500},{"shot":"home"},{"clickAt":[300,380]},{"wait":150},{"shot":"touched"},{"click":"#mood-night"},{"wait":1000},{"shot":"mood-night"}]`。mobile は `--viewport mobile`。

## 作業役への注意
- 「修復」の名で機能を足さない・app を壊さない（c21 の再発防止）。作業量は小さく、shots.json の削減と確認だけで終える。
- コミットに Claude を貢献者として入れない。
- healthy=true に戻れば、司令塔が次の normal で夜光虫を小さく再発行する。
