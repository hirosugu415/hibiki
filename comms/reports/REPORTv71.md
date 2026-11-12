# REPORT v71  (mode: normal)
## やったこと
1. 閉じ判定: 完了。main.js gatherTrack（始終点<周長12%・面積>短辺²の3%・周長1.5s以内・クールダウン2s。加えて 4πA/L²≥0.6 と周長≥短辺×0.5 で S字・往復を除外）。
2. 収束演出: 完了。輪上14点から内向きの波→R/c後に中心 splat＋3和音（vel 0.3/0.26/0.22、通常の打以下）。`?gather=0` で検出ごと無効。
3. デモ再現: 完了。ghost.js に円モチーフ（半径=短辺17%、1秒）。`?demo=1&seed=1` で約30〜45s 後に初回発火を確認（desktop）。shots.json に gather-draw / gather-focus / gather-off を追加（非デモURL＋eval で円を描く。clickAt/dragは直線しか描けないため eval）。
4. dataset.gather と NOTES: 完了。
## ORDER からの逸脱
shots は clickAt/drag でなく eval のイベント送出（円は drag で描けない）。
## 動作確認
build OK、コンソールエラー 0（desktop/mobile）。誤検出表（desktop 1280x800, 実時間で pointer 送出, +回数）:
| 軌跡 | 結果 |
|---|---|
| 直線 | +0 |
| S字 | +0 |
| 往復 | +0 |
| 小円(半径 短辺5%) | +0 |
| ゆっくり円(2.2s) | +0 |
| 開いた円弧(75%) | +0 |
| 円 1.0s（半径20%） | +1 |
| 円 1.0s（半径15%） | +1 |
目視: draw 直後は輪が描かれ、+500ms で内側へ波が寄り中心付近に明るい集中、+1500ms で中心に小さな淡い輪が立つ。`?gather=0` では中心に何も立たない。mobile も発火（収束1300ms）。
## デモモード
幽霊が円を描き dataset.gather が 0→1（desktop, seed=1, 45s 時点）。
## 既知の問題・妥協点
- 中心の集中は静止画では「小さな淡い輪」で、強烈ではない（強くすると泡になるので抑えた）。headless は sim が遅く、タイミングは実機より後ろにずれる。
- 石が輪の内側に重なると中心が見づらい（desktop 中央下に石）。
- ページ読み込み直後2秒は負荷で timer が遅れ、速い円でも1.5s超になり不発のことがある。
- デモの初回円は30秒超後（撮影25s内には出ない）。
## 変更した主なファイル
app/src/main.js, app/src/ghost.js, app/shots.json, app/NOTES.md
## 司令塔への申し送り
収束の見え方を強めるなら中心 splat 振幅か輪上 ripple の本数。デモ初回を早めたければ ghost の円スロットを前倒し。
