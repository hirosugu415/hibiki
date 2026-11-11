# ORDER v27  (mode: repair)
## 目的
公式撮影の起動・途中失敗（`browserType.launch: Target page, context or browser has been closed`、`screens: []`）を、撮影負荷のさらなる削減で解消する。新機能は禁止。

## 背景
c26 の `meta.json`: `healthy:false`、`screens:[]`。ビルド成功・コンソールエラー 0。撮影は途中まで進み画像が一部だけ残った（desktop-hold / mobile-home / mobile-touched / mobile-glimmer-ring）が、全体として完走せず。司令塔の probe（mobile・`/?demo=1`・夜モード切替）は正常で、`dataset.glimmer`=32。app の欠陥ではなく、撮影プロセスの不安定。c26 で wait 合計を 6.87 秒にしても直らなかった。

## やること（優先順）
1. **`app/shots.json` のみを軽量化する。** 4 枚に減らす: `home`、`touched`、`glimmer-ring`、`hold`（`mood-night` は削除）。wait 合計 4 秒以下。`waitFor` は使わない。全 URL に `?demo=1`。
   - 例: home は wait 1000、touched は wait 600 → clickAt → wait 100、glimmer-ring は wait 700 → clickAt → wait 400、hold は wait 200 → down → wait 600 → up（wait は最後に 200 以内）。
   - 受け入れ条件: JSON.parse OK、枚数 4、name 一意、wait 合計 4000ms 以下（node で集計して REPORT に記載）、`waitFor` 不使用。
2. **ビルドと健全性の確認（コードは触らない）。** `cd app && npm run build` 成功。`node harness/tools/probe.mjs` で `/?demo=1` を desktop・mobile で開き、エラー 0・blank:false・`dataset.glimmer`（desktop 48 / mobile 32）を REPORT に実測値で記載。
   - 受け入れ条件: 実測値が REPORT にある。app/ に shots.json 以外の差分が無い。

## やらないこと
- 新機能・見た目の変更・鈴の音・「響」の調整（次の normal サイクルで行う）。
- 撮影枚数・待機の増加。`wave-gl.js` の変更。常時 rAF の追加。
- `harness/`・`comms/STATE.json`・`comms/LOG.md`・`comms/VISION.md`・ルートの package 系・`.gitignore` の編集。外部通信・新規ライブラリ。

## 見た目・UX の要求
- 見た目は c26 のまま不変（desktop 1280×800・mobile 390×844）。

## デモモード
- `?demo=1`。probe 例: `[{"goto":"/?demo=1"},{"wait":1200},{"shot":"home"},{"eval":"document.body.dataset.glimmer"}]`。mobile は `--viewport mobile`。

## 作業役への注意
- 変更が shots.json のみなら app の挙動は一切変わらない。壊れる変更はしない。
- 失敗が環境由来と思われる場合も無理にコードを動かさず、軽量化と事実の報告にとどめる。
- REPORT は実測の事実で書く。誇張しない。コミットに Claude を貢献者として入れない。
