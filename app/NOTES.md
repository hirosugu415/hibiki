# app/NOTES.md — 作業役の記憶ノート（c85 圧縮。旧版は git 履歴）

## ファイル（app/src）
- main.js(~1310行,LF): 司令。wake/tick(rAF必要時のみ)、tap(x,yTop,vel,record)、pushByWave/stoneEcho/barChime、泉 fountain*/springs*、onDown/onMove/onUp、手紙 letter*、selectMood、memory(loop.js)、雨、沈む指 dent、近づく指 hover、集まる輪 gather、bowl(こすると歌う)、gate(既定off)、applyHour。
- wave-gl.js(LF): WebGL2 SIM(波動)+RENDER(法線→地色・鏡面・縁・砂・石・空・凹み・floorTex)。wave-2d.js=2Dフォールバック。audio.js/glimmer.js は CRLF。他: echo ghost letter moods loop afterimage shell style.css。
- index.html: #water #afterimage #aura #glimmer #ghost-dot #wordmark #hint #bar。

## 状態フック（document.body.dataset.*）
plate render mood stones bar echoes holding letter vessel glints sandSleep wakeR afterimage rain sky depth hour touch disp hover floor gather bowl springs gate shell shells

## c85-86: 巻貝(shell.js)
- buildShell(taps,{turns,rot})/paintShell(ctx,size,taps,accent,strength,opts): 対数螺旋(g=1.85/周)、巻き数=clamp(1.6+n*0.1,2,3.2)、部屋の角度幅=0.55+0.9*音高、x平均=色相±22°。同入力→同形。
- c86 質感: 部屋ごとに放射グラデ(内→外)+弧沿いの白い光沢、色相を部屋ごとに±14°ずらす。外縁=太線(size*0.011,min3px)+滲み+内側0.982倍の細いハイライト線。隔壁は細く(size*0.0042)低コントラスト。
- createShell: 8打以上+10s無操作で一度だけ #shell(canvas, screen)を浮上→沈む。centerY(size): 石(dataset.stone)の影(r*1.7)の12px上に収め、足りなければ size を縮める(石が無ければ44%)。自然発火中は body[data-shell-calm=1] で CSS が #afterimage/#ghost-dot を減光(remove/dismiss で解除)。
- 非デモは localStorage 'hibiki.shells'(最大12)、再訪で最新5個を #shells に strength0.33 で表示。MULT/TURNS/ROT 配列で大きさ0.65-1.3倍・巻き数2-3.2・向きを変える。
- フラグ: ?shell=show(固定12打,dataset.shell="12,2.8",消えない)、?shell=0(off)、?shells=N(seed固定。デモでも出る)。デモは保存/読込しない。PNG保存は未実装。

## c87: 床の殻の演奏再生(shell.js の createShell 後半)
- buildFloor(350ms後): place() でワードマーク/バー/石(r*1.9)/他の殻を避けて配置。ents[{cx,cy,sz,R,S,taps}]。dataset.shellPos(正規化座標 ';'区切り)/shellPlay('off'|'idx,n')/shellHover。
- window pointerdown(capture, 最初に登録): 殻内(R=sz*0.44・石は除く・fc の opacity>0.2)で stopPropagation+ev.shellHit=true→playShell。再生中は無視。0.4s間隔、vel=0.35+0.2v、yは seed由来(0.3-0.7)。main.js の play コールバックが quietTap で tap(x,y,v,false) を呼ぶ。
- 光る部屋は #shell-glow(全面canvas,animate)、hover は #shell-hover(輪郭のみ微光)。paintShell は S.Q/S.C/S.hue を返す。y は保存されない(保存形式不変)。
- shots.json: shell-play/shell-hover は eval で dataset.shellPos 先頭へ pointerdown/pointermove を dispatch（両 viewport 共通）。

- c88 鎮静: playShell は最大8打(等間隔に間引き, dataset.shellPlay='i,n' の n<=8)、x/y を 0.12-0.88 に clamp、vel=0.3+0.12v。main.js tap は quietTap 時 ripple 振幅*0.5・半径0.009（殻再生専用）。

## 撮影・probe
- shots.json: デモは `/?demo=1&seed=1&hour=13`。撮影 wait 合計は幅あたり25s以下。gate-split は ?gate=1 付き。
- probe: `node harness/tools/probe.mjs steps.json --viewport desktop|mobile --url "/?demo=1&x=1"`（要 npm run build）。出力は shots/cycle-085/probe/(3桁) <viewport>-<shot>.png。eval は value に返る。URL は "/?..." 形式（MSYS対策）。mobile clickAt は x<390。
- 画面サイズ依存の値はタイマー内で計算(module初期化時 viewW=1)。headless は fps~20 で sim 時間が遅い。

## 落とし穴
- GL の追加パス・テクスチャ読み取り禁止。GLSL の `patch` は予約語。衝突で GL 全滅→dataset.render=none。
- 塗り円盤・強い発光=「泡」、直線=「筋」、細い断片=「髪の毛」で減点。低コントラストの物理効果(潮の門)は静止画で読めず退却→輪郭のはっきりした絵を。
- 分散 ?disp / guard() は閉じた。砂/石/空/刻/雨/泉/bowl は調整済み。触らない。
- audio.js/glimmer.js のみ CRLF。sed -i 全置換・python heredoc はハングしがち。IDEAS.md は追記のみ。
- コミットに Claude/Co-Authored-By を入れない。git 巻き戻し系禁止。

## c89: 底の光 (wave-gl.js RENDER)
- シェーダ: `uCaus(k,env,max,offTexels)`/`uWarm`。env>0 の時だけ分岐し、広い4点ラプラシアン（sim テクセル14個分(mobile×1.3)、追加読み取り4回）が負＝波頭の下に暖色加算、正は-12%暗く。base が明るい所は加算を弱める。環境 env=floorAct(打後~3.5s減衰)から作る→静水では分岐に入らず home 不変。
- 暖色は hour(dataset.hour 先頭)で昼=淡い金/夜=淡い琥珀(JS側で uWarm)。dataset.caustic="k,max強度" / 'off'。URL: ?caustic=0, ?caustick=(既定16), ?causw=(既定14)。max=0.42。
- 検証: headless は fps~5 で sim 時間が実時間の~1/3。「消える」確認は wait 30s が必要。shots.json に caustic-ring / caustic-off。
