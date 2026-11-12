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

## 砂の図形（c25実装, c26で磨き）
- wave-gl.js RENDER 末尾 if(uChl.z>0.001): 3px セル内に丸粒(半径1px,smoothstep,tone 0.6-1.0)。mob=短辺<600px で線細く・量減。波頭 wv=|g|*5 で+0.15明るく・最大1px揺れ。静かな領域: バー(vUv.y)/左上「響」/ヒント(下122px)。
- main.js: PLATE_MODES(PC) と PLATE_MODES_S(短辺<600, 線少なめ)、plateTouch/plateStep。audio.js sand(pan)。
- 調整は shader 内の reach / 輝度0.48 / keep / quiet のみ。
- GLSL 落とし穴: main スコープに pc g gl s 等が既存。名前衝突/ブロック欠落で GL 全滅→render=none（console.warn のみ。probe で dataset.render を eval して確認）。

## 状態フック（document.body.dataset.*）
plate("n,m,量") plateFig audio render mood stones stoneHits stonePush stone bar barChimes echoes echoPending holding holdHz releases letter letterPlay letterVoiced letterShare ambient stoneLaps vessel vesselCall vesselRing glimmer glints（glimmer.js側）

## 撮影・probe
- `app/shots.json` に画面宣言。デモは `/?demo=1`（幽霊の指が自動演奏）。撮影の wait 合計は幅あたり 25s 以下。
- probe: `node harness/tools/probe.mjs steps.json --viewport desktop|mobile`（要 `npm run build`）。steps.json はプロジェクト内に置く。

## 履歴・方針メモ
- スコア c17〜c23 は 7 で横ばい。「細部の質感」はもう効かない → 通常訪問者の画面全体を変える案が必要。
- c27: セル4px・粒半径1.4px(中心はセル内[1.7,2.3])・縁smoothstep(0.2,1)。波頭+0.35(帯内上限0.6)・揺れ1.3px(セル余白内。これ以上はセル境界で欠ける)。shots: hold=pointerdownのみeval(離さない), plate-high=eval で画面比率(0.8W,0.47H)をタップ+待ち600。probe出力先は shots/cycle-027/probe/。
- c26: 粒を丸く・スマホ間引き・波で砂が応える・hold shot 修復(wait4800+waitFor)。
- c25 は案A(砂の図形)を実装。結果は FEEDBACKv25 を見る。touched ショットは待ち1100msに変更。
- 採用済み（再提案不可）: 息の水面・長押し泉・離しの輪・石・砂州+鐘・手紙・ムード・こだま・夜光虫・響の満ち。隅から出す輪は不可。

## 落とし穴
- GL の追加パス・テクスチャ読み取りは避ける（RENDER 内で完結させる）。uK は安定限界 0.5 未満。
- 塗り円盤・強い発光は「泡」に見えて評価が落ちた。縁を持たない低コントラストに。
- Bash の heredoc に日本語＋記号が大量にあると失敗することがある → Write で一旦ファイルにして cat >> で追記。
- IDEAS.md は LF。追記のみ。コミットに Claude/Co-Authored-By を入れない。
- c28(innovation): IDEAS に A砂紋/B忘れていく水/C二点の干渉を提案。推しA。採用されたらc29で実装(砂の変位は±1.5px・畝は密度で)。

## c30 砂=画素ノイズの帯（c29の格子は廃止）
- wave-gl.js 砂ブロック(uChl.z>0.001): 格子ループ無し。各画素で節線距離 dcss(CSS px) → band=exp(-(d/w)^2)、w=2.4px(スマホ1.7)×wf、wf=山0.6/谷1.8(wn=h*SAND_K(50)、h=既読の hs.r。追加読み取り0)。濃さ inten=山1.6/谷0.5。keep=step(nz, band*0.95)、nz=2オクターブのデバイスpx固定ハッシュ(時間で動かない)。集まり s は n2 で時間差。輝度上限0.48。quiet(バー/響/ヒント)は P/cp で同式。
- main.js: dataset.sandHold='1' で砂の図形を保持(plateTouch は figure 変更せず age=0、plateStep は age<=0.5)。撮影専用フック。shots.json drift-*: tap0.25→2.5s→sandHold→tap0.64→early350/late1250/rest5250ms。
- 検証は shots/cycle-0NN/probe の PNG を pngjs(ルート node_modules)で3x切り出して縦に並べると差が見える。
- 履歴: c29 の 2格子粒/変位なしは廃止。sandDrift(main.js)は残存だが未使用に近い。
- python は無い。編集は node -e か Edit。
