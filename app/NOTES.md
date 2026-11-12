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

## c75: 花の外側吸収帯
- wave-gl.js SIM: uniform uBowl(x,y,Rcells,強さ)。花の中心から 1.3R→1.75R で立ち上がり 2.3R→3.0R で消える減衰(BOWLK=0.11 を damp に引く)。setBowl(ux,uy,Rpx,s) を main.js bowlFire で呼び、駆動終了+1.2s で解除。2D フォールバックは setBowl 無し(guard済)。これで外側リング消滅、花びら6枚が鮮明。
- mobile の ×0.72 を撤廃(MOBILE_AMP 既定1, ?bamp= で試せる)。mobile は desktop よりやや淡く丸いが6枚数えられる。
- 駆動は終端 0.9s かけて減衰(余韻)。BOWL_PARAM=demo 中は幽霊の打を止める(撮影の花以外の波を出さない)。bowl-late は wait 3900(発火後約2.4s)。mobile は desktop より早く消える(4.3s でほぼ消滅)。
- probe 出力先は shots/cycle-0NN(3桁)。

## c77: 双つの泉(springs)
- main.js SPR/springs[]/springStep(dt)/springAdopt/springKill(fountain節の直後)。離した泉(pointerup, reward)は springAdopt で余韻の泉(8s線形)に。最大2(3つ目で最古を400msで消す)。tick から springStep(dt): 共有sim時間 sprT の sin で全泉を同位相・同周波数の**連続駆動**(インパルス打ちは波が届かず縞にならなかった)。held の泉は springs があれば f.shared=true で合流、無くなれば元のタイマーへ戻る。
- 波長 LAM=短辺の11%(mobile 8.5%)、AMP desktop0.24/mobile0.4(0.12では縞が出ない)、f=v/(LAM*S), v=0.68*95*viewW/420。mobile は波速がpx換算で遅く届かないので高振幅・短波長が必要。
- 音: audio.voiceHold(freq,bright,pan,level) / voice.fade(sec)。2つ目は隣の音階音(idx±1)・level0.72。
- フラグ: ?springs=0 で無効、?sprdemo=1 または ?springs=demo で撮影用(1.5s A置き→1.7s離す→2.7s B長押し、ghostのtap/holdは抑止)。?spamp= ?splam= ?spd= で調整。dataset.springs="本数,x1,y1,x2,y2"。
- ghost.js springsAct: seed デモ 17s 付近(loopAct内)。stone/rain は springsLive() 中は休む。
- 作業メモ: 一時ファイルは shots/cycle-77/ に置く(/tmp は使わない)。

## c78: 泉の磨き
- **バグ根治**: デモの泉座標は module 初期化時 viewW=1 で計算され mobile 値・間隔0.34Sになっていた → 発火時(setTimeout内)に pt() で計算。画面サイズ依存の値はタイマー内で。
- desktop 間隔0.27S, y=0.38(石 y≈0.62 から>15%S)。駆動点 RAD 0.016→0.026(?sprad=、中心のジャギー解消)。mobile LAM 0.085→0.102, AMP 0.4→0.34。
- 振幅揃え: springStep で2番目の泉/held泉の level = min(古い泉の現在level, 自分)、held は f.t0 から1.5s で立ち上がり。springAdopt の lv0 は古い泉の現在levelに合わせる。

## c79: 泉の非対称解消・デモ座標点検
- sprLevel を「hold(既定3000ms, ?sprhold=)の間は lv0 を保ち、その後 smoothstep でほどける」に変更。springAdopt が hold を付与、springKill は hold=0。新旧の振幅が揃い縞が左右対称に。8秒の寿命は不変。
- デモ座標点検: bowl=demo / ghost.springsAct(api.metric) / sprdemo(pt()) は全て発火時計算で問題なし。module 初期化時 viewW=1 の値を使う箇所は他に無い(定数は全て関数/getter)。
- 実操作 probe: eval で #water に PointerEvent(down→1.2s→up→0.8s→down→2.8s)。非デモURL "/?seed=1&hour=13"。dataset.springs="2,.375,.375,.625,.375"。
