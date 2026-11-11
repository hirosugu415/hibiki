# ORDER v48  (mode: repair)
## 目的
c47 で初めて green になった撮影状態（desktop/mobile とも成功、healthy=true）を壊さずに維持する。新機能は作らない。

## 背景（証拠）
- c47 の meta.json: healthy=true、build ok、consoleErrors=[]、screens は desktop/mobile の touched 各1枚、video-desktop.webm も成功。
- 壊れている症状は現在無い。過去の失敗（c40〜c46）は「撮影の launch 失敗」で、画面数を増やすと再発した。
- ヘルスが2サイクル連続で green になるまでは、画面を増やさない。

## やること（優先順）
1. 現状確認だけを行う。`app/shots.json` の screens が touched の1件のままで、JSON が妥当であることを確認する。
   受け入れ条件: REPORT に「shots.json は1画面・有効」と書く。変更が必要なら最小限にとどめる。
2. `npm run build` を1回だけ実行し、成功を確認する。
   受け入れ条件: REPORT にビルド結果（成功/失敗と出力サイズ）を書く。
3. 何も壊れていなければ、app/ のファイルは **1文字も変更しない**。REPORT と comms/ 配下の記録以外は diff に出さない。
   受け入れ条件: `git diff --stat` の app/ 配下が空。

## やらないこと
- 新機能、見た目の変更、JS・CSS・shots.json の画面追加（home / hold の復活は、2サイクル連続 green の後）。
- chromium・playwright・probe・dev サーバーの起動。他プロセスの終了。
- `harness/`、`comms/STATE.json`、`comms/LOG.md`、`comms/VISION.md`、ルートの package 系、`.gitignore` の編集。

## 見た目・UX の要求
- デスクトップ・スマホ幅とも、c47 のスクショと同じ見た目を保つ（「響」、ガラスのバー、石、波紋）。変更しないことが要求。

## デモモード
- 変更なし。`?demo=1` で幽霊の指が演奏し、touched で (190,400) のタップ後の波紋が見える。

## 作業役への注意
- これは「何もしないことが正解」のサイクル。直したくなっても app/ を触らない。
- 次の normal サイクルでは、2サイクル連続 green を確認できれば、小さな磨き（「響」の起動演出など CSS 中心）を検討する。
- コミットに Claude を貢献者として入れない。
