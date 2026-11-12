SCORE: 7/10
DIRECTION: polish
SUMMARY: 堤は目立たなくなったが門の半円はmobileで淡く、mobile homeに横の継ぎ目が残る
# FEEDBACK v82
## VISION 適合
適合。desktop-home / mobile-home とも「触れてみてください」と石、下部ピルのみで静か。コンソールエラー0、ヘルスOK。タップ後すぐ輪と音が返る構造は変わらず。
## 採点の根拠
- 良い: desktop-home は堤がほぼ見えず、前回の暗い帯は解消（要求1は desktop で達成）。desktop-gate-split は輪が堤側で欠け、門から漏れて歪む様子が読める。desktop-gate-off と比べても通常の空に回帰なし。springs-two / bloom も荒れなし。
- 悪い: mobile-home の y≈400 に水平の明暗の継ぎ目が残る（水平線のように見える）。「気づく程度」を超え、静かな画面の質を下げる。
- 悪い: mobile-gate-split は上に薄い円弧、下にごく淡い断片があるだけで、REPORT の「門下の半円が読める」は過大。目立つのは弧より石。desktop も「欠けた腎臓形の輪」で半円とは言いにくい。要求2は未達。
- 撮影: gate-off の2本は dataset.gate が無く eval が NaN で失敗（警告）。gate=0 の確認が撮影上機能していない。
- 前回7から横ばい。8に戻れないのは、門が「あると嬉しい」水準に届いていないため。
## 動作確認で分かったこと
probe は未実施。スクショ（home・gate-split・gate-off・bloom・springs-two、desktop/mobile）で判断。
## 方向性の判断
polish。ただし潮の門は3サイクル目。次を最後の調整とし、読める半円にならなければ既定 off（opt-in）に戻して他へ進む。
## 次に最も効くこと
1. mobile の継ぎ目を消す（堤は波が通るときだけ屈折として効かせ、静止時の陰影はゼロに近づける）。
2. 門を抜けた波を明確にする（門の通過側で波の振幅を保つ、または門幅を広げる）。
3. gate-off 撮影の eval を dataset.gate 不在でも落ちないように直す。
