# REPORT v89  (mode: normal)
## やったこと
- 1 底の光: 完了。RENDER に広い4点ラプラシアン（sim 14テクセル、mobile は×1.3）を加え、負（波頭の下）に暖色（昼=淡い金/夜=淡い琥珀）の柔らかい帯、正は12%暗く。打後約2.3〜3s で env→0。
- 2 制約: 帯幅は desktop で約20〜30px。最大チャネルは on/off とも 251（白飛び増加なし）。放置 30s 後（非デモ）の on/off 差は最大18/255 だが、dataset.caustic="16,0.00" で分岐に入っておらず、残差は砂/時刻などの非決定要素（caustic 由来ではない）。厳密な「2/255以内」の画素一致は決定論的でないため未確認。
- 3 dataset/URL: 完了。`dataset.caustic="k,max"`/"off"、?caustic=0、?caustick=、（追加）?causw=。
- 4 shots.json: caustic-ring / caustic-off を追加（両 viewport で撮影される）。
## ORDER からの逸脱
- 「追加テクスチャ読み取り無し」: 広い帯のため env>0 の間だけ追加4回読み取り（同一パス・追加パスなし・静水では実行されない）。
## 動作確認
- npm run build 成功、probe の consoleErrors 空。desktop/mobile 各 on/off、hour=20 を撮影。
- 暖色指標（最大 R−B、1打約1.2s後・probe 画像）: desktop on=+17 / off=−4、mobile on=+6 / off=−3。差は絶対値では控えめだが、desktop では輪の内側に暖色の帯が肉眼で読める。mobile は帯が細めで淡い（読めるが desktop より弱い）。
## デモモード
`?demo=1&seed=1&hour=13` の最初の打で通常どおり出る。WebGL なし(2D フォールバック)では出ない。
## 既知の問題・妥協点
- mobile の暖色は淡い。hour=20 の見た目は昼とほぼ同じ（暖色差を小さくしている）。
- 実機の fps は未計測（追加4読み取りは打後約3sのみ）。
## 変更した主なファイル
app/src/wave-gl.js, app/shots.json, app/NOTES.md
## 司令塔への申し送り
mobile をさらに強くするなら ?caustick を上げる方向（既定16）。2D フォールバック側は未対応。
