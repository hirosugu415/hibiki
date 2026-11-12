# app/NOTES.md — 作業役の記憶ノート（c66 圧縮。旧版は git 履歴）

## ファイル（app/src）
- main.js(~960行,LF): 司令。wake/tick(rAF必要時のみ)、tap(x,yTop,vel,record)、pushByWave/stoneEcho/barChime、長押し泉 fountainStart/Stop、入力 onDown/onMove/onUp、手紙 letter*、vessel*、selectMood、memory(覚える水)、雨 rainStep/rainDrop、沈む指 DENT/dents/dentStart/End/Step、刻 applyHour。
- wave-gl.js(LF): WebGL2。SIM(波動 R高さ G速度 B光 A媒質)+RENDER(法線→地色・鏡面・縁・砂・石・空・凹み)。wave-2d.js=Canvas2D フォールバック。
- audio.js(CRLF) voice(freq,bright,vel,pan,decay,level,depth)。glimmer.js(CRLF)。他: echo ghost letter moods(hourTint,sky) loop afterimage style.css。index.html: #water #aura #glimmer #afterimage #ghost-dot #wordmark #hint #bar。

## 機能の要点
- 砂/石/空/刻/覚える水/雨/奥行きの音/沈む指は調整済み。触る必要なし。
- 分散 ?disp / guard() は閉じた。触らない。

## 状態フック（document.body.dataset.*）
plate render mood stones bar echoes holding letter vessel glints sandSleep wakeR afterimage rain sky depth hour touch disp hover floor

## 撮影・probe
- shots.json: デモは `/?demo=1&seed=1&hour=13`。disp-on/disp-off/hf-off は非デモ(clickAt[300,300]+#water scale1.8)。撮影 wait 合計は幅あたり25s以下。
- probe: `node harness/tools/probe.mjs steps.json --viewport desktop|mobile --url "/?demo=1&x=1"`（要 npm run build）。URL は "/" 単独だと MSYS が壊す→"/?..." 形式。出力 shots/cycle-0NN/probe/(3桁) desktop-<shot>.png は毎回上書き→都度 mv。mobile clickAt は x<390。輝度比較は pngjs。eval は value に返る。

## 落とし穴
- GL の追加パス・テクスチャ読み取り禁止(RENDER内で完結)。uK<0.5。GLSL に pc g gl s あり、`patch` は予約語。衝突で GL 全滅→dataset.render=none。
- 塗り円盤・強い発光=「泡」、直線=「筋」、細い断片=「髪の毛」で評価が落ちた。縁なし低コントラストに。
- sim に負 splat を毎フレーム入れると輪になる。拡散項は波速に効かない。
- audio.js/glimmer.js のみ CRLF。node で EOL 保持編集。sed -i 全置換・python heredoc はハングしがち。Bash heredoc に日本語大量は避ける。
- IDEAS.md は LF・追記のみ。コミットに Claude/Co-Authored-By を入れない。git 巻き戻し系禁止。
- 未実装案: A 奥行きの音(済), C 近づく指。決定履歴は IDEAS.md「決定」節。

## 近づく指(c67)/水底(c69)/集まる輪(c71)
- 近づく指: main.js hoverMove/hoverStep(?hover=0 で無効)。水底: wave-gl.js RENDER floorTex、ゲート flA/flB、?floor=係数(既定4,0で無効)、dataset.floor。headless は fps~20 なので 8s 待つなら実時間24s。
- 集まる輪: main.js gatherTrack/gatherFire、?gather=0 で無効、dataset.gather。ロード直後<2s は不発。

## こすると水が歌う(c73,c74仕上げ)
- main.js bowlTrack/bowlFire(fx,fy,n)/bowlStep(dt)。検出: 向き反転(ヒステリシス max(8,2%S))を直近1s に4回以上 ∧ 反転点bbox≤0.24S。発火中は再検出なし。?bowl=0 で無効、?bowl=demo で1.5s後に発火、?bowln=4..8。
- c74: **n=見える花びら枚数(偶数4/6/8)**、駆動は cos(mθ), m=n/2(cos(nθ)は2n枚に見えた)。n=2*round(2+(rate-4)/3)。R=0.12S、輪上24点に ripple、KR=6.6(f=v*KR/(2πR))。振幅 0.95、幅<600は×0.72(1.3倍以上だと外側の輪が画面全体に広がり泡/筋化)。0.8以上でdesktopは中心に泡状の輪が出る場合あり→0.95で出なかった。
- demo 発火位置: 石(stone.y, stoneR())の上・ワードマーク(84px)の下に収まるよう fy を算出(desktop y≈0.32)。花の外側の放射リングは物理的に出る(淡い)。
- dataset.bowl="n,x,y,持続ms"(終了で ms=0 / 未発火"0" / 無効"off")。sim時間(tick dt)で進める(setTimeout駆動は headless で崩れる)。
- 誤検出検証: shots/cycle-74/probe/gen.cjs が c-*.json を生成(eval で PointerEvent 往復)。直線/小円/1.5s揺れ/タップ連打=不発、速い往復=n6、中速(周期480ms)=n4。
