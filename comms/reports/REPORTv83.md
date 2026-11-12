# REPORT v83  (mode: normal)
## やったこと
1. 静止時の継ぎ目ゼロ: 完了。wave-gl.js の堤の陰影（col 乗算）を廃止。mobile-home(probe)の y≈400 付近に水平の筋・帯は見えない。堤は波の屈折・反射としてだけ現れる。
2. 半円: 一部〜概ね。門の半幅を拡大(portrait 0.085→0.12S, landscape 0.052→0.075S)、堤内の減衰 GATED 0.04→0.015。mobile gate-split(early 1.0s)で、堤の上に欠けた輪、門の下に門を中心とした半円が見える（下側は上の輪より少し淡い）。desktop は late(約1.8s)で門下に大きな弧が見えるが淡い。1.2s 前後では堤で括れた輪に見え、半円とは言いにくい。
3. 撮影: 完了。gate-off は dataset.gate 不在でも落ちない eval。probe(?gate=0)で value="off"、コンソールエラー0。gate-split/gate-off は early(1.0s)と late(+0.8s)の2枚を撮る。
4. 撤退条件: 発動せず（mobile で半円が確認できたため既定 on を維持）。ただし desktop は淡く、司令塔が読めないと判断するなら ?gate=1 opt-in へ戻してよい。
## ORDER からの逸脱
なし（撮影を2枚にしたのみ）
## 動作確認
npm run build 成功。probe desktop/mobile(?demo=1&seed=1&hour=13&gate=1)・gate=0 でコンソールエラー0。home/gate-split-early/late を目視。
## デモモード
変更なし。デモは既定で門 on、ghost の最初の打は堤の上側。
## 既知の問題・妥協点
headless は fps で sim 速度が揺れ、同じ待ち時間でも半円の見え方が変わる。desktop の下側半円は淡い。「輪の約半分の明るさ」までは定量していない。
## 変更した主なファイル
app/src/wave-gl.js, app/src/main.js(gateGw), app/shots.json, app/NOTES.md
## 司令塔への申し送り
半円が淡いと判断されるなら、潮の門は opt-in に戻して他へ進むのが妥当。
