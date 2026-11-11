# ORDER v67  (mode: repair)
## 目的
app を触らず、ビルド成功だけを確認する。撮影失敗は app の外（ハーネス／環境）が原因。

## 背景（証拠）
- c66: ヘルス NG（撮影処理の失敗: browserType.launch ... closed）。desktop PNG 1枚のみ、screens 空。ビルド成功、コンソールエラー 0、app 無変更。
- 司令塔の probe（mobile, `?demo=1`）で、健全・コンソールエラー無し・`dataset.audio=running` を確認済み。app は壊れていない。

## やること（優先順）
1. `cd app && npm run build` を1回だけ実行し、成功を確認する。
   受け入れ条件: REPORT にビルド結果（成功/失敗と出力サイズ）を書く。
2. `git diff --stat -- app` が空であることを確認する。
   受け入れ条件: REPORT に「app/ 無変更」と書く。

## やらないこと
- 新機能、見た目の変更、`app/shots.json` の変更、JS・CSS の編集。
- chromium・playwright・probe・dev サーバーの起動、プロセスの kill、追加調査。
- `harness/`、`comms/STATE.json`、`comms/LOG.md`、`comms/VISION.md`、ルートの package 系、`.gitignore` の編集。

## 見た目・UX の要求
- 変更しない。デスクトップ幅・スマホ幅とも現状のまま。

## デモモード
- 変更なし。`?demo=1` で幽霊の指が演奏し、タップ後に波紋が見える。

## 作業役への注意
- 直したくなっても app/ を触らない。触ると健全版を失う。
- build 以外のプロセスを起動しない。
- コミットに Claude を貢献者として入れない。
