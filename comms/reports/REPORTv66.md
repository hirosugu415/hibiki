# REPORT v66  (mode: normal)
## やったこと
1. 発散ガードの実証: 完了。`?guardtest=1`（テスト専用）で uDisp を 0.2 にし、ガードが発火。
   - `?demo=1&guardtest=1`: 20s 時点で `disp="0.03,0,trips1"`、ガード発火後は画面が静まる（shots/cycle-066/probe/desktop-gt-c.png は輪と石だけの通常の絵）。コンソールエラー 0。
   - 初回 trip 後は guardtest 中のみ分散を戻さない（戻すと 8s 後に再び発散するため）。通常 URL では guardtest は無効。
   - 通常 `?demo=1&seed=1&rain=1` で連打30回+ドラッグ+雨、約30s 後: desktop `dispMax 0.125–0.163 / trips0`、mobile `0.080–0.149 / trips0`。
   - 検知を早めるため閾値を 1.0→0.7 に下げた（通常最大 0.16 に対し余裕 4 倍）。
2. ガードのコスト: 完了。間隔 2.5s→5s、かつ画面の上下半分を交互に読む（1回の読み出しが半分）。1回あたり headless で 15–40ms（c65 NOTES）→ 4–19ms、回数は半分。実質コストは約 1/4。代償: 画面全体の検知に最大 10s（発散は clamp ±3 が最後の砦）。mobile 実機は未計測。
3. 高周波強調: 一部。RENDER に 2 階差分（既存 5 回読み取りのまま）を、斜面ゲート付きで加算。`?hf=0` で無効、既定 0.5。home の平均輝度は hf=0 比 +0.8%（38.05→38.35）で ±1% 以内。
   - 効果は控えめ: hf=1 で輪の明るい帯の内側に細い明線が出る程度。ORDER の「二重線」は弱く、深追いせず既定 0.5 に留めた（hf=1 でも筋・泡には見えない）。
4. NOTES.md を 9KB→約 3.7KB に整理: 完了。

## ORDER からの逸脱
ガード閾値 1.0→0.7（検知の早期化）。それ以外なし。

## 動作確認
`npm run build` 成功。probe で guardtest / 通常ストレス（desktop・mobile）/ hf=0,0.12,0.4,1 の拡大 shot / home 輝度を確認。コンソールエラー全て 0。shots.json に `hf-off` を追加（`disp-on` が既定 hf、`hf-off` が hf=0 の比較用）。

## デモモード
変更なし（幽霊の指が自動演奏）。guardtest は `?demo=1&guardtest=1` でも動く。

## 既知の問題・妥協点
- 高周波強調の差は小さく、司令塔の目視でも判別しづらい可能性が高い。headless は波の進みが遅くショットの輪の大きさが揺れるため、hf=0 との比較は輪半径が厳密には揃わない。
- readPixels の mobile 実機コストは未計測。guardtest 発火までは 10–20s かかる（headless で波速が遅いため）。

## 変更した主なファイル
app/src/wave-gl.js, app/shots.json, app/NOTES.md, comms/reports/REPORTv66.md

## 司令塔への申し送り
分散の題材は安全面を固めて閉じてよい。次は水以外（音・触感・時間帯）の仕上げか、ORDER に無い大きな効果が出る描画（輪の屈折の強化など）のほうが費用対効果が高そう。
