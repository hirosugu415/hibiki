# app/NOTES.md — 作業役の記憶ノート（c66 圧縮。旧版は git 履歴）

## ファイル（app/src）
- main.js(~960行,LF): 司令。wake/tick(rAF必要時のみ)、tap(x,yTop,vel,record)、pushByWave/stoneEcho/barChime、長押し泉 fountainStart/Stop、入力 onDown/onMove/onUp、手紙 letter*、vessel*、selectMood、memory(覚える水)、雨 rainStep/rainDrop、沈む指 DENT/dents/dentStart/End/Step、刻 applyHour。
- wave-gl.js(LF): WebGL2。SIM(波動 R高さ G速度 B光 A媒質)+RENDER(法線→地色・鏡面・縁・砂・石・空・凹み)。wave-2d.js=Canvas2D フォールバック。
- audio.js(CRLF) voice(freq,bright,vel,pan,decay,level,depth)。glimmer.js(CRLF)。他: echo ghost letter moods(hourTint,sky) loop afterimage style.css。index.html: #water #aura #glimmer #afterimage #ghost-dot #wordmark #hint #bar。

## 機能の要点
- 砂(Chladni)/石(艶・接地影)/空の映り込み(?sky=0)/刻の水(?hour=0–24、13=恒等)/覚える水/雨(?rain=0.3|1)/奥行きの音/右上持ち上げ/沈む指(?dent=1 で凹みのみ)。いずれも c37–c63 で調整済み。触る必要なし。
- 分散(c65): SIM に4次項 -uDisp*wet*bil。?disp=係数(既定0.03,0で従来,上限0.035) ?dif=拡散。uK=0.44-3.3β、STEP_HZ=95*sqrt(0.44/uK)、MAX_STEPS=5。420セル格子では β≤0.035 が安定上限、効果は控えめ（この題材は c66 で閉じた）。退路=DISP_DEF=0。
- 発散ガード guard(): 5秒ごとに画面の上/下半分を交互に readPixels（半精度を手復号）、max|h|>0.7 か NaN で分散を8s切る。dataset.disp="β,本数,tripsN" dispMax="max,msN"。通常の最大 |h|≈0.15（連打・雨30s）。`?guardtest=1`（テスト専用）: uDisp=0.2 を使い、初回 trip 後は分散を戻さない→数秒で静まる。
- 高周波強調(c66): RENDER で lap2=4近傍(2セル幅,追加読み取りなし)のラプラシアン → add に uAcc*uHf*smoothstep(0.004,0.03,lap2)*smoothstep(0,.02,slope)*fresh。?hf=0..1（既定0.5, 0で無効）。home 輝度差 +0.8%。効果は輪内側の細い明線程度。

## 状態フック（document.body.dataset.*）
plate plateFig audio render mood stones stoneHits stonePush bar barChimes echoes holding releases letter letterPlay ambient vessel glimmer glints sandSleep sandCalm hatsune wakeR afterimage loop wmGlow rain weather clearK rainLive sky depth hour hourPitch touch touchPos disp dispMax

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
