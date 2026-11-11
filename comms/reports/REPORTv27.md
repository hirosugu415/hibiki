# REPORT v27  (mode: repair)
## やったこと
1. shots.json の軽量化: 完了（ただし下記「重要な状況」参照）。4 枚（home / touched / echo / hold）、mood-night 削除、全 URL `?demo=1`、`waitFor` 不使用。
   node 集計: 枚数 4、name 一意 4、wait 合計 4000ms（home 1000 / touched 700 / echo 1300 / hold 1000）、waitFor 0 件、JSON.parse OK。
2. ビルドと健全性: 完了。`cd app && npm run build` 成功。probe `/?demo=1`（wait 1500）: desktop・mobile とも blank:false、consoleErrors 0。hold 操作（mobile）で `dataset.holding`=1。

## 重要な状況（ORDER との食い違い）
作業の途中でハーネスが「修復に 3 サイクル失敗した」として `app/` を最後に健全だった状態（4ab8dbd2）へ自動ロールバックした（LOG 参照）。
その結果、ORDER が前提とする夜光虫（glimmer）関連コード（glimmer.js 等）は app/ から消えており、`dataset.glimmer` は存在しない（実測: 'none'）。
ORDER の「desktop 48 / mobile 32」は現状では測れない。また「glimmer-ring」画面も存在しないため、ロールバック後の app に実在する `echo` 画面を 4 枚目として採用した。
先に書いた shots.json（glimmer-ring 入り）はロールバックで上書きされたため、現行 app 向けに作り直した。

## ORDER からの逸脱
- glimmer-ring を echo に置換（対象機能がロールバックで消えたため）。
- `dataset.glimmer` の実測値は記載不可（'none'）。ロールバック前の同日実測は desktop=48 / mobile=32 だった。

## 動作確認
ビルド成功。probe で desktop / mobile の home を開き blank:false・consoleErrors []。hold を mobile で確認。shots.json の全 step の通し実行まではしていない。

## デモモード
`?demo=1` で合成入力により動作。app コードは変更していない。

## 既知の問題・妥協点
- 撮影失敗は環境起因の疑いが強く、軽量化で直る保証はない。
- ロールバックにより夜光虫機能が失われている。復活させるかは司令塔判断（normal サイクルで再実装が必要）。
- mood-night の撮影は外した。

## 変更した主なファイル
- app/shots.json

## 司令塔への申し送り
- app/ が 4ab8dbd2 相当に戻っている点を前提に次の ORDER を。glimmer 系の指示はそのままでは適用できない。
- 撮影が通ったことを meta.json で確認してから機能追加へ。
