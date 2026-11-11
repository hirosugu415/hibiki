# ORDER v26  (mode: normal)

## 目的
夜光虫（光の粒）が点灯した瞬間に、ごく小さな鈴の音を返して「触れる → 波 → 光 → 音」を 1 本につなぎ、静止画でも映える撮影（hold）に直す。

## 背景
c25 で `app/src/glimmer.js` が復活し、輪の縁に光の点線が乗るようになった（score 6、ヘルス OK、全 10 枚撮影成功）。今は光だけで音が無く、「綺麗な背景効果」止まり。音の過去実装は `git show a39c921:app/src/glimmer.js`（読み取りのみ。`git checkout` で app を戻すのは禁止。読んで書き直す）。**撮影は shots.json 5 枚・wait 合計 10 秒以下の上限を絶対に守る**（超えると撮影起動失敗が再発する）。

## やること（優先順）
1. **粒の鈴の音。** 点灯が実際に起きた粒のうち一部が、小さな鈴のような短い音を鳴らす（粒の横位置 → 現在のムードの音階の高音域、短い減衰）。既存の `audio.js` の声関数を再利用し、音量は輪の主音の 1/4 以下。
   - 制限（厳守）: 1 回の `hit` で鳴らすのは最大 4 粒、同時 3 声まで、輪の最初の音より必ず遅れて鳴る（最初のタップで 3 秒以内に音が返る既存体験を邪魔しない）。ミュート時は鳴らさず見た目だけ。同じ粒が 0.8 秒以内に連続して鳴らない。
   - 受け入れ条件: `?demo=1` で `document.body.dataset.glintVoices`（鈴を鳴らした累計）が増える。`audio=running` で `glints` が増えるのと同時に `glintVoices` も増え、`glintVoices < glints`（全粒が鳴るわけではない）。コンソールエラー 0。ミュート（`#mute` 相当のボタン）後は `glintVoices` が増えない。
2. **「響」ワードマークの磨き（CSS のみ・小さく）。** 現在 30px / weight 200 / opacity .78。desktop・mobile ともに、サイズ・字間・光彩を微調整して、Apple 製品のロゴ的な落ち着いた存在感にする（例: 少し大きく 32〜34px、アクセントの淡い光彩は維持、タップ領域 44px 以上は維持）。文言・要素の追加は禁止。
   - 受け入れ条件: `desktop-home.png` / `mobile-home.png` で「響」が現状より読みやすく、バー・ヒントとの階層が整っている。位置・タップ挙動は変えない（手紙共有の挙動は既存のまま）。
3. **`app/shots.json` の `hold` を、泉の輪が写る撮影に直す。** 現状は pointerup のあと 900ms 待っていて輪が消えかけの画。`pointerup` 後の最後の wait を 300ms 程度に短縮して、離しの輪が見えるうちに撮影する。wait 合計は元の 10 秒以下のまま（むしろ減る）。
   - 受け入れ条件: JSON.parse OK、5 枚、name 一意、`waitFor` 不使用、wait 合計 10 秒以下、全 URL に `?demo=1`。`desktop-hold.png` に離しの輪が見える。

## やらないこと
- 新しいボタン・文言・バーの変更、`wave-gl.js`・状態テクスチャの変更、常時 rAF の追加、粒のキャラクター化。
- 撮影枚数・待機時間の増加。`harness/`・`comms/STATE.json`・`comms/LOG.md`・`comms/VISION.md`・ルートの package 系の編集。外部通信・新規ライブラリ。
- 粒の数・明るさ上限（0.55）・見た目の変更（c25 の見た目は維持）。

## 見た目・UX の要求
- 鈴は「たまに、きらりと」鳴る程度。うるさく感じたら間引く。ムードごとの音階に従い、不協和にならない。
- 「響」は desktop 1280×800・mobile 390×844 の両方で、セーフエリアに干渉せず粒・バーと重ならない。
- 最初のタップで光の輪と音が 3 秒以内に返る体験は不変。

## デモモード
- `?demo=1` の幽霊の指の打が `tap()` → `glimmer.hit()` を通るので、追加演出なしで鈴が鳴る。probe 例: `[{"goto":"/?demo=1"},{"wait":2500},{"eval":"document.body.dataset.audio+' '+document.body.dataset.glints+' '+document.body.dataset.glintVoices"}]`（audio が running にならない環境では glintVoices が増えなくてよい。その場合は鳴らす関数が呼ばれた回数を別の dataset で確認してよい）。mobile は `--viewport mobile`。

## 作業役への注意
- 失敗しやすい点: 鈴が主音より先に鳴る／同時に鳴りすぎてうるさい／ミュートが効かない／`hit` の度に AudioNode が溜まる（声は終わったら必ず切断）。
- ビルド成功、コンソールエラー 0 を確認してから終える。`?demo=1` で 30 秒放置して例外・`webglcontextlost` が無いことを REPORT に事実として書く。
- REPORT には実行した probe と dataset の実測値（`glints`・`glintVoices` を desktop・mobile 両方）、「響」の before/after の自己評価を事実で書く。誇張しない。コミットに Claude を貢献者として入れない。
