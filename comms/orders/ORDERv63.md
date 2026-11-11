# ORDER v63  (mode: repair)
## 目的
app を触らず、ビルド成功だけを確認する。撮影失敗は app の外（ハーネス／環境。残留 chromium が疑わしい）が原因で、app の編集では直らない。

## 背景（証拠）
- c62: `shots/cycle-062/` は build.log のみ。ヘルス NG（browserType.launch が closed）。ビルド成功、コンソールエラー 0。
- 司令塔が probe（mobile）で同じ app を操作 → 全ステップ成功、blank=false、エラー無し。app は壊れていない。
- app/ は c47 の健全な状態。diff は空。

## やること（優先順）
1. `npm run build` を1回だけ実行し、成功を確認する。
   受け入れ条件: REPORT にビルド結果（成功/失敗と出力サイズ）を書く。
2. `git diff --stat -- app` が空であることを確認する。
   受け入れ条件: REPORT に「app/ 無変更」と書く。

## やらないこと
- 新機能、見た目の変更、`app/shots.json` の変更、JS・CSS の編集。
- chromium・playwright・probe・dev サーバーの起動、プロセスの kill、tasklist などの追加調査。
- `harness/`、`comms/STATE.json`、`comms/LOG.md`、`comms/VISION.md`、ルートの package 系、`.gitignore` の編集。

## 見た目・UX の要求
- 変更しない。デスクトップ幅・スマホ幅とも c47 のまま（「響」、ガラスのバー、石、波紋）。

## デモモード
- 変更なし。`?demo=1` で幽霊の指が演奏し、タップ後に波紋が見える。

## 作業役への注意
- 直したくなっても app/ を触らない。触ると健全版を失う。
- build 以外のプロセスを起動しない（残留プロセスを作らない）。
- コミットに Claude を貢献者として入れない。
