# app/NOTES.md — 作業役の記憶ノート（c85 圧縮。旧版は git 履歴）

## ファイル（app/src）
- main.js(~1310行,LF): 司令。wake/tick(rAF必要時のみ)、tap(x,yTop,vel,record)、pushByWave/stoneEcho/barChime、泉 fountain*/springs*、onDown/onMove/onUp、手紙 letter*、selectMood、memory(loop.js)、雨、沈む指 dent、近づく指 hover、集まる輪 gather、bowl(こすると歌う)、gate(既定off)、applyHour。
- wave-gl.js(LF): WebGL2 SIM(波動)+RENDER(法線→地色・鏡面・縁・砂・石・空・凹み・floorTex)。wave-2d.js=2Dフォールバック。audio.js/glimmer.js は CRLF。他: echo ghost letter moods loop afterimage shell style.css。
- index.html: #water #afterimage #aura #glimmer #ghost-dot #wordmark #hint #bar。

## 状態フック（document.body.dataset.*）
plate render mood stones bar echoes holding letter vessel glints sandSleep wakeR afterimage rain sky depth hour touch disp hover floor gather bowl springs gate shell shells

## c85: 巻貝(shell.js)
- buildShell(taps)/paintShell(ctx,size,taps,accent,strength): 対数螺旋(g=1.85/周)、巻き数=clamp(1.6+n*0.1,2,3.2)、部屋の角度幅=0.55+0.9*音高、強さ=隔壁の濃さ、x平均=色相±22°(<0.5は鏡像)。同入力→同形。
- createShell({accent,demo,shellParam,shellsParam}): main.js の tap(record=true) から shell.record(x,y,vel,pitch)。8打以上+10s無操作で一度だけ #shell(canvas, mix-blend screen, top44%)を 3.2s で浮上→1.4s後 3.4s で沈む。pointerdown/keydown で dismiss。非デモは localStorage 'hibiki.shells'(最大12,{x,y,t:[[x,p,v]]})に保存、再訪で最新5個を #shells(全面canvas)に strength0.5 で表示(タップで薄れ9s後復帰)。
- フラグ: ?shell=show(0.3s後に固定12打で発火・消えない)、?shell=0(off)、?shells=N(保存なし・seed固定のN個、デモでも出る)。dataset.shell="打数,巻き数"/"0"/"off"、dataset.shells="個数"。デモ(DEMO)は保存も読み込みもしない(画素一致のため)。
- shots.json に shell-show(wait3600)/shells-floor(wait4800)。PNG長押し保存は未実装(#water の長押し泉と衝突)。

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
