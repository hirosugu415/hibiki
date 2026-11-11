# ORDER v24  (mode: repair)

## 目的
app を無変更のまま保ち、撮影が起動できた時に確実に完走するよう `app/shots.json` をさらに最小化する。

## 症状（引用）
- `shots/cycle-023/meta.json`: `healthy:false` / `reasons: ["撮影処理の失敗: browserType.launch: Target page, context or browser has been closed"]` / `screens: []`。ビルド成功、コンソールエラー 0。
- 起動失敗は `harness/lib/capture.mjs` の `chromium.launch` 時点で、`shots.json` の内容に到達する前に起きている。c19・c20・c22・c23 で再発。アプリ起因ではない。
- 司令塔の probe（`/?demo=1`, desktop）は ok・非ブランク・`render=webgl2`・`audio=running`。

## やること（優先順）
1. **作業開始時の確認**: `git status`・`npm run build` を実行し、結果の事実だけ REPORT に書く。app/src が c19 状態（`glimmer.js` 無し）であること。
   - 受け入れ条件: build 成功、`app/src/glimmer.js` が存在しない。
2. **`app/shots.json` を 5 枚に減らす**: `home`、`touched`、`echo`、`mood-night`、`hold` のみ残す。`stone-shadow`・`mood-dawn`・`bar-refract`・`letter-play` は削る。各画面の wait 合計は 3 秒以下、`waitFor` 不使用、全 URL に `?demo=1`。
   - 受け入れ条件: `node -e "JSON.parse(require('fs').readFileSync('app/shots.json'))"` が通る、`name` が一意、全体の wait 合計 10 秒以下。
3. **probe で 1 回だけ確認**: `/?demo=1` を desktop・mobile で開いて 5 秒、コンソールエラーが無いこと。変更の必要が無ければ変更しない。
   - 受け入れ条件: consoleErrors が空。

## やらないこと
- `app/src/` の変更、新機能、見た目の変更、夜光虫（glimmer）の復元。
- `harness/`・`comms/STATE.json`・`comms/LOG.md`・`comms/VISION.md`・ルートの package 系・`.gitignore` の編集。外部通信・新規ライブラリ。
- 起動失敗の原因を app に探しに行くこと。

## 見た目・UX の要求
- 変更なし。desktop 1280×800・mobile 390×844 とも現状（左上の「響」、下部の凪／夜／暁ピル、石、輪）を維持。

## デモモード
- `?demo=1` で幽霊の指が自動演奏。確認 probe 例: `[{"goto":"/?demo=1"},{"wait":1500},{"shot":"home"},{"clickAt":[300,380]},{"wait":400},{"shot":"touched"},{"eval":"JSON.stringify(document.body.dataset)"}]`。mobile は `--viewport mobile`。

## 作業役への注意
- 失敗は撮影の起動失敗で、アプリのバグではない。「修復」の名で機能を足したり壊したりしない（c21 の再発防止）。
- 作業量は小さくてよい。`shots.json` の削減と確認だけで終えること。
- コミットに Claude を貢献者として入れない。
- healthy=true に戻れば、司令塔が次の normal で夜光虫を小さく再発行する。
