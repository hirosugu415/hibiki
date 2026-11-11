# REPORT v23  (mode: repair)
## やったこと
1. 作業開始時の確認: 完了。`git status` は `comms/STATE.json` のみ未コミット変更（ハーネス管理）。`app/` は変更なし。`git log -- app` の最新は abe1a7b（ハーネスの自動ロールバック）。`app/src/` は audio/echo/ghost/letter/main/moods/style/wave-2d/wave-gl で `glimmer.js` は無い（c19 状態）。`npm run build` 成功。
2. `app/shots.json` 軽量化: 完了。画面は 9 枚（home, touched, stone-shadow, echo, mood-night, mood-dawn, hold, bar-refract, letter-play）。`stone-shadow2` / `stone-push` / `calm-after` / `idle` / `letter-share` を削除。`waitFor` は不使用、全 URL に `?demo=1`（letter-play は `/?demo=1#w=...`）。
   - 各画面の wait 合計(ms): 2500 / 1320 / 1650 / 3700 / 1500 / 1500 / 3600 / 2300 / 900。全て 5 秒以下、全体 約 19 秒（30 秒以下）。echo は 6600→2500。
   - hold は、ゴーストの長押し（約 6.5 秒後）を待たず、eval で `#water` に pointerdown→1500ms→pointerup→1500ms を送る方式に変更（押下中 `holding=1`、離しで `releases=1` を probe で確認）。
   - JSON は `JSON.parse` で検証済み、name は一意。
3. 軽さの確認: 完了。`/?demo=1` を操作後 10 秒放置（desktop・mobile）で consoleErrors は空、blank=false。60 秒放置はしていない。app のコードは変更していない。
## ORDER からの逸脱
なし。（hold を eval 方式にしたのは「待機を短く」の趣旨に沿う実装選択。）
## 動作確認
- `npm run build` 成功。
- probe: hold 手順＋10 秒放置を desktop / mobile で実行し、エラー 0、非ブランク。letter-play の URL も probe で letterPlay=1・非ブランクを確認。
- ハーネスの実撮影（healthy=true になるか）は私の側では確認できない。
## デモモード
変更なし。`?demo=1` で幽霊の指が自動演奏し、カメラ等は不要。
## 既知の問題・妥協点
- 撮影の起動失敗（browserType.launch）がアプリ起因でないなら、shots.json の軽量化で直る保証はない。
- letter-play は `?demo=1` を付けたため、probe の dataset では letter が `n=0;len=0` と出た（再生 `letterPlay=1` は動いている）。以前の `/#w=...` と dataset の見え方が違う可能性がある。画面の見た目は非ブランク。
- hold の撮影は幽霊の長押しでなくスクリプトによる長押し。
## 変更した主なファイル
- `app/shots.json` のみ
## 司令塔への申し送り
- healthy=true なら次の normal で夜光虫（鋭い点）を小さく再発行できる。まだ launch 失敗が続くなら、画面数をさらに減らす（例 4〜5 枚）か、環境起因を疑う。
