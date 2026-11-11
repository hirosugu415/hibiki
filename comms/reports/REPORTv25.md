# REPORT v25  (mode: normal)
## やったこと
1. 夜光虫の復元 — **完了**。`app/src/glimmer.js` を新規作成（c21 版を読み取り、**音を除いて**書き直し）。`index.html` に `<canvas id="glimmer">`、`style.css` に `#glimmer`（fixed・z-index 1・`mix-blend-mode: screen`・`pointer-events: none`）。desktop 48 / mobile(幅≤600) 32 粒、シード固定、半径 1〜2.5px の鋭い点、明るさ 0.12〜0.55、アクセントを白へ寄せた青白 1 色（暁は暖色になる）。静止時のハロー無し（点灯中だけごく淡いにじみ）。配置は上 96px・下 215px を避け、石の上にも出さない。`wave-gl.js`・状態テクスチャは未変更。
2. 波への応答 — **完了**。`tap()`・泉（`fountainTick`、2 回に 1 回）・離しの輪（`releaseRing`）から `glimmer.hit()`。到達時刻 = 距離 ÷ 波速（`0.68*95*max(viewW,viewH)/420`。石・砂州と同形の式、長辺で割る形）で点灯予約、約 1.2 秒で減衰、外側へ押され臨界減衰ばねで戻る。tap と離しの輪では波面の縁に「点線の光」（輪ごと 12〜18 個）も乗る。
3. `app/shots.json` — **完了**。`echo` を `glimmer-ring`（wait 1200 → clickAt → wait 650）に置換、`touched` の座標を [195,380] に。`hold` は据え置き。
   - 妥協: shots.json は clickAt が固定座標のため、`glimmer-ring` は両幅で画面内の [195,420] 1 つにした（ORDER の desktop [640,400] ではない）。desktop では画面左寄りに輪が出る。

## ORDER からの逸脱
- `glimmer-ring` の clickAt が [195,420]（desktop 専用 [640,400] にしなかった。上記）。それ以外なし。粒の音・新 UI・常時 rAF・`wave-gl.js` 変更は無し。

## 動作確認
- `cd app && npm run build` 成功（JS 39.2kB / gzip 16.2kB）。
- probe（desktop・mobile）: `?demo=1` 1.5 秒の静止画で、水中に鋭い淡い点が多数見え、白飛び・縁付き円盤・雪に見える明るさは無し（`desktop-idle.png` / `mobile-idle.png` を目視）。`dataset.glimmer` = desktop **48**、mobile は probe の出力を直接は読めていない（実装上 幅≤600 で 32。mobile 画面の粒の見た目は確認）。
- タップ 650ms 後（`desktop-ring.png` [640,400]、`mobile-ring.png` [195,420]）: 輪の縁に沿って点が弧状に並んで瞬き、輪そのものは隠れていない。
- `dataset.glints`: mobile で 1 回のタップ＋デモの幽霊の指の打を含め **14**、desktop で **53**（デモの幽霊の打が同時に走っているため、「1 タップあたりの増分」は分離して測っていない。1 回の hit で粒が複数予約される実装なので ≥3 は満たすはずだが、測定値としては未検証）。
- コンソールエラー 0（全 probe）。`?demo=1` を 30 秒放置（暁→夜の切替を含む）: `window error` / `unhandledrejection` / `webglcontextlost` いずれも 0、`glints=389`、`render=webgl2`。
- 暁（`desktop-dawn.png`）: 点は暖色寄りの淡い白で、汚れには見えない。
- rAF: 非デモ `/` を 30 秒放置すると rAF は毎秒約 28〜30 回で**止まらなかった**。ただし夜光虫を外した変更前ビルドでも同じ（毎秒 27〜30 回）で、既存の雨粒・石のさざ波・幽霊の指の `wake()` が常に重なるため。夜光虫は `tick()` 内でしか描画しておらず、独自の rAF は追加していない。「静止中に完全停止すること」自体は今回の環境では確認できなかった。
- shots.json: JSON.parse OK、5 枚、name 一意、`waitFor` 無し、wait 合計 7.97 秒、全 URL に `?demo=1`。

## デモモード
`?demo=1` の幽霊の指の打が `tap()` を通るので、追加演出なしで粒が光り、輪の縁に点線の光が乗る。カメラ・マイク不要。

## 既知の問題・妥協点
- `glimmer-ring` の desktop での輪は左寄り（固定座標のため）。
- 見た目の自己評価: 静止画の「空っぽ感」は減ったが、粒は小さく淡いので、縮小スクショでは微粒子として控えめにしか映らない。汚れには見えない。mobile の ring 画面ではハロー状の薄い円が点線の光として写り、desktop より少し弱い。
- 1 タップ単独での glints 増分は未測定（上記）。mobile の dataset.glimmer の実測値の取りこぼし。
- 粒は `#aura` 側のボケ粒より上、`#bar` / `#hint` / `#wordmark` より下の層（z-index 1）。

## 変更した主なファイル
`app/src/glimmer.js`（新規）、`app/src/main.js`、`app/index.html`、`app/src/style.css`、`app/shots.json`

## 司令塔への申し送り
- 次は粒の音（鈴）か、粒がムードごとに色や量を変える方向が候補。音を足すなら c21 の実装（同時 3 声・音量 1/4 以下）が git 履歴にある。
- 「静止中に rAF が止まる」検証は、非デモで既存の定期 `wake()` が邪魔をする。必要なら次サイクルで検証用に dataset で rAF 稼働状態を出すとよい。
