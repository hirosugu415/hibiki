# ORDER v35  (mode: normal)
## 目的
「数十秒触っても絵と音が変わらない」という最大の弱点に、c30 で一度入った **追想（recall：静けさの間に直近の演奏が弱い輪と小さな音で戻る）** を、小さく確実に復活させて効かせる。

## 前提（現状）
- c34 は撮影が通りヘルス OK、score 6（accepted、コミット ce218a2）。app は 723bd57 系 + 立ち上がり CSS。追想は c32 の自動 rollback（撮影の launch 失敗が原因で、追想自体の不具合ではない）で失われている。
- c30 の実装はそのまま git に残っている: **コミット `a2641c2`**（`git show a2641c2 -- app/src/` で差分を読める。`recall.js` 77 行、`main.js` +23 行、`ghost.js` +9 行）。c30 の撮影はヘルス OK だった。

## やること（優先順）
1. **追想の復活**。`a2641c2` の `app/src/recall.js` と `main.js` / `ghost.js` の差分を、現在のコードに合わせて取り込む（`git show a2641c2:app/src/recall.js > app/src/recall.js` 等。git の履歴操作・reset・checkout は禁止、ファイルの取り込みだけ）。
   - 仕様（c30 と同じ）: 6 秒の静止で直近 3〜6 音が再演。周回ごとに音量が下がり（最大 3 周）、`pointerdown` で即停止、こだま自身の再生音は記憶しない、`document.hidden` では鳴らさない、最大 6 声。輪は既存の `ripple()`、音は既存の `note()` のみ。新しい UI・視覚要素は足さない。
   - 受け入れ条件: `npm run build` 成功。probe（`?demo=1&recall=1`、desktop と mobile を **1 本ずつ直列**）で `document.body.dataset.memory >= 3`、`dataset.recallGen >= 1`、コンソールエラー 0、`dataset.render=webgl2`。タップ直後に `pointerdown` を打つと追想が止まる（`recallGen` が増えない）ことも probe で確認。
2. **撮影に追想を写す（任意の 4 枚目）**。`app/shots.json` に `{"name":"recall","url":"/?demo=1&recall=1","steps":[{"wait":3200}]}` を追加。1 画面の wait は 4 秒以下、既存 3 画面は変更しない。
   - 受け入れ条件: shots.json が妥当な JSON・画面数 4。生成した `recall` 画像を **実際に開き**、幽霊の指の位置ではない場所に弱い輪が見えるか・崩れていないかを REPORT に書く。見えない／不安定なら、この 4 枚目だけ削除して 3 画面に戻す（1 は残す）。
3. **確認**。直列で `home` / `touched` / `hold` / `recall` を desktop・mobile で probe し、全て ok・blank=false・コンソールエラー 0。生成画像を開いて目視（desktop と mobile を各 1 枚以上）。
   - 1 度でも blank・崩れ・エラーが出たら、変更を全て元に戻して変更ゼロで終える（`app/` のみ。履歴は触らない）。

## やらないこと
- `wave-gl.js` / `audio.js` の変更、新ボタン・UI・テキストの追加、ライブラリ追加、追想以外の新機能。
- 立ち上がり CSS（c34）の変更、`#wordmark` の大きさ変更。
- `harness/`・`comms/STATE.json`・`comms/LOG.md`・`comms/VISION.md`・ルートの package 系・`.gitignore` の編集。
- probe・撮影の並列起動。

## 見た目・UX の要求
- デスクトップ・スマホとも、見た目は現状維持（追想の輪は弱く、タップ直後の主役を奪わない。音量は直前の演奏より常に小さい）。
- 3 秒ルール不変: 開いて 3 秒以内の最初のタップで輪と音。追想は最初の演奏の後の静止でのみ動く。

## デモモード
- `?demo=1` は従来どおり幽霊の指が演奏。評価は `?demo=1&recall=1`（待ち 1.2 秒）。`dataset.memory` / `recallGen` / `recallLast` で確認。カメラ・マイク不要。

## 作業役への注意
- 作業の最後に、自分が起動した vite / chromium / node / playwright を全て終了してから REPORT を書く（他人の常駐プロセスには触らない）。REPORT に終了させたプロセスの有無を書く。
- 撮影の launch 失敗が直近 4 サイクル続いた。app が原因ではないが、変更は `app/src/recall.js`・`main.js`・`ghost.js`・`shots.json` に限定し、確認できなければ戻す。
- REPORT は今のコードで実際に確認した事実（probe の dataset 値、開いて見た画像の内容）を書く。前回の REPORT をコピーしない。コミットに Claude を貢献者として入れない。
