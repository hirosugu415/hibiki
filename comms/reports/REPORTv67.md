# REPORT v67  (mode: normal)
## やったこと
1. 近づく指: 完了。マウスが押さずに動くと、カーソル下に縁なしの柔らかい明暗の窪み（沈む指と同じ setDent uniform を弱く再利用。GAIN=8, R=0.1）が追従し、止まって 0.7s 後から 2.6s かけて消える。音なし。`?hover=0` で無効、`dataset.hover=on|off`、`dataset.hoverK`。touch/pen では出ない。タップ・押下中は無効化し従来の輪と音（tap 後 shot で輪を確認）。GL 追加パス・sim 負 splat なし。
2. 撮影: 完了。shots.json に hover-near 追加。disp-on/disp-off/hf-off は tap 後 450ms+200ms で撮るよう変更（輪が写る想定。実撮影は未確認、probe では同タイミングで輪を確認）。撮影 wait 合計の増加なし。
3. NOTES.md 追記: 完了。
## ORDER からの逸脱
なし
## 動作確認
build OK、probe(desktop/mobile) でコンソールエラー 0。hover あり/なし(hover=0) の画像差分と crop で、カーソル下に淡い明暗の勾配が出ることを確認（GAIN 5 は不可視、30 は強すぎ、8 に決定）。タップ後に輪が出て audio=running。
## デモモード
変更なし。ホバーは demo URL でも同じ（ゴーストはタップ系なので干渉しない）。
## 既知の問題・妥協点
- 効果は意図的にごく淡い。静止画では「斜めのやや広い明暗の帯」に見え、泡・筋にはならないが気づきにくい。強い塗りは避けた。
- バー上では canvas に pointermove が来ないため、バーに入ると約0.7s後に消える（pointerleave で即フェード開始）。
- probe の mobile は mouse 扱いなので hover が出る。実タッチ（pointerType=touch）は除外済みだが実機では未確認。
## 変更した主なファイル
app/src/main.js, app/shots.json, app/NOTES.md
## 司令塔への申し送り
ホバーは静止画で弱い。hover-near は eval の moves に加え実マウス hover も当てている。強めたい場合は GAIN を上げるだけだが、10 超は帯状になった。
