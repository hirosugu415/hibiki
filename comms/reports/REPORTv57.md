# REPORT v57  (mode: normal)
## やったこと
1. 時刻→tint 関数: 完了。moods.js hourTint(hour)。朝=青灰(乗算 .85/1/1.2 + 青加算)、昼=恒等、夕=琥珀(R×1.35 B×0.35 + R+.075)、夜=暗い青(×.55〜.78)。ムードの sky に sky*mul+add で掛けるだけ。加算は最大 0.08。
2. 反映先 3 つ: 完了。(a) 上端の空色 (b) 残響 wetLong×k / wetShort×(2-k)、k=夜1.15 / 昼0.85 / 朝1.0 / 夕1.05 (c) 音階中心 夜-2 半音 / 朝-0.5 / 夕-0.7 / 昼0。dataset.hour="時刻,m乗算+a加算,reverbK"、dataset.hourPitch。
3. ?hour= と実時刻: 完了。不正値(abc/99/空)は実時刻、コンソールエラー 0。実時刻は 60 秒に 1 回だけ再計算（補間なし。変化は分あたり極小）。
4. shots.json: 完了。既存 34 画面すべて hour=13 固定、hour-morning/evening/night を追加（desktop/mobile で 6 枚）。
5. NOTES 追記: 完了。
## ORDER からの逸脱
なし
## 動作確認
npm run build 成功。probe(demo seed=1, 9s) hour=6/13/19/1 を desktop/mobile で撮影、consoleErrors 0、render=webgl2。
desktop 上端12% 平均RGB: 6=(20,40,71) 13=(22,38,62) 19=(33,40,48) 1=(17,33,59)。朝は青、夕は R が高く B が低い琥珀寄りで明確に違う。中央〜下(40–90%) 輝度: 6/13/1=50.3、19=49.8（差 1% 未満）。mobile 上端: 6=(24,45,75) 13=(24,44,70) 19=(30,45,64)、中央差 0.3%。hour=13 は tint が恒等で c56 と同一。スクショ: shots/cycle-057/probe/h6-desktop.png と h19-desktop.png。
## デモモード
カメラ等は未使用。?demo=1&seed=1&hour=N で全て動く。
## 既知の問題・妥協点
- mobile は上端帯が小さく、朝(青)と昼の差は小さい（夕は判別可）。desktop の夕はやや茶がかる。
- 残響・音階は dataset と式で確認したのみ（headless で耳では確認不可）。
- 夜ムード×夜の時刻は mul が重なり上端がかなり暗い（上限内）。
## 変更した主なファイル
app/src/moods.js, app/src/main.js, app/src/audio.js, app/shots.json, app/NOTES.md
## 司令塔への申し送り
朝の差が弱ければ mul/add を HOUR_KEYS で調整するだけで済む。1 日を通した見た目の確認には ?hour= を 0〜24 で回すのが早い。
