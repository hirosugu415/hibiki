# app/NOTES.md — 作業役の記憶ノート（c25 更新。4KB以内）

## ファイル（app/src）
- main.js(711行): 全体の司令。ここから読む。
- wave-gl.js(345): WebGL2。`SIM`(波動方程式; R=高さ G=速度 B=光の滲み A=媒質マスク) と `RENDER`(uState を5回読み法線 n → 地色・うねり・鏡面・縁)。`createGL(canvas)` が backend。uniform: uK uDamp uSplat[16] uStone uBar / uDeep uMid uAcc uLook uStoneC uBarC uTime。
- wave-2d.js(44): Canvas2D フォールバック（GL失敗時。`toFallback()`）。
- audio.js(220): `createAudio()`、`dataset.audio` に状態。`voice()` で音。
- echo.js: こだま(5.5s/11s後に再生。再生分は記録しない)。ghost.js: 幽霊の指（MOTIFS、`firstAct` が デモ最初の一幕: 石の手前→横→砂州→石を押す→長押し）。
- glimmer.js(149): 夜光虫（Canvas2D `#glimmer`）。letter.js: 手紙(URL hash=楽譜)。moods.js: 凪/夜/暁の配色。style.css: UI全部。
- index.html: `#water` `#aura`(CSS粒) `#glimmer` `#ghost-dot` `#wordmark`(響) `#hint` `#bar`(ムード3つ+ミュート+手紙?)。

## main.js の要所（grep で場所を引く）
- `wake(ms)`/`tick(now)`: rAF は必要時のみ。石の慣性・砂州の潮(`shoal.phase`)・palette補間→`backend.frame`→`glimmer.frame`。
- `tap(x,yTop,vel,record)`(~275): 輪(ripple)+音(note)+flash。`pushByWave`/`stoneEcho`/`barChime` は「距離÷`WAVE_SPEED()`」の CPU 見積もりで時間差の応答。
- 長押し泉: `fountainStart/Stop`, `releaseRing`。入力: `onDown/onMove/onUp`, `bindCanvas`。
- 手紙: `letterRec`, `letterPlay`, `shareLetter`。響の満ち: `vesselShow/vesselAdd/vesselRing`(~678)。ムード: `selectMood`。

## 砂の図形（c25 実装済み）
- wave-gl.js RENDER 末尾: `uChl`(n,m,量,_) + `uCssPx`。3px セル/2px 粒/解析式 `f`、節距離 dn=|f|/|∇f|/0.012、reach 7→0.7 で集まる。`setPlate(n,m,a,ph)`。
- main.js: `PLATE_MODES`(度数10個→(n,m))、`plateTouch(x,quiet)`(tap と fountainStart から。切替は500ms以上あけ、量を0.12に戻す)、`plateStep(dt)`(tick内。0.7sで1へ、1s後から5sで減衰、泉の間は保持、0で素通り)。audio.js `sand(pan)`。
- 調整は wave-gl.js のシェーダ内 reach / 輝度(0.48) / keep のみ。

## 状態フック（document.body.dataset.*）
plate("n,m,量") plateFig audio render mood stones stoneHits stonePush stone bar barChimes echoes echoPending holding holdHz releases letter letterPlay letterVoiced letterShare ambient stoneLaps vessel vesselCall vesselRing glimmer glints（glimmer.js側）

## 撮影・probe
- `app/shots.json` に画面宣言。デモは `/?demo=1`（幽霊の指が自動演奏）。撮影の wait 合計は幅あたり 25s 以下。
- probe: `node harness/tools/probe.mjs steps.json --viewport desktop|mobile`（要 `npm run build`）。steps.json はプロジェクト内に置く。

## 履歴・方針メモ
- スコア c17〜c23 は 7 で横ばい。「細部の質感」はもう効かない → 通常訪問者の画面全体を変える案が必要。
- c25 は案A(砂の図形)を実装。結果は FEEDBACKv25 を見る。touched ショットは待ち1100msに変更。
- c24 は innovation: 案A 砂の図形(Chladni, RENDERに解析式+uChl)/案B 月の道(uMoon)/案C 水底の譜(pearls.js) を IDEAS.md に提案済み（推しはA）。司令塔の決定は IDEAS.md 末尾「Cycle 24 — 決定」を見る。
- 採用済み（再提案不可）: 息の水面・長押し泉・離しの輪・石・砂州+鐘・手紙・ムード・こだま・夜光虫・響の満ち。隅から出す輪は不可。

## 落とし穴
- GL の追加パス・テクスチャ読み取りは避ける（RENDER 内で完結させる）。uK は安定限界 0.5 未満。
- 塗り円盤・強い発光は「泡」に見えて評価が落ちた。縁を持たない低コントラストに。
- Bash の heredoc に日本語＋記号が大量にあると失敗することがある → Write で一旦ファイルにして cat >> で追記。
- IDEAS.md は LF。追記のみ。コミットに Claude/Co-Authored-By を入れない。
- 未読（要確認）: moods.js の中身、audio.js の voice() 引数、glimmer.js の API (`hit`, `frame`)。
