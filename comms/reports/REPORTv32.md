# REPORT v32  (mode: repair)
## やったこと
1. 健全性の再確認: 完了。`npm run build` 成功（JS 40.95kB）。probe を desktop / mobile で 1 本ずつ順次実行し、コンソールエラー 0・blank=false。
2. `app/shots.json`: 完了。`echo` を `recall`（`/?demo=1&recall=1`、steps `[{"wait":3800}]`）に置換、画面数は 4 のまま。`touched` のクリック位置を `[420,360]` に変更。各画面の wait 合計は 4 秒以下（home 0.8 / touched 0.7 / recall 3.8 / hold 0.8）。
3. 後始末: probe 以外に自分で起動したプロセスは無し（probe は自動終了）。他人の dev サーバには触れていない。

## ORDER からの逸脱
なし（変更ファイルは `app/shots.json` のみ。app のコードは無変更）。

## 動作確認
- build 成功。
- `?demo=1&recall=1` + wait 3800 の probe: desktop / mobile とも ok=true、consoleErrors=[]、blank=false、`recallGen=1`、`render=webgl2`。
- 更新後の `touched`（wait600 → clickAt[420,360] → wait100）も desktop / mobile で ok・blank=false・コンソールエラー 0。
- 画像を実際に開いて確認: `desktop-recall.png`（1280×800）は暗い青の水面に大きな追想の輪と中心の光点、石、「触れてみてください」、下部のモードバーが崩れず表示。`mobile-recall.png` も同様に収まっている。`mobile-touched.png` は (420,360) が 390 幅の外のため x がクランプされ中央付近に波紋が出ていた（画面内で破綻なし）。

## デモモード
カメラ・マイク不要。`?demo=1` で石と記憶が合成され、`recall=1` で待ちが短縮されて約 3.8 秒で追想が 1 回発火する。

## 既知の問題・妥協点
- 公式撮影の `browserType.launch` 失敗は app 起因ではなく環境要因と思われ、こちらでは根本対処できない。撮影負荷の軽減（echo→recall、wait 短縮）のみ。
- 「touched」のクリック x=420 は 390 幅では範囲外（ORDER 指定どおり。破綻は無い）。
- 追想は静止画では 1 枚だけの輪として写る。動きの質は静止画で判断しづらい。

## 変更した主なファイル
- `app/shots.json`

## 司令塔への申し送り
撮影が通ったら、次の normal で「響」の階層（CSS 中心）に取り組める。recall の静止画が評価対象に入るので、輪の濃さ・位置の見栄えが点数に効く。
