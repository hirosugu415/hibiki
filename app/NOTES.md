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

## 砂
- plateTouch/plateStep（PLATE_MODES/_S）。audio.sand。quiet 領域(バー/響/ヒント)は shader の quiet。GLSL: main スコープに pc g gl s があり、`patch` は予約語。衝突で GL 全滅→dataset.render=none。

## 状態フック（document.body.dataset.*）
plate("n,m,量") plateFig audio render mood stones stoneHits stonePush stone bar barChimes echoes echoPending holding holdHz releases letter letterPlay letterVoiced letterShare ambient stoneLaps vessel vesselCall vesselRing glimmer glints（glimmer.js側）

## 撮影・probe
- `app/shots.json` に画面宣言。デモは `/?demo=1`（幽霊の指が自動演奏）。撮影の wait 合計は幅あたり 25s 以下。
- probe: `node harness/tools/probe.mjs steps.json --viewport desktop|mobile`（要 `npm run build`）。steps.json はプロジェクト内に置く。

## 落とし穴
- GL の追加パス・テクスチャ読み取りは避ける（RENDER 内で完結させる）。uK は安定限界 0.5 未満。
- 塗り円盤・強い発光は「泡」に見えて評価が落ちた。縁を持たない低コントラストに。
- Bash の heredoc に日本語＋記号が大量にあると失敗することがある → Write で一旦ファイルにして cat >> で追記。
- IDEAS.md は LF。追記のみ。コミットに Claude/Co-Authored-By を入れない。

## c30 砂=画素ノイズの帯（c29の格子は廃止）
- wave-gl.js 砂ブロック(uChl.z>0.001): 格子ループ無し。各画素で節線距離 dcss(CSS px) → band=exp(-(d/w)^2)、w=2.4px(スマホ1.7)×wf、wf=山0.6/谷1.8(wn=h*SAND_K(50)、h=既読の hs.r。追加読み取り0)。濃さ inten=山1.6/谷0.5。keep=step(nz, band*0.95)、nz=2オクターブのデバイスpx固定ハッシュ(時間で動かない)。集まり s は n2 で時間差。輝度上限0.48。quiet(バー/響/ヒント)は P/cp で同式。
- main.js: dataset.sandHold='1' で砂の図形を保持(plateTouch は figure 変更せず age=0、plateStep は age<=0.5)。撮影専用フック。shots.json drift-*: tap0.25→2.5s→sandHold→tap0.64→early350/late1250/rest5250ms。

## c31 砂の縁と目覚め（wave-gl.js 砂ブロック）
- 縁: keep=smoothstep(nz-0.12,nz+0.12, band*0.95+0.55*core)。core=exp(-(d/(0.5w))^2)*mix(.3,1,s)（芯の下駄）。nz=0.7*n1+0.3*n4(floor(P*0.72) ブロック)。n2 は s の時間差専用に残す。
- 目覚め: env=max(sqrt(h²+6v²), glow*0.5)（読み済みのみ）、awake=mix(SAND_SLEEP(0.35),1,smoothstep(0.006,0.05,env))を br に掛ける。0.0015〜0.016 では波の尾が広く残り差が出なかった（env×40 のデバッグ表示で確認）。
- probe: デフォルトはデモ付きURL。素のURLで使うなら `--url "/?q=1"`。steps に goto は無い。出力は shots/cycle-0NN/（3桁）。steps.json は shots/ 外に置くと散らからない。


## c33 砂の眠り sandSleep（初音）
- wave-gl.js: uniform uSleep（SAND_SLEEP 定数は廃止）、backend.setSleep(v)。main.js: sandWake()(tap内) / stepSleep(dt)(tick内) / hatsune()。dataset.sandSleep/hatsune。
- 遷移: 眠る 0.05（初打の前は砂の図形が無く home に線なし）→ 打で 0.35（上昇 tau0.45s）→ 最後の打から12秒で 0.15 へ（tau3.5s）→ 次の打で 0.35。デモは幽霊が打ち続けるので戻らない（probe --url "/?q=1" で確認）。
- 幽霊(demo)の開始は 4500ms（probe/撮影は読み込み+撮影で home が約2.9s時点になるため）。初音: 初回のみ根音/+2/+4度を 0/.18/.36s（audio.play の delay 引数）、通常の音は鳴らさない。localStorage hibiki.hatsune。
- main.js は CRLF。node で編集するときは 
 を正規化してから置換すること（失敗して無言で無変更になった）。

## c34 径方向の目覚め
- wave-gl.js: uWakeA/uWakeB(vec4: x,y(下が0),r(短辺比),0)、backend.setWake(a,b)。砂の輝度は lit=1-smoothstep(0.45r, r+0.03, 距離/短辺) の内側だけ uSleep、外は 0.012。輝度上限 0.36、節線交点(|gr|小)は star で減光(mob 0.5)。
- main.js: sandWake(x,yTop)/stepWake()。波頭 r=WAVE_SPEED*経過/短辺。2波保持、全面に達した波は wakeAll で全面扱い、13秒無操作でリセット。dataset.wakeR。shots idle は /?q=1 で打って14s待ち sandSleep を eval。

## c35 静けさ
- uCalm(wave-gl.js, setCalm)/main.js stepCalm: 最後の打(wakeLast)から0.4s後に減衰→4sで0.55、wakeAll×0.72、letterPlay×0.8。波エネルギー env 高い所(波頭)は mix(uCalm,1,smoothstep(.02,.1,env))で据え置き。dataset.sandCalm。縁: nz を 0.6 倍に圧縮、keep の smoothstep 幅 .17。
- ヒント: body[data-letter-play=1]/[data-ghost-play=1] で #hint を非表示(CSS, 文言差替中 data-say は除外)。ghostPlayNote() が打・手紙終了から6s保持。style.css は CRLF、main/wave-gl は LF。

## c36 innovation
- app無変更。IDEAS.md に案A共鳴/B深まる水/C石の砂場を追記。推しC（砂の輝度基準を uStoneC への距離にする）。
