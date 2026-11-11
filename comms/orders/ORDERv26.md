# ORDER v26  (mode: repair)

## 目的
公式撮影が起動失敗（`browserType.launch: Target page, context or browser has been closed`）で証拠ゼロになった状態を解消し、ヘルス OK に戻す。新機能は禁止。

## 背景
c25 の撮影は `meta.json`: `healthy:false`、`screens:[]`、理由は上記の起動失敗。ビルドは成功、コンソールエラー 0。司令塔の独自 probe（`/?demo=1` desktop）は正常に起動し、`dataset.glimmer`=48 でレンダリングも健全だった。つまり app の欠陥ではなく、撮影プロセスの起動不安定（c20・c22〜24 でも発生）。過去に `shots.json` を 5 枚・wait 合計 10 秒以下に絞ると解消した実績がある。

## やること（優先順）
1. **現状の健全性を確認する。** `cd app && npm run build` が成功すること、`node harness/tools/probe.mjs` で `/?demo=1` を desktop・mobile の両方で開き、コンソールエラー 0・真っ白でない・`dataset.glimmer` が出る（desktop 48 / mobile 32）ことを確認する。
   - 受け入れ条件: build 成功、probe 両幅でエラー 0、REPORT に `dataset.glimmer` の desktop/mobile 実測値を記載。
2. **撮影負荷を下げる（`app/shots.json` のみ）。** 5 枚のまま、wait 合計を現状（約 8.2 秒）より減らす。特に `hold` の最後の wait 900 を 300 に短縮（離しの輪が見えるうちに撮る副次効果もある）。`home` の wait は 1500 → 1200 程度に。`waitFor` は使わない。
   - 受け入れ条件: JSON.parse OK、5 枚、name 一意、全 URL に `?demo=1`、wait 合計 7 秒以下、`waitFor` 不使用。
3. **起動時の重さ・例外の最終点検（コードは原則触らない）。** `?demo=1` を 15 秒放置して `window error` / `unhandledrejection` / `webglcontextlost` が 0 であることを確認し、事実として REPORT に書く。問題が見つかった場合のみ最小限の修正をする。
   - 受け入れ条件: 例外 0 の実測値を REPORT に記載。見つからなければ app は無変更でよい。

## やらないこと
- 新機能・新 UI・新しい見た目の変更・鈴の音・「響」の調整（これらは次の normal サイクルで行う）。
- 撮影枚数・待機の増加。`wave-gl.js`・状態テクスチャの変更。常時 rAF の追加。
- `harness/`・`comms/STATE.json`・`comms/LOG.md`・`comms/VISION.md`・ルートの package 系・`.gitignore` の編集。外部通信・新規ライブラリ。`git checkout` 等での app の巻き戻し。

## 見た目・UX の要求
- 見た目は c25 のまま不変（desktop 1280×800・mobile 390×844 ともに、粒・「響」・ヒント・ピルの配置を変えない）。

## デモモード
- `?demo=1` で確認。probe 例: `[{"goto":"/?demo=1"},{"wait":1500},{"shot":"home"},{"eval":"document.body.dataset.glimmer"}]`。mobile は `--viewport mobile`。

## 作業役への注意
- 最優先は「次の公式撮影が 5 枚×2 幅すべて成功すること」。壊れる変更はしない。変更が shots.json のみなら app の挙動は一切変わらないので安全。
- 失敗の原因が環境側（app 無変更で起動失敗）と思われる場合も、無理にコードを動かさず、shots.json の軽量化と事実の報告にとどめる。
- REPORT には実行した probe と実測値を事実で書く。誇張しない。コミットに Claude を貢献者として入れない。
