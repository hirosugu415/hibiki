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

## c30-31 砂（wave-gl.js 砂ブロック）: 画素ノイズの帯。節線距離 dcss→band=exp(-(d/w)^2)、keep=smoothstep(nz±幅, band*.95+.55*core)。dataset.sandHold='1' で図形保持（撮影用）。probe は `--url "/?q=1"` で素のURL、出力は shots/cycle-0NN/（3桁）、steps に goto 無しだが shots.json には goto 可。

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


## c37 石の砂場（wave-gl.js 砂ブロック）
- halo=(1-smoothstep(1.2R, max(3.2R,短辺28%), 石中心距離CSS px))*has。sleepHere=mix(.012,mix(min(.035,uSleep),uSleep,halo),lit)、env側 mix(.05,1,halo)、br*=mix(1,1.9,halo)。外の残りは 0.07/0.12 だと遠景の線が石周りと同格に見えた→0.035/0.05 で局在。dataset.sandHalo="1,半径比"(main.js pushStone)。shots: sandfield-push（石を eval の pointer 列で押す）。

## c38 石が最前面
- wave-gl.js 砂ブロック末尾: br を soft-clamp(0.4*(1-exp(-br/0.4)))→min .34、石輪郭 dpx で smoothstep(0,6) マスク。star 減光 desktop .3/mobile .7、halo ×1.9 は mobile のみ ×1.3 追加。

## c39 mobile砂の復調・節の滲み
- 滲みの原因は砂 br（br=0 で消えるのを確認。波glowではない）。高次の節(画面中央)で |gr|→0 かつ |f| 小の領域が広がり dcss が小さくなる→塊。dcss を伸ばす案は暗い核+棘になり不可。star=1-smoothstep(0.5, mob?6.5:4.5, |gr|) で br を 1-star*(desktop .3/mobile 1.0) に（形でなく領域を絞る）。
- mobile: halo ×2.3、soft-clamp 0.62、上限 .5。desktop は clamp/上限/halo 不変。probe 用 steps は shots/cycle-39/probe/*.json。


## c41 水面の残像（afterimage.js 新規）
- localStorage 'hibiki.afterimage'={p:[[x,y,vel]..最大14]}（GL読み出しはせず打点版）。main.js tap() 冒頭で record+wash（幽霊の打は DEMO 以外では無視: ghostTap フラグ）。stepCalm で最後の打から>4s に save()、pagehide/visibilitychange でも保存。
- 表示: `<canvas id="afterimage">`(48px幅にグラデ点→CSS blur20px, opacity .22, screen, z1。#aura の前)。起動時に保存あり→shown(1.4sフェードイン)、tap→washing(2.5s)→washed。dataset.afterimage=none/saved/shown/washing/washed。
- `?demo=1&seed=1` は固定 SEED を即表示（フェードなし）。手紙ハッシュ付きURLを再読込すると letterPlay の tap で洗われる（仕様）。probe で再訪確認は eval で `location.replace(pathname+search)`。shots: afterimage-shown/washed。

## c42 直線の筋の正体
- 正体: 砂のクラドニ式 f は x↔y 反対称 → 対角 X=Y(画面 x+y=const の45°)が常に節 → 画面を貫く直線。(NOTES旧: 夜光虫/aura/afterimage ではない。隠して切り分け済み)
- 対策: wave-gl.js 砂ブロック Q の直後で、対角方向に沿って変わる垂直シフト(sin 7ua / 6va)で座標を歪め S 字に曲げた。単純な低周波 warp は平行移動だけで直線が残る(失敗済み)。
- 残像: afterimage.js 色を白側へ20%、R=m*(0.18+0.1v)、alpha1.0、opacity .22 のまま。R を 0.27 以上にすると灰色の霧になり石が沈む。
- probe は shots/cycle-042/（3桁）に出る。mobile の clickAt は x<390。

## c43 髪の毛状の線を抑える（wave-gl.js 砂ブロック）
- 調整値: 歪み 0.042/0.03→0.034/0.024、star smoothstep(0.9, 6.0/7.5)、線幅 w 3.3/2.4(mob)、br 係数 0.4、soft-clamp sc 0.32/0.46、上限 .27/.34(mob)、keep の縁幅 ±0.24、halo 倍率 1.55。細く粒立った断片は「細さ×halo倍率」が原因。
- afterimage.js: 色 = accent*0.78 + 0.11 + 0.11*[.35,.85,.9]（白混ぜ約11%＋青緑寄り）。probe は shots/cycle-043/probe。steps は shots/cycle-43/probe/{push,wash,shown}.json。

## c45 覚える水（loop.js 新規）
- createLoop({play,short,onState,onLearn}).tap(x,y,vel,human)。フレーズ=3〜6打・間隔≤1.5s・全体≤4.6s。直近8s内の前フレーズと一致（位置0.11短辺・間隔±40%(長い方基準)/最小90ms・打数一致・2か所以上に散る）で学習→1.2s後に最大4周(AMPS .35/.26/.17/.09, 周期=全体+1.1s≤6s)→off。human の触れは残り2周＋音量半減、1周目前なら中止。同フレーズ再演で再学習。
- main.js: `memory`(~404)。onDown→memory.tap(..,true)、DEMO の幽霊の打→false。周回の打は quietTap=true で tap(record=false)（残像に触れない）。dataset.loop=off/learned/cycle,k/4。響の呼吸=#wordmark.learn(CSS)。
- ghost.js loopAct: 同じ4打(間600ms)を先頭から4.5s間隔で2度、後22秒待つ。seed=1 は最初の一幕、通常demo は motifN===4。shots: loop-cycle(15s)/loop-end(25s)。probe 検証 steps は shots/cycle-45/probe/{loop,fp}.json（偽陽性: 2打・同点3連打・別フレーズは off）。
- 落とし穴: probe の eval で打を並べるとき、フレーズ長+1.5s 以上待たないと次の run と結合する。

## c46 許容緩和・砂の淡化
- loop.js POS_TOL .11 / DT_TOL .4（|da-db|≤.4*max(da,db)）。probe のタイマーは±100ms揺れる→「±30%」テストは長い方基準でないと落ちる。フレーズ間は 5.5s 以上あける（<GAP+前フレーズ確定で結合する）。steps は shots/cycle-46/probe/{gen.mjs,tol.json}、偽陽性は cycle-45/probe/fp.json。
- 砂(wave-gl.js): br係数.4→.26、sc .2/.3、上限 .17/.21(mob)、線幅差を縮小(wf 0.8–1.4, inten 0.7–1.3)。halo倍率は不変。
- #wordmark.learn は2sで外れ元に戻る(確認済)。'ready'時の青い発光は仕様(呼吸6s周期で見え方が揺れる)。

## c47 砂線の寿命・響の発光
- wave-gl.js: uLife(setLife)。halo = 従来 * uLife * 0.6（halo は 石の砂場の強さ全般を左右）。main.js stepLife(tick内): 石の速さ(画面比/秒)>0.035 で stoneMoveT 更新（pushStone内。累積ドリフト判定は常時発火して失敗済み）、止まってから 2.5s で life=(1-u)^2。dataset.stoneLife。shots: sandfield-push(350ms後)/sandfield-rest(4s後)。
- 「響」: --fill は full かつ wmGlow=false なら 0（home と同じ見え方）。wmGlowSet: onLearn で2s、cycle中は点灯、off で2s後に消灯。.ready の呼吸アニメは廃止。dataset.wmGlow。
- 人手ばらつき probe: shots/cycle-47/probe/gen.mjs → tol.json(desktop)/tolm.json(mobile は縦のずれを短辺比に合わせる; 画面比 .05 だと mobile は .118 で .11 超え→off)。

## c48: innovation サイクル（コード変更なし）。IDEAS に Skim/Petrichor/Letter Relay を提案。
