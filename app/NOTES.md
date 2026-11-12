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

## 水底(c69)
- wave-gl.js RENDER: floorTex/floorStones(歪めた格子+jitter した丸い石+低周波ノイズ)。base *= 1+uFloor.x*fa*(F-0.4)、さらに lap2 曲率の明るみ base += mix(uMid,uAcc,.5)*uFloor.x*fa*(1-exp(-lap2*55))*0.2。屈折は q+clamp(g*70,±1)*3px/uRes。mobile は oct2 省略。
- ゲート fa: JS が本物の打(amp>=0.28)の位置・時刻を flA/flB に保持、半径 0.05+0.22*t(短辺比)の円盤×floorAct(打で1→6sで0)。静水・雨・小波では 0=home 不変。wake(uWake*) は砂板専用で当てにならない（使うと0）。
- ?floor=係数(既定1, 強さ=係数*0.3, 0で無効, 上限9)。dataset.floor="係数,最大ずれpx"(0〜3)/off。
- 効果は控えめ: K=1 で輪の内側に淡い丸い明暗が読める程度。強くすると水玉(bokeh)に見える(デバッグで確認)。
- probe 比較はラン間でゴーストの打ち時刻がずれる→差分画像は当てにならず crop 並置で見る。
