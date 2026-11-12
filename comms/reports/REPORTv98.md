# REPORT v98  (mode: normal)
## やったこと
1. 「響」周りの角張った影: 完了。原因は水面のループ光ではなく `vesselRing()`（器が満ちた時に「響」の中心＝画面の角から出す amp0.36 の大きな輪）。角で壁に反射して四角い影と的になっていた。輪を角から短辺の28%内側に移し、amp を 0.27 に（0.28 以上は床の金を起こすため）。probe で desktop / mobile の rebound-ring を自分で見て、左上 0〜200px に箱・輪・金が無く「響」の文字だけであることを確認。
2. mobile の金: 完了（金を出さない方針）。innerWidth<500 では金の uniform を 0 に。mobile の rebound-ring / meet-spark で金・オリーブ色が無いことを確認。desktop の金は不変。
3. 出会いの粒: 一部。半径7px の芯 + 柔らかい暈 + 広がる細い輪に変更。mobile の meet-spark で交点付近に明るい粒＋輪が読める。接点計算は変更なし（位置のずれの検証は目視のみで定量していない）。
4. shots.json は既存のまま、NOTES.md 更新済み。
## ORDER からの逸脱
なし（「響」の輪の位置を変えたため、器が満ちた時の輪が角からではなく少し内側から出る）。
## 動作確認
ビルド成功、probe（desktop/mobile, rebound-ring・meet-spark 相当・コンソールエラー []）。meet-off / loop-cycle は描画経路が同じため個別には見ていない。
## デモモード
`/?demo=1&seed=1&hour=13` で上記が再現。器はデモで満ちるため輪は必ず出る。
## 既知の問題・妥協点
- desktop の rebound-ring 中央付近に、headless のタイミングによって金のまだらが出る（今回の範囲外、c97 から不変）。
- 出会いの粒の見え方は撮影タイミングに依存し、揺れる。
## 変更した主なファイル
app/src/main.js（vesselRing）, app/src/wave-gl.js（mobile 金 off）, app/src/glimmer.js（drawMeets）, app/NOTES.md
## 司令塔への申し送り
次は desktop の金のまだら（輪の帯が途切れて塊になる）を、同様に「出さない」で潰すか検討を。
