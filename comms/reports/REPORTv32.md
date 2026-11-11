# REPORT v32  (mode: repair)
## やったこと
1. 健全性の再確認: 完了。`cd app && npm run build` 成功（JS 40.95 kB / CSS 7.27 kB）。probe を desktop → mobile の順に 1 本ずつ実行し、どちらも全 step ok・blank=false・consoleErrors=[]。app/ のコードは無変更。
2. `app/shots.json` の `echo` を `recall`（`/?demo=1&recall=1`、steps `[{wait:3800}]`）に置換: 完了。画面数は 4 のまま（home / touched / recall / hold）。各画面の wait 合計は 4 秒以下（home 0.8s、touched 0.7s、recall 3.8s、hold 0.8s）。
   - probe（`/?demo=1&recall=1` を開いて 3800ms 待機）: desktop・mobile とも `recallGen=1`、`render=webgl2`、blank=false、consoleErrors=[]。
3. 後始末: 完了。自分が起動した常駐プロセスは無い（probe は自己終了。tasklist の node.exe / chrome.exe は自分の起動ではないので触っていない。PID 26576 も未接触）。

## ORDER からの逸脱
- `touched` のクリック位置は変更していない（現状 `[190,400]`）。ORDER の `[420,360]` は 390px 幅のスマホでは画面外になるため、「スマホでも画面内」という受け入れ条件を優先した。`(190,400)` は両ビューポートで画面内。

## 動作確認
- build 成功、probe は desktop / mobile ともエラー無し。
- 生成された `shots/cycle-032/probe/desktop-recall.png` と `mobile-recall.png` を実際に開いて確認した。どちらも深い青の水面に、波紋の輪（追想の再生）と石、「触れてみてください」、下部の 凪／夜／暁 ピルが写っており、白画面や崩れは無い。スマホでは輪が少し左上寄りだが、画面内に収まっている。

## デモモード
- `?demo=1` で合成入力が自動演奏し、`&recall=1` で短い 3 音のあとの静けさから追想が約 3.8 秒以内に発火する。カメラ・マイク不要。

## 既知の問題・妥協点
- c31 の撮影失敗（`browserType.launch`）の根本原因は app 側では再現せず、環境の Chromium 起動競合と推測するだけで、断定できない。今回の変更で撮影が通る保証は無い。負荷を下げる狙いの `shots.json` 変更のみ。
- recall 画面の静止画は 1 枚で、追想の「重なり」の動きは写らない。

## 変更した主なファイル
- `app/shots.json`（echo → recall）
- `comms/reports/REPORTv32.md`

## 司令塔への申し送り
- 撮影が通ったら、次の normal で「響」の階層改善（CSS 中心）に進める。
- 撮影失敗が散発している（c22/c27/c28/c29/c31）。ハーネス側で撮影前に残存 chromium を整理するか、起動をリトライすると安定する可能性がある（こちらでは編集不可）。
