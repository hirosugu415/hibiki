# app/NOTES.md — 作業役の記憶ノート（c85 圧縮。旧版は git 履歴）

## ファイル（app/src）
- main.js(~1310行,LF): 司令。wake/tick(rAF必要時のみ)、tap(x,yTop,vel,record)、pushByWave/stoneEcho/barChime、泉 fountain*/springs*、onDown/onMove/onUp、手紙 letter*、selectMood、memory(loop.js)、雨、沈む指 dent、近づく指 hover、集まる輪 gather、bowl(こすると歌う)、gate(既定off)、applyHour。
- wave-gl.js(LF): WebGL2 SIM(波動)+RENDER(法線→地色・鏡面・縁・砂・石・空・凹み・floorTex)。wave-2d.js=2Dフォールバック。audio.js/glimmer.js は CRLF。他: echo ghost letter moods loop afterimage shell style.css。
- index.html: #water #afterimage #aura #glimmer #ghost-dot #wordmark #hint #bar。

## 状態フック（document.body.dataset.*）
plate render mood stones bar echoes holding letter vessel glints sandSleep wakeR afterimage rain sky depth hour touch disp hover floor gather bowl springs gate shell shells

## c85-86: 巻貝(shell.js)
- buildShell(taps,{turns,rot})/paintShell(ctx,size,taps,accent,strength,opts): 対数螺旋(g=1.85/周)、巻き数=clamp(1.6+n*0.1,2,3.2)、部屋の角度幅=0.55+0.9*音高、x平均=色相±22°。同入力→同形。
- フラグ: ?shell=show(固定12打,dataset.shell="12,2.8",消えない)、?shell=0(off)、?shells=N(seed固定。デモでも出る)。デモは保存/読込しない。PNG保存は未実装。

## c87: 床の殻の演奏再生(shell.js の createShell 後半)


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

## c90: 底の光の再調整 (wave-gl.js RENDER の uCaus ブロック)
- 色: 乗算 tint vec3(1,.46,.08)×0.9ce で青を潰し、加算 uWarm（昼 1,.68,.24 / 夜 1,.40,.12）。灰褐色の原因は青いリングの G が加算で R と並ぶこと→青を先に潰す。
- 応答は山形 ce=env*1.33*cx/(0.49+cx²)（cx=-lw*k）。混み合った水面で強曲率域がべた塗りの金になるのを防ぐ（c89 の clamp 版は 30s 後に金の塊）。
- 屈折: 打点(uFlA/uFlB の近い方)から外向きに uCaus.w*2.1 テクセルずらして読む。効果は小さく金帯は依然青線の外側に主に出る（未解決）。
- mobile(<500px): k×1.25, max 0.56, 幅×1.3。desktop: k×1.5, max 0.5。
- probe 出力は shots/cycle-090/（3桁）。PNG 解析は node + 根の node_modules/pngjs。
