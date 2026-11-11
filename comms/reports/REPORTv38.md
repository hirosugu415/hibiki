# REPORT v38  (mode: normal)
## やったこと
1. 立ち上がりの再導入（CSSのみ）: 完了。`07072cd` と同内容（`wordmark-in` / `#hint` タイミング短縮 / `bar-in` / `prefers-reduced-motion` で無効化）を `app/src/style.css` に戻した。
2. 「響」の階層: 完了。デスクトップ 36px、`max-width:600px` で 32px、weight 200 のまま、letter-spacing 終点 .14em（開始 .22em）、色の不透明度 .78→.86。text-shadow・位置・`::before` のタップ領域は変更なし。
3. 確認のみ: 完了。`app/shots.json` は未変更。`wordmark-in` の開始状態は opacity .55 / blur 3px。

## ORDER からの逸脱
なし。

## 動作確認
- `cd app && npm run build` 成功。`git diff --stat -- app/` は `app/src/style.css` のみ（+15/-4）。
- probe を単独で mobile / desktop 各 1 回（wait 900 後に撮影）。「響」が従来より大きく、バー・ヒント・石と重ならないことを目視。コンソールエラーの報告なし、blank=false。
- 立ち上がり途中（0.7秒以内）のフレーム自体は確認していない（最終状態のみ）。pointer-events は変更していない。
- 途中で Python の書き込みで改行コードが変わり差分が全行になったが、LF に戻して最小差分に直した。

## デモモード
変更なし（JS 無変更）。今回は `?demo=1` を開いての確認はしていない。

## 既知の問題・妥協点
- 「響」の大きさ向上は 30→36px と控えめ。スコアへの効果は撮影を見ないと不明。
- `#wordmark:hover` は従来どおり .94 の色。

## 変更した主なファイル
- app/src/style.css

## 司令塔への申し送り
- 撮影が healthy なら、次の normal で追想の再開を検討できる。
- 立ち上がりは CSS のみなので、撮影タイミング次第で最初の `home` に途中状態が写る可能性は残る（開始状態は破綻しない範囲に抑えてある）。
