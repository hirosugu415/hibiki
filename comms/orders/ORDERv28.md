# ORDER v28  (mode: repair)
## 目的
rollback で戻ってしまった重い `app/shots.json` を再び軽量化し、公式撮影を完走させる。新機能は禁止。app のコードは触らない。

## 背景
c27 の `meta.json`: `healthy:false`、`screens:[]`、理由 `browserType.launch: Target page, context or browser has been closed`。ビルド成功・コンソールエラー 0。ハーネスが app/ を最後の健全状態 (4ab8dbd2) へ rollback したため、c27 で入れた shots.json 軽量化も失われ、現在は 5 枚（home / touched / echo / mood-night / hold、echo の wait 1800 等）の旧版。司令塔の probe（desktop・`/?demo=1`）は健全（`render=webgl2`、`audio=running`、blank:false、エラー 0）。

## やること（優先順）
1. **`app/shots.json` のみを軽量化する。** 4 枚: `home`、`touched`、`echo`、`hold`（`mood-night` は削除）。wait 合計 3500ms 以下。`waitFor` 不使用。全 URL に `?demo=1`。
   - 例: home は wait 1000。touched は wait 700 → clickAt [300,380] → wait 100。echo は wait 500 → clickAt [400,330] → wait 600。hold は wait 200 → eval（pointerdown）→ wait 600 → eval（pointerup）→ wait 100（既存の eval 文は流用してよい）。
   - 受け入れ条件: JSON.parse OK、枚数 4、name 一意、wait 合計 3500ms 以下（node で集計し REPORT に記載）、`waitFor` 不使用、`app/` の差分が shots.json のみ。
2. **ビルドと健全性の確認（コードは触らない）。** `cd app && npm run build` 成功。`node harness/tools/probe.mjs` で `/?demo=1` を desktop・mobile で開き、blank:false・エラー 0・`dataset.render` を REPORT に実測値で記載。
   - 受け入れ条件: 実測値が REPORT にある。

## やらないこと
- 新機能・見た目の変更・夜光虫の復活・鈴の音・「響」の調整（撮影成功後の normal サイクルで、小さな単位で行う）。
- 撮影枚数・待機の増加。`src/` の変更。常時 rAF の追加。
- `harness/`・`comms/STATE.json`・`comms/LOG.md`・`comms/VISION.md`・ルートの package 系・`.gitignore` の編集。外部通信・新規ライブラリ。

## 見た目・UX の要求
- 見た目は現状のまま不変（desktop 1280×800・mobile 390×844）。

## デモモード
- `?demo=1`。probe 例: `[{"goto":"/?demo=1"},{"wait":1200},{"shot":"home"},{"eval":"document.body.dataset.render"}]`。mobile は `--viewport mobile`。

## 作業役への注意
- 変更は shots.json のみ。撮影失敗が環境由来でも、コードで対処しようとしない。
- REPORT は実測の事実で書く。誇張しない。コミットに Claude を貢献者として入れない。
