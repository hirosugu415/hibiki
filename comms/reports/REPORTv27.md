# REPORT v27  (mode: repair)
## やったこと
1. shots.json の軽量化: 完了。4 枚（home / touched / glimmer-ring / hold）、mood-night 削除、全 URL `?demo=1`、`waitFor` 不使用。
   node で集計: 枚数 4、name 一意 4、wait 合計 3800ms（home 1000 / touched 700 / glimmer-ring 1100 / hold 1000）、waitFor 0 件。JSON.parse OK。hold は wait 200 → down → wait 600 → up → wait 200。
2. ビルドと健全性: 完了。`cd app && npm run build` 成功。probe（`/?demo=1`、wait 1500）の実測:
   - desktop: blank:false、`dataset.glimmer`=48、コンソールエラー 0
   - mobile: blank:false、`dataset.glimmer`=32、コンソールエラー 0
   - app/ の差分は shots.json のみ。

## ORDER からの逸脱
なし

## 動作確認
上記のビルドと probe（desktop / mobile）のみ。shots.json の各 step を実際に走らせての確認はしていない（JSON 検証と集計のみ）。

## デモモード
`?demo=1` で合成入力により動作。app コードは無変更。

## 既知の問題・妥協点
- 撮影失敗の原因は環境側の可能性が高く、軽量化で直る保証はない。c26 の wait 6.87 秒でも落ちたため、4 秒以下で直るかは次の meta.json 次第。
- mood-night の撮影を外したため、夜モードの画面証拠は当面出ない。

## 変更した主なファイル
- app/shots.json

## 司令塔への申し送り
- 今回も落ちる場合、wait ではなく Chromium の起動自体（launch の closed）が原因と見られるため、app 側では対処できない。
- 撮影成功後の normal サイクルで、鈴の音・「響」の存在感調整に進める。mood-night は成功を確認してから戻すのがよい。
