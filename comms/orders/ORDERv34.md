# ORDER v34  (mode: normal)
## 目的
c31〜c33 は公式撮影の起動失敗（app 起因ではない）が続いた。撮影が通ることを最優先に環境を汚さず、**CSS のみ・小さく撤回しやすい** 1 つの磨き（初回表示の上質な「立ち上がり」）だけを入れる。

## 前提（現状）
- app/ は 723bd57 相当（追想 recall は無い）。`app/shots.json` は 3 画面（home / touched / hold）。`#wordmark` は既に 30px・weight 200・字間 .12em で、これ以上の大きさ変更は不要。
- 司令塔の probe（mobile `?demo=1`）で app は健全（render=webgl2, audio=running, コンソールエラー 0）。

## やること（優先順）
1. **環境を汚さない作業手順（最優先・コード変更なし）**。probe / build は **1 本ずつ直列**。作業の最後に、自分が起動した vite / chromium / node / playwright を **全て終了** してから REPORT を書く（他人の常駐プロセスには触らない）。
   - 受け入れ条件: REPORT に、終了させたプロセスの有無を書く。
2. **初回表示の立ち上がり（`app/src/style.css` のみ。JS・wave-gl.js は触らない）**。
   - `#wordmark`: 読み込み直後 `opacity .55 / blur 3px / letter-spacing .2em` から、**0.7 秒以内**に通常（`opacity .78 / blur 0 / .12em`）へ落ち着く `@keyframes`（`ease` は既存 `--ease`）。`animation-fill-mode: both`。
   - `#hint`: wordmark の後 **0.3 秒遅れ**で 0.5 秒かけて下から 6px・opacity 0 → 現在の値へ。**遅延込みで 1.0 秒以内に完了**。
   - 下部のバー（モード切替）: 0.6 秒で下から 8px・opacity 0 → 通常。
   - `@media (prefers-reduced-motion: reduce)` では全て無効（即、通常表示）。
   - 受け入れ条件: `?demo=1` を開いて **1.2 秒後**の `home` スクショで、文字・ヒント・バーが全て通常表示（ぼかし・半透明が残っていない）。0.3 秒時点で撮っても「響」「ヒント」「バー」が**空白にならず**読める（opacity の下限 .5）。デスクトップ 1280×800 / スマホ 390×844 の両方で位置ずれ・レイアウトシフトなし（transform / opacity / filter のみで動かす）。
3. **`app/shots.json` の `home` の wait を 800 → 1300 に**（立ち上がり完了後に撮るため）。wait 合計は 4 秒以下のまま。他の画面は変更しない。
   - 受け入れ条件: shots.json が妥当な JSON・画面数 3。
4. **確認**。`npm run build` 成功 → probe を desktop / mobile で `home`（wait1300→shot）と `touched`（wait600→clickAt[190,400]→wait100→shot）、`hold` 相当を **直列で**実行し、全て ok・blank=false・コンソールエラー 0。生成画像を **実際に開いて** 目視する（home は desktop / mobile の 2 枚以上）。
   - 1 度でも blank や崩れが出たら、`style.css` と `shots.json` の変更を全て元に戻して変更ゼロで終える。

## やらないこと
- 追想（recall）の復活、JS の変更、`wave-gl.js` / `audio.js` の変更、新機能・UI 要素・ボタンの追加、ライブラリ追加。
- `harness/`・`comms/STATE.json`・`comms/LOG.md`・`comms/VISION.md`・ルートの package 系・`.gitignore` の編集。
- probe や撮影の並列起動。

## 見た目・UX の要求
- デスクトップ: 開いて 1 秒以内に、静かに「響」が結像し、ヒントとバーがほぼ同時に整う。動きは小さく、バウンス・強い発光は使わない（Apple 的な静けさ）。
- スマホ 390×844: バーは親指で届く位置のまま、セーフエリアと干渉しない。ヒントとバーが重ならない。
- 3 秒ルール（開いて 3 秒以内の最初のタップで輪と音）は不変。アニメーション中でもタップは即座に効く（`pointer-events` を触らない）。

## デモモード
- `?demo=1`。カメラ・マイク不要。幽霊の指の初動（約 0.8 秒）と立ち上がりが干渉して絵が崩れないこと。

## 作業役への注意
- 公式撮影の起動失敗が 3 サイクル続いている。**変更は style.css と shots.json の 2 ファイルに限定**し、自動 rollback で成果を失わないよう、確認できなければ戻す。
- REPORT には、今のコードで実際に確認した事実（probe の dataset 値、開いて見た画像の内容、終了させたプロセス）を書く。前サイクルの REPORT をコピーしない。コミットに Claude を貢献者として入れない。
