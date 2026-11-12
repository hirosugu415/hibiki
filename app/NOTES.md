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

## 状態フック（document.body.dataset.*）
plate plateFig audio render mood stones stoneHits stonePush bar barChimes echoes holding releases letter letterPlay ambient vessel glimmer glints sandSleep sandCalm hatsune wakeR afterimage loop wmGlow rain weather clearK rainLive sky depth

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
