# REPORT v10  (mode: normal)
## やったこと
1. **長押しの泉 — 完了。**
   - `main.js`: 動かさずに 260ms 押し続けると泉。`fountainStart/Tick/Stop`。1 点から輪が湧き続ける（`ripple()` = 既存 `splat()`、振幅 0.2＝単発 0.5 の 0.4 倍、押している間だけ `wake()`）。
     低音（x<0.25）は 340ms 間隔・太め（半径 0.022）、高音（x>0.75）は 230ms 間隔・細め（0.014）。
   - 指を動かすと泉は指に付いてくる（`strokeTo` はそのまま。ref が同じ座標オブジェクト）。動いている間は泉にならず、止まって 260ms で泉になる。260ms 未満のタップは従来どおり。
   - `audio.js`: `voiceHold(freq, bright, pan)`。サステイン（0.22s で立ち上がり保持）＋ 5Hz・±5 cent（約 0.3%）のビブラート、倍音 3 本。`release()` は `setTargetAtTime(τ=0.12)` ＋ 0.62 秒後に osc を `stop`。12 声上限の `voices` に入る（`trim()` 対象）。
   - 止め忘れ対策: `pointerup` / `pointercancel` / `lostpointercapture` / `window blur` / `visibilitychange(hidden)`。泉の再帰 setTimeout も `fountain !== f` で自壊。
   - `dataset.holding` `"0"→"1"→"0"`、保持中のみ `dataset.holdHz`。
   - `ghost.js`: `hold(x,y,ms)` を追加。`?demo=1` の最初のモチーフを 2 音で切り、x≈0.75 で 3 秒の長押し（起動約 4.2〜7.2 秒）。以降は従来のモチーフ。
2. **輪を細く — 完了（一部は別の効き方）。** `EDGE_W` 0.08→0.035（核の輪は髪の毛の細さに）。外側の「太い霞んだ帯」の正体は edge ではなく波そのもの（rim）だったため、打鍵の splat 半径 0.018→0.013 で輪を細く、rim の閾値 0.02→0.006 で薄い尾まで拾うようにした。`desktop-c300.png` の重なりは濁りが減り 2 本の線として読める（v9 比、帯の幅は約半分）。暗いリム自体は完全には消えていない。
3. **余韻 — 完了。** `look[3]`（減衰）calm/dawn 0.9955→0.9974、night 0.9968→0.9979。さらに `STEP_HZ` 180→95（波の進みを約半分に）。理由: 減衰を緩めても波が約 1 秒で画面外へ抜けて消えていたため（時間でなく幾何の問題）。波が水らしくゆっくり進み、実測で約 1.9 秒後（`desktop-d600.png`）にも半径約 280px の細い輪が残る。物理式（h, v の更新）は不変。

## ORDER からの逸脱
- `STEP_HZ` と打鍵 splat 半径、rim 閾値を触った（ORDER は `uDamp` 定数のみ想定）。理由は項目 3 の通り。波の速度が約半分になるので体感が変わる（要評価）。

## 動作確認
- `npm run build` 成功。全 probe でコンソールエラー 0（desktop / mobile / `?fallback=1`）。
- `?demo=1` 5.5 秒: eval `holding=1 holdHz=659.3`（x≈0.75 の音）。3.5 秒後 `holding=0`。スクショ `shots/cycle-010/probe/desktop-demo-hold.png`, `mobile-m-hold.png`（1 点を中心に間隔の揃った同心円 4〜5 本）。
- 人の長押し（PointerEvent 合成）: 低音 x=190 → `holdHz 293.7`、`desktop-low-hold.png`（間隔 約 28px・ゆったり）。高音 x=1050 → `holdHz 784.0`、`desktop-high-hold.png`（約 20px・密）。離す→`holding=0`、`blur`→`holding=0`、再押下→1→`pointerup`→0 を確認。
- `.flash` 本数: WebGL2 で 0。`?fallback=1` でも 0（Canvas2D の flash は tap 時のみ生成で eval 時点では消滅）、`holding=1`、エラー 0。
- rAF 平均（`?demo=1`、3 秒後 120 フレーム）: **34.1ms**。v9 REPORT の値は 30.8〜32.4（この REPORT では v9 を再計測していない）。約 +5〜10%、ヘッドレスのソフト GL でのぶれの範囲。
- スマホ: `canvas` は `touch-action:none`、`contextmenu` 抑止、`user-select:none`（既存）。長押し中のスクロール・拡大・メニューはコード上は起きない（実機未確認）。
- 注意: probe の「wait N ms 後」のスクショは撮影自体に約 0.7 秒かかるため、実際は表記より遅い時刻（例: 300ms 指定≒実測 1.1 秒後）。

## デモモード
`?demo=1` の幽霊の指が起動約 4 秒で長押し（3 秒）。泉は輪を湧かせ、ドットが泉の位置に付く。`shots.json` に `hold`（`/?demo=1`、wait 5500）を追加。既存 7 画面は維持。

## 既知の問題・妥協点
- 波が約 2 倍ゆっくりになった。静かな雰囲気には合うが、「速い連打」の視覚的な歯切れは下がるかもしれない。
- 実測 1.5 秒（打鍵直後起算）の輪は薄く、ヘッドレスでは `c1500` 指定のスクショ（実測約 2.5 秒）では消えている。
- 泉の音のビブラート・サステインの聴感はヘッドレスでは確認できていない（コードとステートのみ）。
- 泉は単一（複数指同時は未対応）。ゴースト泉中に人が触れると泉は止まる。
- 暗い縁の線は残っている。

## 変更した主なファイル
`app/src/main.js`, `app/src/audio.js`, `app/src/ghost.js`, `app/src/wave-gl.js`（EDGE_W / rim 閾値 / STEP_HZ）, `app/src/moods.js`（減衰）, `app/shots.json`

## 司令塔への申し送り
- 泉は「水面に湧く輪」としてそのまま読める。次は複数指、速度→音色、泉の離し際の「余韻の大きな一輪」などが効きそう。
- 波速度の変更が好みに合わなければ `STEP_HZ`（wave-gl.js）を 130〜180 に戻せる。
