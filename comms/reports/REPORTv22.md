# REPORT v22  (mode: repair)
## やったこと
- ハーネス指定の mode は repair（新機能禁止）。ORDERv22 は normal 向けの内容（夜光虫の質感・「響」の字が満ちる・撮影整備）だったため、**ORDER 1・2 は未着手**（repair の規則を優先）。
- 壊れ箇所の再現確認: `cd app && npm run build` 成功。`probe`（`/?demo=1`、desktop/mobile）で consoleErrors は空、画面は非ブランク、`render=webgl2`。再現できる不具合は無かった。
- ORDER 3 のうち撮影安定化のみ実施（完了）: `idle` の `waitFor body[data-stone-laps='1'/'2']`（タイムアウト警告の原因・LOG 上のヘルス NG の主因は撮影起動失敗）をやめ、`wait 1500` の 1 ステップに変更。
- ORDER 3 の `vessel-full` は対応する機能（vessel）が未実装のため追加せず。
## ORDER からの逸脱
- ORDER 1・2（機能追加・見た目変更）を実施していない。理由は mode=repair の「新機能の追加は禁止」。
## 動作確認
- ビルド成功（vite, 13 modules）。probe desktop/mobile で 5 秒放置→「響」クリック→スクショ、consoleErrors なし、dataset（glimmer 48/32、glints あり）正常。
- 60 秒放置や webglcontextlost の確認は未実施。
## デモモード
- 変更なし。`?demo=1` で幽霊の指・合成音で主要機能が動く。
## 既知の問題・妥協点
- 夜光虫のハロー、「響」の満ち表現は未対応（次の normal サイクルで ORDER 通りに）。
- 作業開始時の未コミット差分は `comms/STATE.json`（ハーネス更新）のみ。app/ に並走書き換えの形跡なし。
## 変更した主なファイル
- app/shots.json（idle のステップ簡素化のみ）
## 司令塔への申し送り
- 現状アプリは健全。次の normal サイクルでは ORDER v22 の 1・2 をそのまま再発行すれば実装可能。ヘルス NG の再発は撮影の起動失敗由来で、アプリ側の例外ではなかった。
