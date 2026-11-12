# REPORT v23  (mode: normal)
## やったこと
1. 満ちた瞬間の輪 — **完了**。`vesselShow()` で満ち切った瞬間に `vesselRing()`（`#wordmark` の中心を波場座標へ変換 → `ripple(x, y, 0.36, 0.04)`）。追加の音なし、手紙・vessel カウントには記録しない。`dataset.vesselRing` は出すたびに +1（デモでは満ちで 1、押して 2）。
   - 振幅は ORDER の「通常タップ(0.5)の約0.6＝0.3」から **0.36 に強めた**（左上隅は円の 1/4 しか画面内に入らず、0.3 では弱かったため）。半径は 0.04（通常タップ 0.013）。
2. 満ちの色づき — **完了**。`#wordmark::after` の字色を accent 26% → 58% 混色に、親の text-shadow に 0 0 9px の係数 .75→1.1 と、新たに 0 0 3px(accent .7×fill) を追加。字位置・大きさ・フォントは不変。probe の目視では home の白い字に対し、満ちた字は明確に淡い青。白飛びなし。※「約1.5倍」を定量計測してはいない。
3. デモでも「響」を押せる — **完了**。`?demo=1` のときだけ幽霊の打を `letterRec.record`。押すと `shareLetter()`。デモのみ「クリップボード失敗でも」満ちリセット＋輪を出す（`ok || DEMO`）。また押した際に `ghost.retreat()` を呼ぶ（通常タップと同じ挙動。これが無いと押下直後に幽霊が打って vessel が 0.250 になった）。
   - ORDER の probe 結果: desktop / mobile とも `0.000|1|2`。
4. 撮影 — **完了**。`vessel-pressed`（wait 6000+6500、click #wordmark、wait 900）を追加。`vessel-full` は `wait 6000 → waitFor → wait 800` に変更。

## ORDER からの逸脱
- **デモ幽霊の満ちの重みを 1.4 → 2.0 に変更**。1.4 だと満ちるのが約 14 秒後で、ORDER の probe（12.5 秒後に押す）では満ちておらず輪が 1 つしか出なかった（`0.175|1|1`）。2.0 で約 10 秒後に満ち、ORDER の条件を満たす。
- `vessel-full` の steps を変更（`waitFor` の既定タイムアウトが 5 秒のため、先に 6 秒待つ形に。満ち約 10 秒に合わせ、輪が約 0.8 秒の状態を撮る）。
- 輪の振幅 0.36（上記）。

## 動作確認
- `cd app && npm run build` 成功。
- probe（desktop / mobile）で `desktop-pressed` / `mobile-ring1` 等を目視: 満ちた約 0.7 秒後に「響」付近から輪が出る（左上隅なので 1/4 円。淡く、他の輪と同質感）。押した後に別の輪が出て「手紙を渡しました」が表示。
- `?demo=1` を mobile で 60 秒放置: consoleErrors 空、`webglcontextlost` 0 回、`vessel=1.000, vesselRing=1, audio=idle`。
- 行末: main.js / style.css / shots.json は元の CRLF を維持（git diff は変更行のみ。shots.json 19 行、main.js 21 行、style.css 4 行）。
- 作業開始時の git status は `comms/STATE.json` のみ変更（ハーネス由来）。

## デモモード
`?demo=1`: 幽霊が約 10 秒で「響」を満たし、その瞬間に輪が 1 つ（`vesselRing=1`）。「響」を押すと手紙が記録済みなので共有処理が走り（ヘッドレスではクリップボード成功し `letterShare=1`、不可でも `fail` で状態は出る）、満ちが 0 に戻り輪がもう 1 つ（`vesselRing=2`）。

## 既知の問題・妥協点
- 「響」は画面左上隅にあるため、輪は 1/4 円で画面内に広がる。1 枚の静止画では、満ちた直後でも他の幽霊の輪が目立ち、大きな輪が主役とまでは言えない（約 0.7〜1.5 秒の間が最も見える）。
- 押した瞬間の輪は shot の 900ms 後には既に淡く、`desktop-pressed` では隅の弧がかすかに見える程度。
- 通常（非デモ）操作では、クリップボード失敗時は従来どおり満ちをリセットしない・輪も出さない。
- 色づきの「1.5 倍」は目視のみ。

## 変更した主なファイル
`app/src/main.js`, `app/src/style.css`, `app/shots.json`, `comms/reports/REPORTv23.md`

## 司令塔への申し送り
- 隅の 1/4 円を強く見せたいなら、輪を 2 重にする／radius をさらに増やす手があるが、「通知っぽさ」と引き換えなので今回は控えた。
- ghost の `retreat()` は押下で 6.5 秒の休みを入れるため、押した直後の約 6.5 秒は幽霊が静か（デモの撮影には好都合）。
