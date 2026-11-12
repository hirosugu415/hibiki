# REPORT v39  (mode: normal)
## やったこと
1. 原因特定: 完了。mobile sandfield-push で砂 br を 0 にして撮影 → 中央(190,420)の放射状の塊が消えた。砂の節線距離 dcss 由来（高次の節で |gr|→0、波の glow ではない）。
2. mobile の砂強度: 完了。halo ×1.3→×2.3、soft-clamp 0.4→0.62、上限 0.34→0.5（mobile のみ。desktop 不変）。
3. star 調整: 一部。dcss を伸ばして帯を締める案は暗い核＋棘になり却下。star の範囲を (0.5, mobile 6.5/desktop 4.5) にし、mobile は結び目で減光 1.0、desktop は 0.3 のまま。輝度ではなく結び目の領域側を絞った。
4. 撮影確認: desktop/mobile の letter-play / vessel-full / sandfield-push を probe で撮影し確認。
## ORDER からの逸脱
なし
## 動作確認
build 成功、全 probe でコンソールエラー 0。
- mobile-sandfield-push: 中央の星形の塊は消え、細い線のみ。石の左・上に砂線が残る。
- mobile-letter-play: 中央に淡い放射線とごく薄い滲みがまだ残る（前回より弱い）。石の周りの「輪」と呼べるほどは読めない。
- mobile-vessel-full: 石の周りの砂線が薄く見える程度。破綻なし。
- desktop 3 枚: 前回と同等。交差部は繋がって見える（変化は小さい）。
## デモモード
?demo=1 の幽霊の指で確認。
## 既知の問題・妥協点
- mobile は「石を取り巻く輪が一目で読める」までは未達。節線の幾何しだいで石の周りに線が少ない図形がある。
- 結び目の中心は mobile でちぎれ気味（減光 1.0 のため）。
## 変更した主なファイル
app/src/wave-gl.js, app/NOTES.md
## 司令塔への申し送り
砂の輝度調整は限界。石の周りに輪が必ず見えるには、節線とは別に石中心の同心の砂紋を出すなど設計側の変更が必要。別軸の検討を推奨。
