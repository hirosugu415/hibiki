# REPORT v11  (mode: normal)
## やったこと
1. 撮影で泉を証拠化 — 完了。`app/shots.json` の `hold` を `[{"waitFor":"body[data-holding='1']"},{"wait":2200}]` に変更（他 7 画面は維持）。probe で同じ手順を実行し、`shots/cycle-011/probe/desktop-hold-a.png` に約 6〜7 本の同心円、`shots/cycle-011/probe/m/mobile-hold-a.png`（390×844）に約 6 本が写ることを確認。公式撮影（`shots/cycle-011/desktop-hold.png` / `mobile-hold.png`）自体は、この時点ではまだ撮られていないので司令塔側で確認してほしい。
2. 離した瞬間の大きなひと輪 — 完了。`fountainStop(owner, reward)` に `reward` を追加し、`onUp` で `e.type === 'pointerup'` のときだけ `releaseRing()` を呼ぶ。振幅 0.4（泉は 0.2）、半径 泉の 1.5 倍、寿命 6 秒。音は `audio.play` を 1 声、保持音の 1 オクターブ下（200Hz 未満なら同音）。ゴーストの長押し終了（`hold()` 内の `holdEnd(true)`）でも出す。`clear()` からの強制停止は出さない。`body.dataset.releases` に回数を記録。
3. こだま円を水の質感に — 完了（弱めて＋にじませた）。`.echo-ring` を border 2px・不透明度約 6 割・`filter: blur(2.2px)`・芯と影も淡くした。色は `--accent` 経由なのでムードに追従。追加の rAF／シェーダーなし。

## ORDER からの逸脱
なし。

## 動作確認
- `npm run build` 成功。probe のコンソールエラー 0（desktop / mobile）。
- `?demo=1` のゴースト長押し: 泉の最中のスクショ `desktop-hold-a.png`、離した 400ms 後 `desktop-rel-400.png` に、泉の輪より明らかに太く大きい外向きの 1 本の輪（半径約 190px、二重の縁）。1000ms 後 `desktop-rel-1000.png` も確認。eval: `holding=0`、`releases=1`。
- PointerEvent 合成の人の長押し（1.3 秒）: 押下 900ms 後 `holding=1`、離した後 `holding=0`、`releases=1`。短いタップ（150ms）で `releases` は 1 のまま、`pointercancel` で押し続けた後も 1 のまま（`holding=0`）。
- `.flash` 本数: WebGL2 では 0（eval）。
- rAF 120 フレーム（desktop、`?demo=1`、1.5 秒後）: 変更前 4549ms、変更後 3831ms。ヘッドレスのソフトウェア描画でばらつきが大きく（同じビルドでも mobile で 2079ms）、有意な劣化は検出できなかった。厳密な ±10% 判定はできていない。
- 暁・夜のスクショは今回新規には見ていない（CSS は `--accent` 追従のまま）。

## デモモード
起動約 4 秒でゴーストが長押しし、約 3 秒後に離すと大きなひと輪が出る。`?fallback=1` は実機確認せず（`releaseRing` は `ripple` / `audio.play` のみで、2D バックエンドでも例外は出ない構造）。

## 既知の問題・妥協点
- こだま円は依然として円形の輪郭が読める（`desktop-rel-400.png` 左下）。定規線ではなくなったが、波の輪と完全に同質ではない。
- 離した輪の音は短い通常声で、「報い」としては控えめ。
- 公式撮影の `hold` は、遅い環境で waitFor が 5 秒を超えると失敗しうる（通常は約 2.5 秒で成立）。
- `?fallback=1` の目視確認なし。

## 変更した主なファイル
`app/src/main.js`, `app/src/ghost.js`, `app/src/style.css`, `app/shots.json`

## 司令塔への申し送り
- 泉＋離しの輪は成立。次は「速度→音色」か、泉の最中にヒント文言を消すなどの仕上げが効きそう。
- 初画面の空虚さは未対応のまま。
