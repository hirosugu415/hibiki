# app/NOTES.md — 作業役の記憶ノート（c85 圧縮。旧版は git 履歴）

## ファイル（app/src）
- main.js(~1310行,LF): 司令。wake/tick(rAF必要時のみ)、tap(x,yTop,vel,record)、pushByWave/stoneEcho/barChime、泉 fountain*/springs*、onDown/onMove/onUp、手紙 letter*、selectMood、memory(loop.js)、雨、沈む指 dent、近づく指 hover、集まる輪 gather、bowl(こすると歌う)、gate(既定off)、applyHour。
- wave-gl.js(LF): WebGL2 SIM(波動)+RENDER(法線→地色・鏡面・縁・砂・石・空・凹み・floorTex)。wave-2d.js=2Dフォールバック。audio.js/glimmer.js は CRLF。他: echo ghost letter moods loop afterimage shell style.css。
- index.html: #water #afterimage #aura #glimmer #ghost-dot #wordmark #hint #bar。

## 状態フック（document.body.dataset.*）
plate render mood stones bar echoes holding letter vessel glints sandSleep wakeR afterimage rain sky depth hour touch disp hover floor gather bowl springs gate shell shells

## 巻貝(shell.js)
- buildShell/paintShell: 対数螺旋、同入力→同形。?shell=show / ?shell=0 / ?shells=N。デモは保存しない。

## 撮影・probe
- shots.json: デモは `/?demo=1&seed=1&hour=13`。撮影 wait 合計は幅あたり25s以下。gate-split は ?gate=1 付き。
- probe: `node harness/tools/probe.mjs steps.json --viewport desktop|mobile --url "/?demo=1&x=1"`（要 npm run build）。出力は shots/cycle-085/probe/(3桁) <viewport>-<shot>.png。eval は value に返る。URL は "/?..." 形式（MSYS対策）。mobile clickAt は x<390。
- 画面サイズ依存の値はタイマー内で計算(module初期化時 viewW=1)。headless は fps~20 で sim 時間が遅い。

## 落とし穴
- GL の追加パス・テクスチャ読み取り禁止。GLSL の `patch` は予約語。衝突で GL 全滅→dataset.render=none。
- 塗り円盤・強い発光=「泡」、直線=「筋」、細い断片=「髪の毛」で減点。低コントラストの物理効果(潮の門)は静止画で読めず退却→輪郭のはっきりした絵を。
- 分散/guard/砂/石/空/刻/雨/泉/bowl は調整済み。触らない。
- audio.js/glimmer.js のみ CRLF。sed -i 全置換・python heredoc はハングしがち。IDEAS.md は追記のみ。
- コミットに Claude/Co-Authored-By を入れない。git 巻き戻し系禁止。

## c89: 底の光 (wave-gl.js RENDER)
- シェーダ: `uCaus(k,env,max,offTexels)`/`uWarm`。env>0 の時だけ分岐し、広い4点ラプラシアン（sim テクセル14個分(mobile×1.3)、追加読み取り4回）が負＝波頭の下に暖色加算、正は-12%暗く。base が明るい所は加算を弱める。環境 env=floorAct(打後~3.5s減衰)から作る→静水では分岐に入らず home 不変。
- 暖色は hour(dataset.hour 先頭)で昼=淡い金/夜=淡い琥珀(JS側で uWarm)。dataset.caustic="k,max強度" / 'off'。URL: ?caustic=0, ?caustick=(既定16), ?causw=(既定14)。max=0.42。
- 検証: headless は fps~5 で sim 時間が実時間の~1/3。「消える」確認は wait 30s が必要。shots.json に caustic-ring / caustic-off。

## c90-91: 底の光 (wave-gl.js RENDER の uCaus ブロック ~L183-205)
- 色: 乗算 tint vec3(1,.46,.08)×min(1,1.35ce) で青を潰し、加算 uWarm（昼 1,.68,.24 / 夜 1,.40,.12）。金×青い輪=灰/オリーブになるので tint は強め。応答は山形 ce=env*1.33*cx/(0.49+cx²)。
- c91 輪の帯ゲート: 打点 A/B から輪の半径 uFl*.z（床の輪=波頭と同じ半径, 短辺単位, ≒0.22/s）に対し rd/z が 0.72〜0.88 で立ち上がり 1.1〜1.3 で消える帯だけ金を許可。z>0.26〜0.48 で消す（大きな輪のリボン防止）。これで mobile 中央の染み（原因: dd の最近点が非活性の B=画面中央を選んでいた/反射波）が消えた。dd は活性な打点のうち輪の半径に近い方。
- mobile(<500px): k×1.25, max 0.56, 幅×1.3。desktop: k×1.5, max 0.62。dataset.caustic / dataset.flr(=床の輪の半径, デバッグ用) / ?caustic=0 ?caustick ?causw。
- probe 出力は shots/cycle-091/（3桁）。PNG 解析は node + 根の node_modules/pngjs。python heredoc/長い sed はハングしがち→ node スクリプトで編集。

## c93: 跳ね返る雫 (main.js reboundDrop, tap() の直前 ~L482)
- 押下の瞬間の tap で vel>=0.7（ユーザー打は常に1・幽霊初打0.75）→ 800ms 後に同位置へ ripple(amp=min(0.3,主×0.7), r=0.0072) + 音(1oct上, vel0.3, decay0.45)。定数 REB={VEL,DELAY,GAP:2500,BUSY:1000,AMP,RAD}。
- 出さない: quietTap(周回/こだま系)・前打から1s未満(幽霊連打)・前回発火から2.5s未満・発火時に pointers/fountain/dents が生きている(長押し=press-rebound と排他)。?rebound=0 で off。
- dataset.rebound="回数,振幅比"/off。デモの幽霊初打は 4.5s 後なので撮影は wait 5800（初打+1.3s）。shots: rebound-ring / rebound-off。

## c94: mobile 仕上げ
- reboundDrop: innerWidth<600 は amp=min(0.42,主×1.0)・半径0.0095（desktop は 0.3/×0.7/0.0072 のまま）。dataset.rebound 比は mobile で ~0.84-0.95。
- wave-gl.js 底の光: asp.x<0.8（縦長）のとき斜め4点を追加で読み lw を平均 → 金の縁のギザつきが減った（desktop 不変）。打点中心付近の小さな金の欠片は残る。
- headless の sim 時間は遅く、デモ撮影は打点・時刻が揺れる。mobile 確認は実クリックで `clickAt` 後 wait1500 が安定。

## c95: 金の染み対策 (wave-gl.js uCaus ブロック)
- 縦長(asp.x<0.8): 帯を rd/z 0.85〜1.15 に狭め、画面端8%で fade、金強度 max 0.56→0.26。全幅: 輪が小さい(uFl*.z<0.07〜0.15)間は金を出さない(中心付近の欠片対策)。「響」中心(CSS 46,40)から 60〜130px で金を 30%→100%。

## c97: 隅の金ゼロ + 出会いの音
- wave-gl.js uCaus ブロック末尾: 画面端から短辺の 12%(22%で全開)で cx を 0、打点 A/B が端 8% の外なら輪の帯を無効(inA/inB)、「響」周辺 200×~174 CSS px 箱は 0(→260px で全開)。隅・響周りは金ゼロを確認済み(mobile/desktop rebound-ring, caustic-ring)。輪沿いの細い金の弧は内側に残る。
- 出会いの音: main.js meetCheck(tap 冒頭, ~L506)。直前 6 打(3 秒以内, 距離>=40px)と解析計算: 輪が出会う半径 r1=(d/sp+dt)/2*sp (sp=WAVE_SPEED)、接点が 5-95%x/10-90%y 外・半径>0.7 幅なら出さない。1 秒 2 個まで、quietTap 除外。音は noteFreq*2 vel0.3、粒は glimmer.spark(x,y) (半径 6.5px 青白い芯+薄い縁, 1.1 秒)。?meet=0 / dataset.meet="回数,x,y,perf時刻"/off。
- デモ seed=1 は perf 5.4s/6.0s/6.6s に発火。shots meet-spark/meet-off は wait 4800(ページ読込~0.8s 後が perf 時刻)。headless は揺れる。

## c98: 響周りの箱の原因 + mobile 金停止
- 「響」周りの的・四角い影の正体は vesselRing()(main.js ~L1352)。器が満ちると 響 の中心(角)に amp0.36 の大きな輪→壁反射で箱。今は角から短辺の28%内側(画面中心方向)に amp0.27 で出す（amp>=0.28 は床の金 floorAct を起こすので 0.28 未満厳守）。
- mobile(innerWidth<500) は uCaus.y を 0 にして金を完全に出さない(wave-gl.js ~L638)。濁りオリーブ対策。desktop の金は不変。
- 出会いの粒(glimmer.js drawMeets): 半径7px 芯 + 放射グラデの暈(3.4r) + 広がる細い輪(1.2px)。
- probe 出力先は shots/cycle-098/probe/(3桁)。bash の node -e に backtick を入れるとシェルが展開→ファイルに .cjs を書いて実行。

## c99: 金は全幅で off（確定）
- wave-gl.js uCaus ブロックは「10% の暗部」だけ残し、金（tint・uWarm 加算・輪の帯ゲート）のコードを全削除。mobile は従来どおり uCaus.y=0。金を作り直さない。uWarm uniform は JS 側に残るが未使用。
- main.js ghost.tap: 左上 200×190 CSS px の打は y=190px へ押し出し（「響」周囲に輪の中心を作らない）。
- glimmer.js 出会いの粒 LIFE=2000ms。検証: probe の PNG で r>b-5&&r>60 の画素数が全て UI の ~18 のみ。
- probe 出力は shots/cycle-099/probe/（3桁）。
