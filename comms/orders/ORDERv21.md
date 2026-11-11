# ORDER v21  (mode: repair)

## 目的
cycle 20 で撮影が「browserType.launch: Target page, context or browser has been closed」で途中終了し healthy=false になった。**アプリの見た目・挙動は変えずに**、撮影が最後まで確実に走る状態へ戻し、証拠（スクショ）を取り戻す。

## 症状（引用）
- `shots/cycle-020/meta.json`: `"screens": []`、`"healthy": false`、reasons = 「撮影処理の失敗: browserType.launch: Target page, context or browser has been closed」。
- 撮れたのは `desktop-echo.png`・`desktop-mood-night.png` の 2 枚のみ。ビルドは成功、コンソールエラーは 0 件。
- 司令塔の probe（`?demo=1`、desktop/mobile）では、エラー無し・`render=webgl2`・`audio=running` で正常に動いた。つまり **アプリのコードが壊れているのではなく、撮影構成が重い・不安定**と見ている（推測）。`app/shots.json` は 14 画面（×2 幅）で `wait` の合計が約 55 秒/幅（`calm-after` 9000、`idle` 9660、`hold` 8400、`echo` 7800 など）。

## やること（優先順）
1. **`app/shots.json` を軽くする（最優先）。** 合計の `wait` を幅あたり約 25 秒以下に削る。
   - 受け入れ条件: `wait` の合計が各画面の合算で 25000ms 以下。`home`・`touched`・`idle`・`hold`・`echo`・`stone-shadow`・`bar-refract`・`letter-play`・`letter-share`・`mood-night`・`mood-dawn` は残す（画面数は 14 → 12〜14 のまま可）。`calm-after` と `stone-push` は他と重複するので統合・削除してよい。
2. **`letter-play` の証拠を直す。** FEEDBACKv19 の指摘: 手紙の最初の輪とヒント「だれかの水面」が写っていない。
   - 受け入れ条件: `goto` 直後に短い wait（600〜900ms 以内）で 1 枚、その後 2.5〜3 秒で 1 枚の計 2 枚を撮り、1 枚目に手紙の最初の輪（または幽霊の点）、2 枚目にヒント「だれかの水面」と別の位置の輪が写る。
3. **自分で撮影ツールを通して確認する。** ビルド後、`node harness/tools/probe.mjs`（または shots.json を流す既存ツール）を desktop・mobile で最低 2 回連続で実行し、全画面が最後まで撮れてコンソールエラー 0 であることを確認する。
   - 受け入れ条件: REPORT に、実行したコマンド・撮れた枚数・所要時間・エラー有無を書く。起動失敗が再現した場合は、どの画面で何秒後かを記録する。
4. **アプリ側の負荷の点検（問題が見つかった場合のみ修正）。** 起動直後から `?demo=1` で 60 秒放置し、`webglcontextlost` や例外が出ないか、`wake()` が止まるべき時に止まるかを確認する。
   - 受け入れ条件: 問題が無ければコード変更なし（REPORT に「無変更・異常なし」と書く）。問題があれば原因 1 箇所だけを最小限に直し、見た目は不変であること。

## やらないこと
- 新機能の追加（夜光虫など）。**このサイクルは修復専用**。
- `app/` の見た目・音・操作の変更、UI の増減、依存の追加。
- `harness/`・`comms/VISION.md`・`comms/STATE.json`・`comms/LOG.md` の編集。
- 撮影を通すために描画品質を下げる、デモモードの自動演奏を止める、など体験を削る対処（撮影の待機を削る方向だけで解決する）。

## 見た目・UX の要求
- デスクトップ 1280×800 とスマホ 390×844 の両方で、v19／v20 と**まったく同じ見た目**であること（スクショ比較で差が出ないこと）。コンソールエラー 0、真っ白画面なし。

## デモモード
- 撮影は `?demo=1` 前提。`dataset.render`・`dataset.audio` が `webgl2`・`running` になること、`dataset.stoneHits`・`barChimes` が増えることを `eval` で確認する。

## 作業役への注意
- c22 の normal で夜光虫（IDEAS.md 案A）を実装する予定なので、**今回は触らない**。余計な先回りをしない。
- `shots.json` の変更は撮影の安定化が目的。画面の意図（石の影・手紙・長押しなど）が分かる最低限の待機は残す。
- REPORT は誇張せず、撮影が通ったかを事実だけで書く。コミットに Claude を貢献者として入れない。
