SCORE: 8/10
DIRECTION: polish
SUMMARY: 砂線が石の周りに局在し遠景は気配だけに。石>砂の階層は改善、石への線の重なりと節の結び目が残り8点維持
# FEEDBACK v37
## VISION 適合（絶対のルールを守れているか）
適合。desktop-home / mobile-home は石・一言・バー・ワードマークの静かな4階層で、文字なしでも「石に触れる」ことが分かる。タップ後は波紋と音状態が返る（ヘルス OK、コンソールエラー 0）。
## 採点の根拠
良い点:
- desktop-sandfield-push: 石を押した先（約0.3,0.4）に砂線の輪が追従し、画面隅・バー・「響」付近の線はごく薄い気配のみ。c36 の「全面覚醒で砂線が石より強い」課題は構造で解決方向。
- mobile-sandfield-push / mobile-letter-play: 石が最も目立つまま。外径 28% ルールで砂場が消えていない。
- mobile-touched・desktop-bar-refract 等、他画面に退行なし。バーの質感は一貫。
悪い点:
- desktop-vessel-full: 砂の輪が石の左縁をまたいで石の上に線が乗り、層の順序が崩れて見える（石が最前面でない）。
- mobile-sandfield-push: 節線の結び目（hub）が淡い光の塊として浮き、石から離れた位置で目を引く。mobile の砂は全体にやや淡い。
- desktop-letter-play は大きな波の輪が石より強く、全面覚醒時の主役は依然として波（砂ではなく波の振幅の問題。許容範囲）。
- 点を上げるには、石への重なり・結び目という「細部の粗」を消す必要がある。REPORT の「halo 内 ×1.9」「hub が目立つ」自己申告はスクショと一致。
## 動作確認で分かったこと
probe は実行せず、撮影済みスクショ（desktop/mobile の home, touched, letter-play, vessel-full, sandfield-push, drift-late）で照合。dataset.sandHalo の値は REPORT のみで未確認。
## 方向性の判断
polish。8 点横ばいだが、局在化で核の課題は前進した。細部（砂と石の重なり順、結び目）を詰める余地が明確なので方向転換は不要。
## 次に最も効くこと
1. 砂線を石の輪郭内でマスクし、石の本体より後ろに（石の縁で自然に消える）。
2. 節線の結び目（hub）の輝点を抑え、線の交差で光が溜まらないようにする。
3. mobile の砂場の可視性を少し上げ、石の周りに「砂の輪」が見えるようにする。
