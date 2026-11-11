# ORDER v30  (mode: normal)
## 目的
案A「水の追想（Recollection）」を最小実装し、**触れるのをやめた静けさの間にも、自分の演奏が変形・減衰しながら水面に戻ってくる**体験を足す（`IDEAS.md` の Cycle 28 案A、c28 で採用済み）。c29 で撮影が復旧し app は 6 点で安定しているので、小さく安全に入れる。

## やること（優先順）
1. **`app/src/recall.js` を新規作成**（`echo.js` と同じ形の `createRecall({ play, onChange })`、約 80 行）。
   - 直近に**ユーザー（と幽霊の指）が弾いた** `tap` を最大 6 件のリングバッファに記録（`x, yTop, vel, 時刻`）。こだまの再生音・追想自身の再生は**記録しない**（無限ループ禁止）。
   - 最後の `tap` / `pointerdown` から **6 秒の静止**でタイマー 1 本が発火し、記憶（3 件以上あるときのみ）を最大 3 周、ゆっくり再演する:
     - 1 周目: 記憶の元の順で、間隔 1.5 倍。音量（vel）×0.55。
     - 2 周目: 1 音おきに 1 つ抜き、音は 5 度上（既存の音階の範囲に丸める）。vel ×0.35。
     - 3 周目: 記憶の中の最高音 1 つだけ、vel ×0.2。以後は静止して終了。
   - 再演は既存の `ripple()`＋`note()`（こだまの `play` と同じ呼び方。`echoRing` は呼ばない＝新しい視覚要素を足さない）。弱い輪だけが立つ。
   - **`pointerdown`（実プレイヤーの接触）・`document.hidden`・ミュート時の音は即停止/スキップ**。同時発音は最大 6 声。`pointerdown` 後は記憶を全クリアせず、新しい演奏が追加されるだけでよい（古いものは 6 件超で押し出し）。
   - 受け入れ条件: `?demo=1&recall=1`（待ち 6 秒→1.2 秒に短縮する評価用パラメータ。`recall=0` で無効化できる）で、probe の eval に `document.body.dataset.memory`（記憶件数・0〜6）、`dataset.recallGen`（0〜3）、`dataset.recallLast`（最後に再演した点の `x,y`）が出ており、幽霊が手を止めた後に `memory ≥ 3` かつ `recallGen ≥ 1` になる。コンソールエラー 0。
2. **`main.js` への配線**は最小限（約 20 行）。`tap()` の `record` が真のとき `recall.record(x, yTop, vel)` を呼び、`createRecall` の `play` に既存の `ripple`/`note` を渡す。`pointerdown` ハンドラで `recall.interrupt()` を呼ぶ。
   - 受け入れ条件: 通常の 1 タップ（輪＋音）の応答時間・見た目が変わらない（`mobile-touched.png` が従来と同等）。`?recall=0` で従来と完全に同じ挙動に戻る。
3. **幽霊の台本に休符を 1 つ足す**（`ghost.js`、約 5 行）。`recall=1` のとき、モチーフの後に待ち 1.4 秒の休符を入れて追想が発火する区間を作る。通常の `?demo=1`（`recall` 無し）では従来どおり 6 秒待ちで変更なし。
   - 受け入れ条件: 私の probe `[{"goto":"/?demo=1&recall=1"},{"wait":4500},{"eval":"JSON.stringify({m:document.body.dataset.memory,g:document.body.dataset.recallGen,l:document.body.dataset.recallLast})"},{"shot":"recall"}]` で上記 dataset が埋まり、静止画に幽霊の指の位置と違う場所から広がる弱い輪が写る。
4. **`app/shots.json` は変更しない**（4 枚・wait 合計 4 秒以下を維持）。追想用の画面は今回は足さない。

## やらないこと
- UI の追加（ボタン・文言・アイコン）、GL シェーダー（`wave-gl.js`）の変更、追加の rAF、ライブラリ追加、新しい視覚要素（`echoRing` 相当）。
- 夜光虫・案B（光の帯）・案C（雫の開始演出）。`shots.json` の画面追加・wait 増加。
- `harness/`・`comms/STATE.json`・`comms/LOG.md`・`comms/VISION.md`・ルートの package 系・`.gitignore` の編集。

## 見た目・UX の要求
- 見た目は変えない。追想で起きるのは「弱い輪と小さな音」だけ。音量は常に直前の演奏より小さく、驚かせない。
- デスクトップ 1280×800・スマホ 390×844 の両方で、追想の輪が画面内で自然に見える（座標は記録した位置そのまま）。ミュート時は輪だけが立つ。
- 初回の 3 秒ルール（1 タップで輪＋音）は不変。追想は最後の接触から 6 秒後のみ。

## デモモード
- `?demo=1`（通常撮影用）は従来どおり。追想の確認は `?demo=1&recall=1`。マイク・カメラ不要。ヘッドレスでも `dataset.memory/recallGen/recallLast` で機械的に確認できる。

## 作業役への注意
- 撮影の起動失敗が続くと自動 rollback で成果を失う（c22・c27）。変更は `recall.js` 新規＋`main.js`/`ghost.js` の小さな差分に収め、**終わったら自分で `npm run build` と probe（desktop・mobile 両方）を実行し、起動したプロセスは全て終了させる**。
- REPORT には build 結果、probe の dataset 値、`?recall=0` で従来と同じことを事実として書く。コミットに Claude を貢献者として入れない。
