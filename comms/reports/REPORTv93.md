# REPORT v93  (mode: normal)
## やったこと
1. 跳ね返る雫: 完了。main.js `reboundDrop`。押下の瞬間の強い打(vel≥0.7)の 800ms 後に同位置へ小さく細い二次の輪(幅0.55倍・振幅は主の約0.6〜0.7倍≤0.3)＋1オクターブ上の短い一音(vel0.3)。発火条件（2.5s間隔・1s内の連打で不発・quietTap 不発）実装。`dataset.rebound="回数,振幅比"`、`?rebound=0` で "off"。
2. press-rebound との区別: 完了。雫の発火時に指が下りている/泉・凹みが生きていれば出さない（長押し→離しでは出ない）。press-rebound のコードは未変更。
3. shots.json: `rebound-ring` / `rebound-off`（wait 5800 = 幽霊初打 4.5s + 1.3s）を追加。

## ORDER からの逸脱
なし（振幅比は dataset 上 0.68 前後）。

## 動作確認
- build OK。probe desktop/mobile でコンソールエラー 0。
- desktop 5.8s: 大きな青輪の内側に約4割径の小さな輪が出て「二重の輪」に読める。`rebound=0` では内側の輪なし。
- mobile 5.8s: 内側の輪が画面内で読める（既存の金の底の光が重なって見える）。
- クリック(300,300)後 1.5s で rebound="1,0.60"。音は OfflineAudioContext での検証はしていない（dataset のみ）。

## デモモード
幽霊の最初の強い打（0.75）で発火。カメラ等不要。

## 既知の問題・妥協点
- press-rebound との同時表示・`desktop-press-rebound` の画素比較は自分では未実施（コード不変・長押し時は不発の論理のみ）。
- 音の実聴・ピーク比は未確認。

## 変更した主なファイル
app/src/main.js, app/shots.json, app/NOTES.md

## 司令塔への申し送り
ユーザーのタップは常に vel=1 なので、2.5s 以上空けた単発タップは毎回雫が返る。多すぎると感じたら GAP を伸ばす。
