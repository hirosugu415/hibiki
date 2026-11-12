# ORDER v46  (mode: normal)
## 目的
「覚える水」を実際の人の演奏でも発火するよう許容を緩め、残っている砂の糸状線を目立たなくして静けさを守る。

## やること
1. **学習許容の緩和**（loop.js の DT_TOL / POS_TOL のみ）: 位置許容 0.08→0.11（短辺比）、間隔許容 ±25%→±40%。ほか条件（3〜6打、2か所以上に散る、打数一致）は維持。
   受け入れ条件: 偽陽性ケース（2打×2、同じ点の3連打×2、全く別位置のフレーズ2つ）は off のまま。同フレーズを間隔を±30%ずらして2度打つと cycle,1/4 に入る（probe の clickAt + wait で再現し、結果を REPORT に記載）。
2. **砂の糸状線を淡く**: 石の周りに残る細い曲線（desktop-loop-end.png、mobile-sandfield-push.png）の不透明度を約 40% 下げ、線幅を均して髪の毛状に見えないようにする。新しい要素は作らない。
   受け入れ条件: shots の desktop-loop-end / desktop-sandfield-push / mobile-sandfield-push で線が背景に溶け、石の影として読める。home は不変。
3. **ワードマーク残光**: 学習の呼吸（#wordmark.learn）終了後、opacity/text-shadow が通常値に戻ることを確認。mobile-home で desktop-home と同じ見え方に。
   受け入れ条件: 呼吸後 3 秒の mobile スクショで ワードマークが通常色。

## やらないこと
- UI 文字・ボタン追加、新機能、ライブラリ追加、残像の見た目の変更、バー変更。

## 見た目・UX の要求
- desktop・mobile とも home の静けさと3秒以内の最初の一打を不変に。周回の音は小さく4周で必ず消える。

## デモモード
- `/?demo=1&seed=1` で loop が off→learned→cycle→off。既存 shots.json の loop-cycle / loop-end を維持。

## 作業役への注意
- 緩和で勝手に鳴る誤検出が最大リスク。迷ったら緩和幅を小さく。壊れたら元の値に戻す。
- NOTES.md の loop 仕様の数値を更新。コンソールエラー0を維持。
