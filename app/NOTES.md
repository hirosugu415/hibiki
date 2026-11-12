# app/NOTES.md — 作業役の記憶ノート（c52 圧縮。旧版は git 履歴）

## ファイル（app/src）
- main.js(~960行, LF。c53のEOL事故はc54で修復): 司令。`wake/tick`(rAF必要時のみ)、`tap(x,yTop,vel,record)`(輪+音+flash)、`pushByWave/stoneEcho/barChime`(距離÷WAVE_SPEED の CPU 見積り)、長押し泉 `fountainStart/Stop`、入力 `onDown/onMove/onUp/bindCanvas`、手紙 `letterRec/letterPlay/shareLetter`、響の満ち `vessel*`、`selectMood`、`memory`(覚える水)、雨ブロック `rainStep/rainDrop`。
- wave-gl.js(LF): WebGL2。SIM(波動方程式 R高さ G速度 B光 A媒質) と RENDER(法線→地色・鏡面・縁・砂)。uniform: uK uDamp uSplat[16] uStone uBar uLook uSleep uWake uCalm uLife 等。wave-2d.js=Canvas2Dフォールバック。
- audio.js: `createAudio()`、`voice(freq,bright,vel,pan,decay,level)`=3倍音サイン+lowpass+panner→共通bus(convS/convL 残響)。dataset.audio。
- echo.js(こだま) ghost.js(幽霊の指 MOTIFS/firstAct/loopAct) glimmer.js(夜光虫) letter.js(URL hash=楽譜) moods.js(凪/夜/暁) loop.js(覚える水) afterimage.js(残像) style.css(LF)。
- index.html: #water #aura(CSS粒,13s呼吸) #glimmer #afterimage #ghost-dot #wordmark(響) #hint #bar。

## 機能の要点
- 砂(Chladni, wave-gl 砂ブロック): 節線帯。sandSleep/wake/calm/life で明るさ制御。対角直線の筋は Q 後の歪みで曲げ済(c42)。節の滲み・髪の毛線は br係数/上限/線幅で抑制済(c39/c43/c46)。
- 石の砂場 halo、石が最前面(c37/38)。残像: localStorage hibiki.afterimage、dataset.afterimage。
- 覚える水: 3〜6打・同位置(0.11短辺)・間隔±40% を2度→最大4周を quietTap(record=false)で。dataset.loop。フレーズ間は5.5s以上あける。
- 雨(c49-50): 無操作40s未満0。dataset.rain/weather(dry|drizzle|rain|clearing)/clearK/rainLive。`?demo=1&seed=1&rain=0.3|1`。雨とhomeの背景輝度差は±4%以内(c51; 差に見えるのは#aura位相)。

- 空の映り込み(c53): wave-gl RENDER の vignette 直前、sy=uv.y/q.y+n.y の勾配×フレネルで上端 ~20%(短辺比)に uSkyC(moods.js の sky 色, PKEYS 経由でムード補間)を加算。uSky=(強さ,帯高,指数)。石の上は ×0.15。?sky=0 で無し(SKY_K)。dataset.sky=mood,強さ,地平y。線・円盤なし。強さは moods.js の色の大きさで調整(夜は極弱)。

- 空の波打ち(c54): sy の法線項を±0.25に(局所)、vignette の y 係数は上端で1.15→0.98、uSky強度×0.9。
- 奥行きの音(c54,c55確認): audio.voice の末尾引数 depth(=1-yTop。note()と長押し泉のみ)。lp=max(lp0*(1-.45d), min(lp0,2000))、rvSend 0.4d、音量1-0.2d(最大-1.8dB)。dataset.depth="d,wet,lp"。headless の eval は他の音(depth0)に上書きされるので式を node で計算して確認。
- 右上の持ち上げ(c55): wave-gl の base 直後 rtk(右30%×上38%×横長のみ)で base+15%、vignette 係数も×(1-.3rtk)。mobile 不変。
- 空 on/off(c55実測,9s,デモ固定): desktop L 40.8(off)/41.9(on) 、mobile 50.0/50.6。差+2.6%/+1.2%、色味同じ→空は問題なし。probe は出力名が desktop-s.png で毎回上書き→都度 mv。URL は "/" 単独だと MSYS が壊すので必ず "/?demo=1" 形式。

- 刻の水(c57): moods.js の hourTint(hour)=HOUR_KEYS(1夜/6朝/13昼/19夕,循環,ease補間)→{mul,add,semis,rev}。main.js applyHour(): ?hour=0–24 固定、無効/未指定は実時刻(60sごと再計算)。空色は tick 内で palT.sky=sky*mul+add (add≤0.08) を backend.frame に渡す(pal自体は不変)。音階は setHourPitch(semis)→noteFreq、残響は audio.setReverbK(k): wetLong*k, wetShort*(2-k)。dataset.hour="h,m..+a..,rev", dataset.hourPitch。hour=13 は恒等(回帰ゼロ)。shots.json は全画面 hour=13 固定+hour-morning/evening/night。

## 状態フック（document.body.dataset.*）
plate plateFig audio render mood stones stoneHits stonePush bar barChimes echoes holding releases letter letterPlay ambient vessel glimmer glints sandSleep sandCalm hatsune wakeR afterimage loop wmGlow rain weather clearK rainLive sky depth hour hourPitch

## 撮影・probe
- `app/shots.json` に画面宣言。デモ `/?demo=1&seed=1`（幽霊の指が自動演奏。開始4.5s）。撮影 wait 合計は幅あたり25s以下。
- probe: `node harness/tools/probe.mjs steps.json --viewport desktop|mobile [--url "/?q=1"]`（要 npm run build）。steps はプロジェクト内(shots/cycle-NN/probe/)。mobile の clickAt は x<390。出力は shots/cycle-NN/probe。

## 落とし穴
- GL の追加パス・テクスチャ読み取り禁止(RENDER内で完結)。uK<0.5。GLSL main に pc g gl s あり、`patch` は予約語。衝突で GL 全滅→dataset.render=none。
- 塗り円盤・強い発光=「泡」、直線=「筋」、細い断片=「髪の毛」で評価が落ちた。縁なし低コントラストに。
- audio.js/glimmer.js のみ CRLF（他は LF）。node 編集は EOL を検出して保持。sed -i 全置換・python heredoc はハングしがち。EOL は od -c で確認。Bash heredoc に日本語大量は避けWrite経由。
- IDEAS.md は LF・追記のみ。コミットに Claude/Co-Authored-By を入れない。git の巻き戻し系コマンド禁止。
- 採否履歴は IDEAS.md の「決定」節。B 空を映す水=c53実装。A 奥行きの音 / C 近づく指 は未実装。
- probe のスクショは shots/cycle-053/probe/(ゼロ埋め3桁)に出る。輝度比較は pngjs(ルート node_modules)。デモで±1〜2%揺れる。

- 刻の水の色(c58-59): 空は下地に加算。HOUR_KEYS(夜/朝/昼/夕)に mul/add/band。縦長は hk=1.5, band=1+(band-1)*2.4。夕は琥珀に寄せると G で輝度が戻る。計測は shots/cycle-59/probe/run.sh+m.mjs。

- 沈む指(c61): main.js `DENT`/`dents`/dentStart/dentEnd/dentStep(tick内)。凹みは sim でなく RENDER の uDent(vec4 x,y,r短辺比,k) をガウス凹みの勾配で `col *= 1+dentK`(縁・塗りなし)。※sim に負 splat を毎フレーム入れると波が輪(rim)になるので不可。反動=離し(>=160ms or 移動0.03)後 120ms で ripple 0.16+audio level0.316、泉が始まった押下は反動なし(泉の離し輪に任せる)。バネ追従 FOLLOW 0.09s。dataset.touch="age,深さ(=0.08*k),rebound数" touchPos="px,py,x,y"。幽霊: ghost.js loopAct で 8.2s に一度 pressStart/pressEnd(350ms)。
- probe で押下保持: steps の eval で #water に PointerEvent(pointerdown/up,pointerId:7)を dispatch。shot は遅く(~0.5s)泉(260ms)が始まるので凹み単体は撮れない→一時 URL フラグで tap/泉を切って確認した(撤去済)。mobile は stone に当たる(0.45,0.55)を避け(0.3,0.3)。

- 沈む指の強化(c62): DENT={R:0.08,RM:0.095(縦長),GAIN:6,AMP:0.08}。setDent の w=k*GAIN。shader: dg=0.34*dr*dsh; dentK=w*(dg*(dg>0?1:0.5)-0.04*de)=明側1.0/暗側0.5・中心沈み弱め(c61は両側等・w=1で見えず。GAIN7.5/対称は暗葉が「染み」に見えた)。dataset.touch 深さ=0.08*GAIN*k(最大0.48)。`?dent=1`=撮影用: 押下で tap/泉/音を出さず凹みだけ(DENT_ONLY)。shots: press-hold / press-hold-zoom(#water を transform scale(3) 原点30% 30%) / press-hold-live(通常押下)。crop は shots/cycle-62/probe/crop.mjs(pngjs)。

- 石の質感(c63): wave-gl RENDER の石ブロック。艶=楕円ハイライト(gp,0.17,左上)+下面の淡い反射(rp,uMid,0.17)+縁に向かう受光階調(lit×rimg: 受光側+22%/影側-12%)。縁の白弧 inB は幅 dpx+2.2/3.6 に広げ強度 0.55→0.15(線でなく階調)。接地影 cshadow: 右下(0.16,-0.22)*sRy ずらした形から exp(-d/11px)、石の外のみ ×(1-0.13..)。shots: stone-zoom(#water scale 2.5 原点50% 60%、石は (0.5,0.6))。crop は shots/cycle-62/probe/crop.mjs。patch は shots/cycle-63/probe/patch.mjs(EOL保持 node 編集)。

- 分散(c65): wave-gl SIM に 4次項 -uDisp*wet*bil(軸±2の4点追加, bil=12c-4(l+r+d+u)+l2+r2+d2+u2)。?disp=係数(既定0.03,0で従来,上限0.035) ?dif=拡散(既定0.006,従来0.03)。uK=0.44-3.3β(0.341)、STEP_HZ=95*sqrt(0.44/uK)(≈108)で長波速度維持、減衰は pow(,uTs=95/hz)。※拡散項は速度への減衰で波速に効かない(c²=uK)。安定: 8K+32β<4。砂州は kk を uK/0.44 比で下げる。MAX_STEPS=5。h,v は shader で clamp(±3,±1.5)。guard(): 2.5sごと readPixels(IMPLEMENTATION_COLOR_READ_TYPE=半精度を手復号)で max|h|>1.0 か NaN→分散を8s切る(dataset.disp="β,本数推定,tripsN", dispMax="max,msN", ?disp=0→off)。headless では 1回15–40ms(実GPUは約2ms)。限界: 420セル格子では β≤0.035 が安定上限で、先走りは外縁に弱い 1–2 本の帯止まり(0.004 では ?disp=0 と区別不能)。退路=DISP_DEF を 0 に。headless は step 上限で波速が実時間より遅い(ring半径はタイミング揺れ)。shots: disp-on/disp-off(clickAt[300,300]+scale1.8)。
