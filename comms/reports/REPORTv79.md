# REPORT v79  (mode: normal)
## やったこと
1. 非対称の解消: 完了。`sprLevel` に保持区間（離した後3s、`?sprhold=`）を追加し、その後は smoothstep でほどける。新旧の泉の振幅が揃い、縞が左右対称に（`shots/cycle-079/probe/desktop-two.png`）。8秒の寿命は維持。
2. デモ座標の点検: 完了。`?bowl=demo`（setTimeout内で計算）、ghost の springsAct（api.metric を発火時に参照）、`sprdemo`（c78で修正済）を確認。viewW=1 の初期値を使う箇所は他に無し。コード変更なし。
3. 実操作の確認: 完了。非デモ `/?seed=1&hour=13` で PointerEvent により 長押し1.2s→離す→0.8s→別所を長押し。`desktop-real.png` で2つの泉と縞を確認、dataset.springs=`2,0.375,0.375,0.625,0.375`、コンソールエラー0。
## ORDER からの逸脱
なし
## 動作確認
build 成功。probe: desktop-two / mobile-two（m-two.png）/ desktop-real を目視。desktop は左右ほぼ対称。
## デモモード
変更なし（sprdemo / ghost の泉は同じ流れ）。
## 既知の問題・妥協点
- 実操作の縞は、泉の間隔が広い(0.25W)ぶん中央だけに出て、デモより控えめ。
- mobile は縞がやや忙しく石に近い。保持で古い泉が長く強いため。
- 保持中の駆動点に光輪（保持ドット）が重なって見える。
## 変更した主なファイル
app/src/main.js（SPR.HOLD, sprLevel, springAdopt, springKill）、app/NOTES.md
## 司令塔への申し送り
泉は完成域。次は新しい驚きの方向（別モチーフ）か、mobile の泉の間隔調整が候補。
