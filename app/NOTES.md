# app/NOTES.md — 作業役の記憶ノート（c66 圧縮。旧版は git 履歴）

## ファイル（app/src）
- main.js(~960行,LF): 司令。wake/tick(rAF必要時のみ)、tap(x,yTop,vel,record)、pushByWave/stoneEcho/barChime、長押し泉 fountainStart/Stop、入力 onDown/onMove/onUp、手紙 letter*、vessel*、selectMood、memory(覚える水)、雨 rainStep/rainDrop、沈む指 DENT/dents/dentStart/End/Step、刻 applyHour。
- wave-gl.js(LF): WebGL2。SIM(波動 R高さ G速度 B光 A媒質)+RENDER(法線→地色・鏡面・縁・砂・石・空・凹み)。wave-2d.js=Canvas2D フォールバック。
- audio.js(CRLF) voice(freq,bright,vel,pan,decay,level,depth)。glimmer.js(CRLF)。他: echo ghost letter moods(hourTint,sky) loop afterimage style.css。index.html: #water #aura #glimmer #afterimage #ghost-dot #wordmark #hint #bar。

## 機能の要点
- 砂(Chladni)/石(艶・接地影)/空の映り込み(?sky=0)/刻の水(?hour=0–24、13=恒等)/覚える水/雨(?rain=0.3|1)/奥行きの音/右上持ち上げ/沈む指(?dent=1 で凹みのみ)。いずれも c37–c63 で調整済み。触る必要なし。
- 分散(c65/66,閉じた): ?disp=係数(既定0.03,0で従来,上限0.035)。発散ガード guard() が5秒ごと readPixels、max|h|>0.7 で分散を8s切る(dataset.disp/dispMax)。?guardtest=1 テスト専用。高周波強調 ?hf=0..1(既定0.5)。いずれも触る必要なし。

## 状態フック（document.body.dataset.*）
plate render mood stones bar echoes holding letter vessel glints sandSleep wakeR afterimage rain sky depth hour touch disp hover floor

## 撮影・probe
- shots.json: デモは `/?demo=1&seed=1&hour=13`。disp-on/disp-off/hf-off は非デモ(clickAt[300,300]+#water scale1.8)。撮影 wait 合計は幅あたり25s以下。
- probe: `node harness/tools/probe.mjs steps.json --viewport desktop|mobile --url "/?demo=1&x=1"`（要 npm run build）。URL は "/" 単独だと MSYS が壊す→"/?..." 形式。出力 shots/cycle-0NN/probe/(3桁) desktop-<shot>.png は毎回上書き→都度 mv。mobile clickAt は x<390。輝度比較は pngjs。eval は value に返る。
- 押下保持は eval で #water に PointerEvent(pointerdown/up,pointerId:7)。輪の大きさは撮影タイミングで揺れる(headless は step 上限で遅い)。比較は同一steps・同wait で。

## 落とし穴
- GL の追加パス・テクスチャ読み取り禁止(RENDER内で完結)。uK<0.5。GLSL に pc g gl s あり、`patch` は予約語。衝突で GL 全滅→dataset.render=none。
- 塗り円盤・強い発光=「泡」、直線=「筋」、細い断片=「髪の毛」で評価が落ちた。縁なし低コントラストに。
- sim に負 splat を毎フレーム入れると輪になる。拡散項は波速に効かない。
- audio.js/glimmer.js のみ CRLF。node で EOL 保持編集。sed -i 全置換・python heredoc はハングしがち。Bash heredoc に日本語大量は避ける。
- IDEAS.md は LF・追記のみ。コミットに Claude/Co-Authored-By を入れない。git 巻き戻し系禁止。
- 未実装案: A 奥行きの音(済), C 近づく指。決定履歴は IDEAS.md「決定」節。

## 近づく指(c67)
- main.js hoverMove/hoverStep/hoverLeave。沈む指の setDent を弱く再利用(GAIN=8)。マウスのみ。?hover=0 で無効。

## 水底(c69,c70調整)
- wave-gl.js RENDER: floorTex = 大きく歪めた低周波 vnoise(0.9)+oct2(0.15)+丸石(sc6:0.2, sc2.6:0.5, 縁 smoothstep(rad*.5,rad))。base *= 1+uFloor.x*fa*(F-0.4) と lap2 曲率の明るみ。屈折ずれ上限 4px。mobile は oct2 省略。
- ゲート fa: JS が本物の打(amp>=0.28)の位置・時刻を flA/flB に保持、半径 0.05+0.22*t の円盤×floorAct(打で1→3.5sで0)。静水・雨・小波では 0=home 不変。
- ?floor=係数(既定4=強さ1.2, 0で無効, 上限9)。dataset.floor="係数,最大ずれpx"(0〜4)/off。係数2は静止画で見えず、5で内側に柔らかい明るみ(汚れなし)。石の縁を鋭く(0.78)すると直線的な縁=格子に見えた。小さい石(sc6)を強くすると水玉。
- 比較は非デモ URL(/?hour=13&floor=N)+clickAt[360,320]。デモ幽霊は打ち時刻がずれる。shots.json floor-on/off はこの形。probe 出力は shots/cycle-070/probe/(3桁)。
- headless は fps~20 で sim が実時間の1/3。8s 後 dataset.floor を見るなら実時間24s 待つ。home の輝度は run 間で±2.4%揺れる(星・石が乱数)ので floor 有無の差は測れない→ゲート0で担保。

## 集まる輪(c71)
- main.js gatherTrack(p,px,py)(strokeTo末尾から呼ぶ)/gatherFire。軌跡 p.trail(px,直近1.5s)。判定: 始終点距離<周長L*0.12 ∧ L>=0.5S ∧ 多角形面積>0.03S²(S=短辺) ∧ 4πA/L²>=0.6、クールダウン2s。発火で輪上最大14点に ripple(0.1)、R/波速(clamp500-2600ms)後に中心 splat0.6＋3和音(0/+2/+4音、vel0.3,0.26,0.22)。
- dataset.gather="回数,中心x,中心y,収束ms"(?gather=0 で 'off'・検出ごと無効=退路)。ghost.js circle(): motifN===2 と以降3の倍数で交互(seed=1 では約30–45s で初回)。api.metric() 追加。
- 検証: shots/cycle-71/probe/gen.mjs(誤検出表)・gen2.mjs(draw/focus)。eval は async 可(awaitされる)。ロード直後(<2s)は timer が遅れ 1.5s を超え不発になる→ shots は wait2500 後に eval。desktop 1280x800 の中央下に石があり輪と重なる。
