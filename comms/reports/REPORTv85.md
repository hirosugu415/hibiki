# REPORT v85  (mode: normal)
## やったこと
1. 貝殻の生成と表示: 完了。新規 app/src/shell.js（対数螺旋、打順=角度・音高=部屋幅・強さ=隔壁の濃さ・x=色相傾き、決定的）。8打以上+約10秒無操作で一度だけ中央に3.2sで浮上→沈んで消える。新しいタップ/キーで即薄れる。UI追加なし。`?shell=show` で0.3s後に固定12打から発火（消えない）、`?shell=0` は dataset.shell="off" で何も生成しない。dataset.shell="打数,巻き数"（show で "12,2.8"）。
2. 水底の貝殻: 完了。非デモは localStorage `hibiki.shells`（x,y,打配列のみ、最大12）に保存、再訪で最新5個を全面canvasに低opacityで表示（タップで薄れ9s後に復帰）。`?shells=5` で seed 固定の5個、dataset.shells="5"。デモ既定は保存/読込とも無効（0個・現状と同一）。
3. PNG保存: 未着手（#water の長押し泉と衝突するため省略）。
shots.json に `shell-show` と `shells-floor` を独立画面で追加（既存は不変）。
## ORDER からの逸脱
なし（NOTES.md は 3.4KB に圧縮済み）。
## 動作確認
build 成功。probe で desktop/mobile の shell-show / shells-floor を撮影し目視、consoleErrors 0。shell-show は螺旋と部屋の分割（隔壁）が読める。shells-floor は形の違う5個が下半分に散る。`?shell=0` は "off|0|canvasなし"。
## デモモード
カメラ等は不使用。`?shell=show` / `?shells=5` で合成データから描画。
## 既知の問題・妥協点
- 10秒無操作→自然発火の経路（実時間で8打+10s）は probe で通しては確認していない（コードは単純なタイマー）。シミュレートは show のみ。
- shell-show の貝殻は mobile で石の上端にわずかに重なる（石は貝殻の下）。
- 水底の貝殻は輪郭を明るめに残した（隠すより読める方を優先）。5個の形は似た巻き数のため差はやや控えめ。
- 非デモで保存された貝殻の座標は固定スロット+微小ジッタ（石・バーを避けた配置）。
## 変更した主なファイル
app/src/shell.js（新規）、app/src/main.js（import/生成/tap から record の3箇所）、app/shots.json、app/NOTES.md
## 司令塔への申し送り
貝殻は静止画で読める輪郭を優先した。次は実プレイで自然発火の体感（10秒の長さ・沈み方）と水底の濃さの調整が候補。
