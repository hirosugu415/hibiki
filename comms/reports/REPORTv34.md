# REPORT v34  (mode: normal)
## やったこと
1. 径方向の目覚め: 完了。uWakeA/B(打点・波頭半径)を wave-gl.js に追加。波頭(輪と同じ WAVE_SPEED)の内側だけ sandSleep、外は 0.012(眠り)。縁は幅のある smoothstep。2波を保持し、全面に達した波は全面扱い(消えない)。13秒無操作で眠りから広げ直す。`dataset.wakeR`(0〜1、全面後は "1.00+")。
2. 密度: 完了。輝度上限 0.48→0.36(75%)。節線交点(密な結び目)は mobile で最大50%、desktop 15%減光。形・粒の描き方は未変更。
3. idle: 完了。shots.json の idle を `/?q=1` で 1 クリック→14s 待ち→eval で sandSleep/wakeR を出力。
## ORDER からの逸脱
外側の値を「0.05相当」でなく 0.012 にした(0.05 だと mobile の遠い角に格子が薄く見えたため)。
## 動作確認
build OK、probe(mobile/desktop, /?q=1) コンソールエラー 0。mobile-bloom(500ms): 砂線は打点周囲の輪付近のみ、遠い角に格子なし。+2s で広がりが画面上部へ進行。desktop idle: 打後 14s で sandSleep=0.24、砂線ほぼ見えず石と輪のみ。wakeR は 5〜7s 後に 1.00。
## デモモード
`?demo=1` のまま。幽霊の初打(4.5s)で同じ径方向の目覚めが起きる(デモ専用 probe は未実施、/?q=1 の手打ちで確認)。
## 既知の問題・妥協点
- 波頭は CPU 見積もりの輪の速さで、実際の輪の見かけと数十px ずれうる。
- 幽霊が連続で打つと中心が移り 2 波分しか保持しないため、全面到達前は一部領域がゆるく縮む可能性(目視では未確認)。
- idle 画像は「淡い」より「ほぼ無い」(図形が減衰済み)。0.15 への戻りは dataset の値で確認。
- 縁のザラつき・形は未変更。shots.json は整形し直したため差分が大きい(内容は idle のみ変更)。
## 変更した主なファイル
app/src/wave-gl.js, app/src/main.js, app/shots.json, app/NOTES.md
## 司令塔への申し送り
次は desktop-touched/mobile-touched で石が主役かを見てほしい。縁のザラつきが次の弱点。
