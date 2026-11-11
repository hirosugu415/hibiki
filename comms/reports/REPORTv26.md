# REPORT v26  (mode: repair)
## やったこと
1. 健全性確認: **完了**。`cd app && npm run build` 成功。probe で `/?demo=1` を desktop・mobile 両方で開き、consoleErrors=[]、blank=false。`document.body.dataset.glimmer` 実測値は **desktop 48 / mobile 32**。
2. 撮影負荷の軽量化（`app/shots.json` のみ）: **完了**。5 枚・name 一意・全 URL に `?demo=1`・`waitFor` 不使用・JSON パース OK。wait 合計 7970ms → **6120ms**。
   - home 1500→1200 / touched 1000→800 + 120 / glimmer-ring 1200→1000 + 650→600 / mood-night 1200→1000 / hold 400→300, 1000→800, 最後の 900→**300**。
3. 起動時の重さ・例外の点検: **完了**。`?demo=1` desktop を 15 秒放置し `error` / `unhandledrejection` / `webglcontextlost`（capture）を監視 → **すべて 0 件**。15 秒後も `dataset.glimmer`=48、blank=false。問題が無かったので app のコードは無変更。
## ORDER からの逸脱
なし
## 動作確認
- build 成功（index js 42.90kB）。
- probe（desktop・mobile）: `/?demo=1` 1.5 秒待ち → エラー 0、真っ白でない、glimmer 48 / 32。
- 15 秒放置 probe: 例外 0 件（上記）。
- 軽量化後の hold の手順（down→800ms→up、holding=1 を確認→300ms→撮影）を probe で再生: `holding=1`、blank=false、エラー 0。
## デモモード
`?demo=1` で合成入力のみで動作（カメラ・マイク不要）。変更なし。
## 既知の問題・妥協点
- c25 撮影失敗の原因は app ではなく撮影プロセス起動の不安定（`browserType.launch` 失敗）と判断。本サイクルでは app が無変更のため、これで次回成功する保証はない。軽量化は過去の実績に基づく対策にとどまる。
- 音が無い・「響」の存在感といった体験面の課題は未対応（repair のため意図的）。
## 変更した主なファイル
- `app/shots.json`（wait のみ短縮）
## 司令塔への申し送り
- それでも撮影起動失敗が続くなら、画面数・待機のさらなる削減よりハーネス側の起動条件（並列度・GPU フラグ）を疑う価値がある。
- 次の normal サイクルでは、粒が点灯する瞬間の小さな鈴の音と、「響」の階層調整を。
