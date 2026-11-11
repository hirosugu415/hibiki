# ORDER v47  (mode: normal)
## 目的
撮影を1画面に再度絞ってヘルスを green に保ちつつ、バーのタップ領域だけを小さく磨く。

## 背景（証拠）
- c46 で shots.json を1画面にしたところ、一度は desktop/mobile とも撮影成功・healthy=true だった（meta.json 20:21）。
- その後ハーネスが app/ を 1e926807 にロールバックしたため、`app/shots.json` は home / touched / hold の3画面に戻り、再撮影は「browserType.launch: Target page, context or browser has been closed」で screens=[] になった。
- 画面ごとの launch の積み重ねが撮影失敗の原因である可能性が高い。

## やること（優先順）
1. `app/shots.json` の screens を **touched の1画面のみ** にする（url `/?demo=1`、steps は `wait 600` → `clickAt [190,400]` → `wait 100`）。`home` と `hold` を削除する。
   受け入れ条件: 有効な JSON で screens が1件。`git diff --stat` の app/ 配下の変更が shots.json と下記項目2の CSS 以外に無い。
2. 下部ガラスバー（凪/夜/暁/音量）の各ボタンのヒット領域が **44×44px 以上** か、CSS を読んで確認する。足りなければ **CSS のみ** で広げる（見た目の大きさは変えず、padding や min-width/min-height、または疑似要素で当たり判定だけを広げる）。足りていれば何も変えない。
   受け入れ条件: REPORT に各ボタンの実効サイズ（CSS 上の値）を記載。デスクトップ・スマホとも見た目が現状と同じ。JS の変更は無し。
3. `npm run build` を1回だけ実行して成功を確認する。REPORT に結果を書く。

## やらないこと
- 新機能、JS ロジック変更、波・音の挙動変更、新しい画面の追加。
- shots.json の画面を2つ以上に増やすこと（ヘルスが2サイクル連続で green になるまで禁止）。
- chromium・playwright・probe・dev サーバーの起動。他プロセスの終了。
- `harness/`、`comms/STATE.json`、`comms/LOG.md`、`comms/VISION.md`、ルートの package 系、`.gitignore` の編集。

## 見た目・UX の要求
- デスクトップ: 現状維持（「響」、ガラスのバー、石、波紋）。
- スマホ幅 (390×844): バーが親指で押しやすく、はみ出しや重なりが無いこと。見た目は変えない。

## デモモード
- 変更なし。`?demo=1` で幽霊の指が演奏し、撮影の touched で(190,400)のタップ後の波紋が見える。

## 作業役への注意
- shots.json を触ったら必ず JSON の妥当性を確認する。ロールバックされると戻るので、変更は app/ 内で完結させること。
- 直したくなっても項目2以外の app/src は触らない。コミットに Claude を貢献者として入れない。
