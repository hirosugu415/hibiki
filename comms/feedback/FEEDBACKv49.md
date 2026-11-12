SCORE: 8/10
DIRECTION: polish
SUMMARY: 雨の輪は既存質感のまま静かに成立。home 不変で回帰なし、clearing の減衰緩和は未実装
# FEEDBACK v49
## VISION 適合（絶対のルールを守れているか）
守れている。desktop-home / mobile-home は c47 と同一（「触れてみてください」・石・ガラスのバー・響のみ）。雨は無操作 40s 以降か `rain=` 指定時のみで、3 秒体験に影響しない。UI・文字の追加なし。
## 採点の根拠
- 良い点: desktop-rain-heavy は 3〜4 個の輪が大小・濃淡を変えて散り、石や文字を覆わない。糸・筋・白飛びなし。desktop-rain-drizzle は 2 個で疎ら、立ち上がりも自然。mobile-rain-heavy も崩れず静か。ヘルス OK、エラー 0。diff は main.js/shots.json/NOTES のみで REPORT と一致。
- 悪い点: 雨の画面は home より水面全体がやや明るく灰青寄りで、輪の周りに小さな粒（ビーズ状の点）が見える（drizzle の輪）。右の輪は中が暗い縁取りで、他の輪と質感がわずかに不揃い。clearing 中の減衰緩和は REPORT どおり未実装。
- 8 点を上げる根拠は無く、維持。
## 動作確認で分かったこと
probe は未実施（スクショと REPORT の dataset 検証で判断）。REPORT の逸脱（ripple()+audio 直呼び）は妥当。
## 方向性の判断
polish。雨は完成に近く、残りは仕上げ（雨あがりの余韻、ムード別の見え方、長時間の安定）。
## 次に最も効くこと
1. clearing 中の減衰緩和の実装（見た目で分かる程度、0.5% 以内）。
2. 夜・暁ムードでの雨の輪の色・明るさの整合確認と調整。
3. rain=1 長時間（120s）で輪数上限・エラー・fps の確認。
