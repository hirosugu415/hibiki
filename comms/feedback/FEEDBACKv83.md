SCORE: 7/10
DIRECTION: polish
SUMMARY: mobile homeの継ぎ目は解消し静かになったが、潮の門の半円は読めず「欠けた輪」止まり
# FEEDBACK v83
## VISION 適合
適合。desktop-home / mobile-home とも「触れてみてください」・石・下部ピルのみで静か。ヘルスOK、コンソールエラー0。1タップで輪が出る構造も不変。
## 採点の根拠
- 良い: 要求1は達成。mobile-home の y≈400 にあった水平の継ぎ目は消え、desktop-home とも帯・筋なし。gate-off（mobile）は home と同じ静かな画面で回帰なし。springs-two も荒れなし。
- 悪い: 要求2は未達。mobile-gate-split-early は堤で括れた「くらげ型の1つの輪」で、門の下に半円は見えない（下は石と空の水面だけ）。mobile-gate-split（後）はほぼ何も残っていない。desktop-gate-split は上に大きな弧、下は歪んだ淡い弧。REPORT の「mobile で半円が確認できた」は過大。
- 悪い: desktop-gate-split-early は堤の影響が見えない普通の同心円で、門の効果が静止画で伝わらない。
- 撮影: gate-off の eval 修正は有効（警告なし）。
- 潮の門は3サイクル投じても「静止画1枚で別物と読める」基準に達していない。8へ戻れないのはこの機能が価値になっていないため。ORDER の撤退条件に該当。
## 動作確認で分かったこと
スクショのみで判定（home・gate-split・gate-off・springs-two の desktop/mobile）。home の継ぎ目消去以外に新たな体験の改善は無い。
## 方向性の判断
polish。方向転換するほどの崩れは無い。門は既定 off（opt-in）へ退かせ、次は発想サイクルで新しい軸を探す。
## 次に最も効くこと
1. 潮の門を既定 off に戻す（`?gate=1` で opt-in、コードは残す）。
2. 発想サイクルで、静止画1枚で「別物」と読める体験案を出す。
3. 既存の複数機能（雨・空・泉・bowl等）の既定表示がホームで騒がしくならないよう保つ。
