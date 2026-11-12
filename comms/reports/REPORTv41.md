# REPORT v41  (mode: normal)
## やったこと
1. 残像の保存: 完了。GL の toDataURL は使わず、打点（x,y,強さ 最大14個・数百B）を `localStorage['hibiki.afterimage']` に保存（退路版を最初から採用）。最後の打から4秒超の静けさで保存、`dataset.afterimage="saved"`。pagehide/visibilitychange でも保存。try/catch、壊れた値は none。
2. 再訪時表示: 完了。48px 幅の Canvas にムード色のグラデ点を描き、CSS blur 20px・opacity 0.22・screen 合成で水の上/環境光の下に表示（`shown`、1.4s でフェードイン）。最初の tap から 2.5s で opacity 0 → `washed`。保存なしは `none` で現状と同一（#afterimage は opacity 0）。
3. `?demo=1&seed=1`: 完了。固定の7点を即表示。通常 `?demo=1` は幽霊の打も記録・保存（保存/再訪の流れ自体は確認済み）。
4. shots.json: `afterimage-shown` / `afterimage-washed` を追加（desktop・mobile 共通の宣言）。
## ORDER からの逸脱
なし。デモ以外では幽霊の指の自動演奏は残像を洗わず記録もしない（人の打だけ）。
## 動作確認
- build 成功。probe（seed=1、desktop/mobile）: shown→タップ2.8s後 washed、consoleErrors 空。
- 通常URLで打つ→5.2s後 saved→ハッシュなしで再読込→shown→打つ→washed を確認。
- 静止画を自分で見て、汚れではなく水底の淡い光の溜まりに見えることを確認。砂のコードには触れていない。
## デモモード
カメラ不要。seed=1 で再訪状態、通常 demo は幽霊の打を保存。
## 既知の問題・妥協点
- 残像は「絵」ではなく打点由来のぼかした光で、差はさりげない（opacity 上限 0.22 厳守のため）。2枚並置で分かる程度。
- 手紙リンク（ハッシュ）付きで再読込すると、手紙再生の打で残像は洗われる。
## 変更した主なファイル
app/src/afterimage.js（新規）, app/src/main.js, app/index.html, app/src/style.css, app/shots.json, app/NOTES.md
## 司令塔への申し送り
差が弱いと感じたら opacity ではなく点の半径/色（accent の明るさ）で調整するのが安全。次は砂以外の領域で。
