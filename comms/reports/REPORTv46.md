# REPORT v46  (mode: normal)
## やったこと
1. 学習許容の緩和: 完了。POS_TOL 0.08→0.11、DT_TOL 0.25→0.40。間隔の比較は「長い方」基準（|da-db| ≤ 0.4*max(da,db)）にした（probe のタイマーが ±100ms 揺れ、前の定義だと +30% が実際には落ちたため）。
   - probe 結果: 間隔 ×1.3 + 位置 ±0.03 ずらし → learned（2回とも）、×0.7 → cycle,1/4。
   - 偽陽性（2打×2 / 同点3連打×2 / 別位置フレーズ）はすべて off のまま。同フレーズ再演は cycle に入り、周回中の人の触れで引く動作も従来どおり。
2. 砂の糸状線を淡く: 完了。br 係数 0.4→0.26、soft-clamp/上限を下げ（約40%減）、線幅・強度の振れ幅を縮小して太さを均した。新要素なし。mobile-sandfield-push / desktop の probe で線は背景に溶け、石の影として読める（目視）。home は砂が眠っていて不変。
3. ワードマーク残光: 確認。.learn は 2 秒で外れ opacity は通常へ戻る（mobile で計測）。home の青い発光は「満ちきった ready 状態」の仕様で、6 秒の呼吸位相で見え方が揺れる。コード変更なし。
## ORDER からの逸脱
間隔許容の基準を「長い方」にした（上記理由）。
## 動作確認
build 成功、probe の consoleErrors 空。tol.json / fp.json / sf.json / wm.json（shots/cycle-46/probe）。
## デモモード
`/?demo=1&seed=1` で loop が off→learned→cycle→off（wm.json で cycle,2/4 を確認）。shots.json は変更なし。
## 既知の問題・妥協点
- 線の濃さの数値比較（画素差）はしていない、目視のみ。
- ワードマークの ready 発光と呼吸の差は残る（仕様として据え置き）。
## 変更した主なファイル
app/src/loop.js, app/src/wave-gl.js, app/NOTES.md
## 司令塔への申し送り
実際の人の演奏での発火率は未検証。許容は2段（位置0.11・長い方基準0.4）で止めた。誤検出が見えたら DT_TOL を 0.33 へ。
