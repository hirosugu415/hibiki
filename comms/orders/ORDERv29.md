# ORDER v29  (mode: repair)
## 目的
c28 の撮影が「browserType.launch: Target page, context or browser has been closed」で失敗した（healthy=false、screens 空）。app は健全なので、**app のコードには触れず**、撮影が確実に完走するよう `app/shots.json` だけを最小・安全な形に整える。

## 症状（証拠）
- `shots/cycle-028/meta.json`: `screens: []`, `healthy:false`, reason「撮影処理の失敗: browserType.launch: Target page, context or browser has been closed」。ビルドは成功、コンソールエラー 0。
- 私の probe（`/?demo=1`、desktop）は全ステップ成功、`render=webgl2`、blank=false。→ app 起因ではなく撮影環境の起動失敗。c20/c24/c27 と同種で、撮影が軽いほど復旧しやすかった。
- `mobile-echo.png` の輪が画面右端で切れかけている（clickAt の位置が右寄り）。

## やること（優先順）
1. **app が健全であることを自分で確認する（変更はしない）。** `npm run build`（app 内）が通ることと、`node harness/tools/probe.mjs` で `/?demo=1` が desktop・mobile の両方で `blank=false`、コンソールエラー 0 であることを確認し REPORT に事実として書く。
   - 受け入れ条件: REPORT に build 結果と probe の dataset（`render` `echoPending` など）が書いてある。`git diff -- app/src` が空。
2. **`app/shots.json` を最小化・安定化する。** 画面は現行の 4 枚（home / touched / echo / hold）を維持し、wait の合計は 4 秒以下のまま。重い eval は `hold` の 2 本のみ維持。余計なステップを足さない。
   - mobile で輪が右端で切れないよう、`touched` と `echo` の `clickAt` を**画面内の中央寄り**に直す。desktop(1280×800) は現行値でよいが、mobile(390×844) でも輪全体が収まる座標（例: x が 150〜240、y が 300〜450 の範囲）にする。1 つの shots.json で両幅に効くよう、座標は mobile でも desktop でも不自然でない値（例: [200, 380]）にするか、eval で `innerWidth*0.5` 等の相対座標にクリックする（`hold` の方式と同じ）。
   - 受け入れ条件: 次の撮影で mobile の `touched` / `echo` の輪が全周画面内に写る。
3. **何かが壊れていた場合のみ**（1 で症状が出た場合）、症状を最小の修正で直す。出なければ何もしない。

## やらないこと
- 新機能の実装（案A「水の追想」は c30 の normal で実装。先回りしない）。`app/src` の変更全般、ライブラリ追加、GL シェーダーの変更。
- `harness/`・`comms/STATE.json`・`comms/LOG.md`・`comms/VISION.md`・ルートの package 系・`.gitignore` の編集。
- shots.json の画面数や wait の増加（撮影の安定条件を壊す）。

## 見た目・UX の要求
- app の見た目は変えない（c27 の状態＝石・砂州・泉・こだま・手紙・凪／夜／暁ピル）。デスクトップ 1280×800 とスマホ 390×844 の両方で従来どおり。

## デモモード
- `?demo=1` で確認する（幽霊の指が自動演奏）。マイク・カメラ不要。

## 作業役への注意
- 夜光虫のような大きな一括投入や app の変更は、撮影失敗が続くと自動 rollback で成果を失う原因になる（c22・c27）。今回は shots.json のみ。
- REPORT は事実で書く。コミットに Claude を貢献者として入れない。
