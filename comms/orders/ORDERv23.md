# ORDER v23  (mode: repair)

## 目的
app を現状のまま（機能追加なし）に保ち、**撮影が最後まで走り healthy=true になる**ことだけを確実にする。

## 症状（引用）
- `shots/cycle-022/meta.json`: `healthy:false` / `reasons: ["撮影処理の失敗: browserType.launch: Target page, context or browser has been closed"]` / `screens: []`。
- ビルド成功（`build.log`）、`console-errors.log` は 0 件。司令塔の probe（desktop/mobile、`/?demo=1`）は全て ok・非ブランク・`render=webgl2`。
- 同じ起動失敗が c19・c20・c22 で出ている。**アプリ側の例外ではない**。ハーネスは `harness/` 配下で編集不可なので、触れる範囲（`app/shots.json` と app の軽さ）だけで負荷を下げる。
- c22 でハーネスが app/ を b62cc52（c19 状態）へロールバックした。**現 app に夜光虫（glimmer）は無い。それで正しい。復元しないこと。**

## やること（優先順）
1. **作業開始時の確認**: `git status`・`git log -3 --stat -- app` を実行し、app が c19 状態（`app/src/` に `glimmer.js` が無い）であることを確認して REPORT に事実だけ書く。`cd app && npm run build` が成功すること。
   - 受け入れ条件: build 成功、`app/src/` に glimmer.js が無い、未コミット差分の事実を記録。
2. **`app/shots.json` を軽量化する（唯一の変更対象）。**
   - 画面は **最大 9 枚**: `home`、`touched`、`stone-shadow`、`echo`、`mood-night`、`mood-dawn`、`hold`、`bar-refract`、`letter-play`（`letter-share` は `letter-play` に統合してよい）。`stone-shadow2`・`stone-push`・`calm-after`・`idle` は削る。
   - 各画面の `wait` 合計は **5 秒以下**、全画面の wait 合計は **30 秒以下**。待機の長い `echo`（6600）は 2500 に、`hold` は押下 1500＋離し後 1500 程度にする。`waitFor` は使わない（`wait` のみ）。
   - 受け入れ条件: JSON が壊れていない（`node -e "JSON.parse(require('fs').readFileSync('app/shots.json'))"`）、各 `name` が一意、`/?demo=1` を全 URL に使用。ハーネスの撮影が完走し `meta.json` の healthy=true、step 警告 0。
3. **app の軽さの確認（変更は不要なら変更しない）。** `probe` で `/?demo=1` を desktop・mobile で 10 秒放置し、コンソールエラー・例外が無いことを確認して REPORT に書く。60 秒放置はやってよいが、結果は事実のみ書く。
   - 受け入れ条件: consoleErrors が空。問題があった場合のみ最小の修正を行い、何を直したか REPORT に書く。

## やらないこと
- 新機能・見た目変更（夜光虫・「響」の満ち・新 UI・新文言）。**mode は repair**。
- `glimmer.js` の復元（936c0bc からの cherry-pick 含む）。これは次の normal で司令塔が改めて指示する。
- `harness/`・`comms/STATE.json`・`comms/LOG.md`・`comms/VISION.md`・ルートの package 系・`.gitignore` の編集。外部通信・新規ライブラリ。

## 見た目・UX の要求
- 変更なし。desktop 1280×800・mobile 390×844 とも現状（左上の「響」、下部の凪／夜／暁ピル、石、輪）を壊さない。

## デモモード
- `?demo=1` で幽霊の指が自動演奏。確認 probe 例: `[{"goto":"/?demo=1"},{"wait":1500},{"shot":"home"},{"clickAt":[300,380]},{"wait":300},{"shot":"touched"},{"eval":"JSON.stringify(document.body.dataset)"}]`。mobile は `--viewport mobile`。

## 作業役への注意
- 過去の失敗は **撮影の起動失敗**で、アプリのバグではなかった。原因を app に探して「修復」の名のもとに機能を足したり壊したりしないこと（c21 の並走書き換えの再発防止）。
- app/src を触らずに済むなら触らない。コミットに Claude を貢献者として入れない。
- ヘルスが healthy=true に戻れば、次サイクルは normal に戻る見込み。そのとき ORDER v22 の「夜光虫を鋭い点で復元」「響の字が満ちる」を小さな単位で再発行する。
