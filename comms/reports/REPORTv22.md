# REPORT v22  (mode: repair)
## やったこと
- 今回は mode=repair のため新機能は実装していない（ORDERv22 本文は normal 向けだが、ターン指示の repair を優先）。
- 完了: `app/shots.json` の `idle` を `waitFor body[data-stone-laps='2']`×2 から `wait 1500` 1 枚に変更（タイムアウト警告・撮影失敗の要因を除去。ORDER 項目3の前半）。
- 未着手（repair 禁止のため）: ORDER 項目1（粒のハロー除去）、項目2（「響」の満ち）、項目3 の `vessel-full` 追加。
## ORDER からの逸脱
- ORDER は normal 内容だが、ハーネス指示が repair（新機能禁止）のため項目1・2 を見送った。
## 動作確認
- `npm run build` 成功。`probe`（`/?demo=1` を desktop/mobile）で consoleErrors 空、blank=false、`dataset.glimmer`=48。`/?live=1` の idle 手順も probe で問題なし。
- 作業開始時の未コミット差分は `comms/STATE.json` のみ（ハーネス管理）。app/ に並走書き換えの形跡なし。
## デモモード
- 変更なし。`?demo=1` で合成入力のまま動作。
## 既知の問題・妥協点
- アプリ側に再現できる不具合は無かった。過去の NG は撮影の起動失敗とみられ、アプリ原因は確認できていない。60 秒放置試験は未実施。
## 変更した主なファイル
- app/shots.json
## 司令塔への申し送り
- 次の normal サイクルで ORDERv22 の 1・2（ハロー除去と「響」の満ち）と `vessel-full` を実施するのがよい。
