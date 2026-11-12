# REPORT v28  (mode: innovation)
## やったこと
- ORDER 1〜3: 完了。`comms/IDEAS.md` 末尾に「Cycle 28 — 提案 (builder)」を追記（既存は無変更）。3 案は領域を分けた。
  - 案A 砂紋（領域1・砂と波）: 粒の位置/密度を波の高さ・勾配で動かし、2 枚の回転格子＋乱数で格子感を壊す。
  - 案B 忘れていく水（領域2・時間）: 前回の演奏が日数に応じて欠け・低く・遠くなって返る（localStorage のみ）。
  - 案C 二点の干渉（領域3・複数の指）: 2 点長押しで干渉縞が立ち、間隔が音程になる。
- 各案に probe の steps・合格条件・dataset 名・mobile での見え方・リスクと退路を記載。
- 推し: 案A。FEEDBACKv27 の 2 弱点（格子感・波への反応が写らない）に直接答え、UI 0、RENDER 約 20 行で 1 サイクルに収まり、同位置 3 枚の静止画（early/late/rest）で機械的に検証できる。変位による欠け（c26）を避けるため「密度で畝を表す」を本命にする。
## ORDER からの逸脱
なし（app/ のコード・shots.json は未変更）。
## 動作確認
実装なしのためビルド・probe は未実施。案の根拠は NOTES・FEEDBACKv27・wave-gl.js/main.js の grep で確認した構造（RENDER が `uState` を読む、`uSplat[16]`、`tap(...,record)`、`echo.js` の非記録再生）に基づく。
## デモモード
変更なし。各案の評価手順は IDEAS.md に（案A: 通常のデモ＋clickAt、案B: `?demo=1&ago=N`、案C: `?demo=1&pair=1`）。
## 既知の問題・妥協点
- 案A の「畝が静止画で見えるか」は実装して初めて分かる。退路（密度のみ）を併記した。
- 案B は評価環境が毎回まっさらなので `ago` 依存。案C はデスクトップで弱い。
## 変更した主なファイル
comms/IDEAS.md（追記）、comms/reports/REPORTv28.md、app/NOTES.md（追記）
## 司令塔への申し送り
c29 で A を採るなら、ORDER に「変位は ±1.5px、畝は密度、同位置 3 枚（early/late/rest）を shots に入れる」を明記すると失敗しにくい。
