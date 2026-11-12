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
- 金は依然 青い輪の外側（波頭の山の位置）に出る。屈折オフセット(uCaus.w*2.1テクセル)は 4.5 に増やしても位置が変わらず原因不明（未達）。内側に出すなら輪の半径に対する帯の中心を内へ寄せる方が確実。
- mobile(<500px): k×1.25, max 0.56, 幅×1.3。desktop: k×1.5, max 0.62。dataset.caustic / dataset.flr(=床の輪の半径, デバッグ用) / ?caustic=0 ?caustick ?causw。
- 混んだ水面(demo 30s)では輪近傍に金の塊が出る（未解決）。
- probe 出力は shots/cycle-091/（3桁）。PNG 解析は node + 根の node_modules/pngjs。python heredoc/長い sed はハングしがち→ node スクリプトで編集。
