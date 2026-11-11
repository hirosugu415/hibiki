# ORDER v38  (mode: normal)
## 目的
第一印象の階層を上げる: 「響」のワードマークに存在感を与え、立ち上がりの動きを CSS だけで小さく入れ直す（6 点の天井を 7 へ押し上げる最小の磨き）。

## 背景（証拠）
- c37 公式撮影は healthy=true、6 枚すべて正常（`shots/cycle-037/`）。app は c34 の見た目で崩れ無し。
- 弱点: `desktop-home.png` / `mobile-home.png` で「響」が小さく細く（30px・weight 200・左上）、画面の主役になれていない。バー・ヒント・水面の立ち上がりが一瞬で、Apple 的な「静かな登場」が無い。
- c34 の立ち上がり CSS（コミット `07072cd`）は、ハーネスの自動ロールバックで消えただけで、app の欠陥ではない。`git show 07072cd -- app/src/style.css` で内容を参照してよい。

## やること（優先順）
1. **立ち上がりの再導入（CSS のみ）**: `07072cd` と同じ内容を `app/src/style.css` に戻す（`#wordmark` の `wordmark-in`、`#hint` のタイミング短縮、`#bar` の `bar-in`、`prefers-reduced-motion` で無効化）。
   受け入れ条件: `npm run build` 成功。ページを開くと、字・ヒント・バーが 0.7 秒以内に静かに現れ、最終状態は現在のスクショと同じ。JS の変更は無し。
2. **「響」の階層を上げる**: `#wordmark` を、デスクトップ 36px・スマホ幅（`max-width: 600px`）32px、weight 200 のまま、`letter-spacing` を終点 .14em に。色の不透明度は .78 → .86。`text-shadow` は現状を維持（光らせすぎない）。位置（左上、セーフエリア対応）と 44px 以上のタップ領域（`::before`）は維持。
   受け入れ条件: desktop・mobile の `home` スクショで「響」が現在より一回り大きく読みやすい。バー・ヒント・石と重ならない。ヒントとの階層（響＞ヒント）が明瞭。
3. **確認のみ**: `npm run build` と、撮影用の `app/shots.json` は **変更しない**（wait 800 などそのまま）。立ち上がり途中で最初の `home` が撮られても破綻しないよう、`wordmark-in` の開始状態は opacity .55・blur 3px 以内にする。

## やらないこと
- 追想（`recall.js`）の再導入、GL シェーダー（`wave-gl.js`）の変更、新しい UI 要素・ボタンの追加、`shots.json` の変更、音の変更。
- `harness/`、`comms/STATE.json`、`comms/LOG.md`、`comms/VISION.md`、ルートの package 系、`.gitignore` の編集。
- 他プロセスの終了。

## 見た目・UX の要求
- デスクトップ幅: 「響」は左上で凛として、水面・石・ガラスのバーの静けさを壊さない。動きは .7 秒以内、イージングは既存の `--ease`。
- スマホ幅 (390×844): 「響」32px でもはみ出さず、ヒント・バーと干渉しない。バーは従来どおり親指で届く。
- 3 秒ルール不変: 開いて 3 秒以内にタップ→輪と音。立ち上がり中のタップも通常どおり反応する（`pointer-events` を変えない）。

## デモモード
- `?demo=1` で幽霊の指が演奏し、静止画でも輪が見える（変更なし）。確認は撮影か probe で `/?demo=1` を開くだけでよい。

## 作業役への注意
- 小さな CSS 差分だけにする。ビルドが通り、`git diff --stat -- app/` が `app/src/style.css` のみであること。
- 公式撮影が走る間は chromium・probe を並行起動しない（二重 builder による launch 競合の疑いが残っている）。probe を使うなら 1 回だけ、単独で。
- 追想の再開は、この ORDER の結果が撮影で healthy になったあとの次の normal 以降。
- REPORT は実際に確認した事実のみ。コミットに Claude を貢献者として入れない。
