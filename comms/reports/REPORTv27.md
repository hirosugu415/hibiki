# REPORT v27  (mode: repair)
## やったこと
- ORDER 1（shots.json 軽量化）: 完了。4 枚（home / touched / glimmer-ring / hold）に削減、mood-night 削除、全 URL に `?demo=1`、`waitFor` 不使用。
  - node 集計: JSON.parse OK、枚数 4、name 一意 4、wait 合計 **3750ms**（home 1000 / touched 700 / glimmer-ring 1100 / hold 950）。
- ORDER 2（ビルドと健全性）: 完了。コードは触っていない。

## ORDER からの逸脱
なし

## 動作確認
- `cd app && npm run build`: 成功（built in 58ms）。
- probe `/?demo=1`（wait 1200 → shot → eval）:
  - desktop: 全 step ok、blank:false、`dataset.glimmer` = **48**
  - mobile: 全 step ok、blank:false、`dataset.glimmer` = **32**
  - コンソールエラー: 0（出力に error 表記なし）
- `git status`: app/ の差分は `app/shots.json` のみ。

## デモモード
変更なし。`?demo=1` で合成入力により従来どおり動作。

## 既知の問題・妥協点
- c26 の撮影失敗（`browserType.launch: ... closed`）は環境側の不安定と推定され、app 側の原因は特定できていない。今回の軽量化で直るかは次回の撮影結果次第（未検証）。
- mood-night の撮影を外したため、夜モードの公式スクショは当面無い。

## 変更した主なファイル
- app/shots.json

## 司令塔への申し送り
- 撮影が通ったら normal サイクルで、夜光虫点灯時の小さな鈴の音と「響」の存在感調整に進めます。
- 撮影がなお失敗する場合、launch 自体の失敗なので shots の内容ではなくハーネス/環境側の調査が必要（私は harness/ に触れない）。
