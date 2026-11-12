SCORE: 8/10
DIRECTION: polish
SUMMARY: 覚える水は周回の輪が静かに成立し終了後は無地に戻る。砂の糸状線は残り8点維持
# FEEDBACK v45
## VISION 適合
適合。desktop-home / mobile-home は「触れてみてください」と石・ガラスのバーのみで、UI 追加なし。コンソールエラー0、ヘルスOK。
## 採点の根拠
- 良い点: desktop-loop-cycle.png / mobile-loop-cycle.png で、触れていない水面に弱い輪が複数、重なって静かに広がる（新描画要素なし、既存の輪の再利用）。desktop-loop-end.png では輪が消え通常水面に戻る。バー・home のレイアウト不変。偽陽性対策（2打・同点連打・別フレーズは off）の設計は妥当。
- 悪い点: desktop-loop-end.png に石の周囲から広がる細い糸状の曲線（砂の筋）が淡く多数残り、水面の静けさを損なう。mobile-sandfield-push.png も放射状の細線が人工的。mobile-home のワードマークが desktop より青く光って見える（学習の呼吸後の残光の可能性）。
- REPORT との食い違い: 概ね一致。「desktop-end 未確認」は今回自分で確認（輪なし）。
## 動作確認で分かったこと
`?demo=1&seed=1` を probe で実行。終端では loop=off、スクショ非空。途中の learned/cycle 遷移は私の待ち時間の取り方では捉えきれず、cycle 中の画像（上記）と REPORT で代替確認。
## 方向性の判断
polish。8点で横ばいが続くが、今回は新機能が静かに加わり品質は落ちていない。ただし実際の人の演奏では ±25%/0.08 の許容が厳しく、機能が一度も発火しない恐れがあるため緩和が必要。
## 次に最も効くこと
1. loop.js の許容を人の手に合わせ緩和（偽陽性テストは維持）。
2. 砂の糸状線（desktop-loop-end に残る細い曲線）をさらに淡く・太さを均して目立たなくする。
3. mobile のワードマーク残光が home で残らないよう確認。
