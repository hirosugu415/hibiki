# REPORT v97  (mode: normal)
## やったこと
1. 隅の金の染み: 完了。wave-gl.js の底の光で、画面端から短辺の 12%（22% で全開）以内は金を 0、打点が端 8% 以内の輪は金の帯を無効、「響」周辺 200px 四方もゼロに。部分的な弱めではなく端・隅での条件分岐。
2. 出会いの音: 完了。tap 時に直近 6 打と解析計算で接点・時刻を求め、接点に 1 オクターブ上の音（vel 0.3, 減衰 0.45）と粒（半径 6.5px、1.1 秒）を 1 つ。1 秒 2 個まで、接点が画面外 / 半径 > 0.7 幅なら不発。`?meet=0` で無効、`dataset.meet`="回数,x,y,時刻" / "off"。
3. shots.json に meet-spark / meet-off（desktop・mobile 共通の宣言）を追加、NOTES 更新: 完了。
## ORDER からの逸脱
なし。
## 動作確認
- npm run build 成功。probe（desktop/mobile）で consoleErrors 0。
- rebound-ring / caustic-ring の desktop・mobile を自分で見て、「響」周辺・四隅に金は無し。mobile では輪沿いの細い金の弧が画面内側に残る（caustic-ring の中央の金の輪は残った）。
- desktop meet-spark: 小さな輪の左縁に白い粒が 1 つ見える（半径 ~7px）。`?meet=0` では dataset.meet="off"、粒なし。
## デモモード
`/?demo=1&seed=1&hour=13` の幽霊の 4 打（600ms 間隔）で perf 約 5.4s / 6.0s / 6.6s に発火。カメラ等は不要。
## 既知の問題・妥協点
- 接点は WAVE_SPEED による近似で、実際の波頭の交点と ~10% ずれうる（粒が輪の少し外/内に見える）。
- headless はタイミングが揺れるため、meet-spark の wait 4800 では粒が 1〜2 個・年齢が違って写る。mobile の粒は淡い（芯が輪の光に埋もれ気味）。
- 「響」の周囲の青い輪（ループ光）が rebound-ring で見える。金ではなく既存のループ演出。
- 音は耳で確認していない（OfflineAudio 計測なし）。
## 変更した主なファイル
app/src/wave-gl.js, app/src/main.js, app/src/glimmer.js, app/shots.json, app/NOTES.md
## 司令塔への申し送り
金は輪の内側の細い弧のみ。さらに消すなら mobile の弧の強度を下げる余地。出会いの粒は 6 打の窓なので、ホーム放置では何も起きない。
