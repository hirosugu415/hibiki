SCORE: 3/10
DIRECTION: polish
SUMMARY: 撮影起動失敗でヘルスNG（上限3点）。rollback後のappは probe で健全・静かに美しいが、追想は失われた
# FEEDBACK v32

## VISION 適合（絶対のルールを守れているか）
**違反の兆候なし（ただし公式証拠は 1 枚のみ）。** `meta.json` は build ok・`screens: []`・healthy=false、reasons=「撮影処理の失敗: browserType.launch: Target page, context or browser has been closed」。`shots/cycle-032/desktop-home.png` だけは存在し、暗い青の水面・浮かぶ石・「触れてみてください」・ガラスのモードバー・左上の「響」が崩れず整っている。自分の probe（mobile `?demo=1`、(190,400) タップ）では `mobile-touched.png` に細い輪と中心の光点、石、バーが 390 幅に収まって写り、コンソールエラー無し・blank=false・`render=webgl2, audio=running, stoneHits=1` を確認した。

## 採点の根拠
- ヘルス NG のため規定により最大 3 点。この環境での撮影起動失敗は c22・c25〜c31 と同種で、app 無変更の c31 でも起きている。app 起因ではない。
- **REPORT v32 との重大な食い違い**: REPORT は「`echo`→`recall` に置換済み・`recallGen=1` を確認」と述べるが、ハーネスの自動 rollback により app/ は 723bd57 へ戻り、`app/src/recall.js` は削除され `shots.json` も `echo` に戻っている（diff.stat: recall.js −77 行、ghost.js・main.js も巻き戻し）。dataset にも `recallGen` は無く `echoes/echoPending` のみ。つまり追想（c30）は現在失われている。
- 良い点: 画面は静かで一貫しており（`desktop-home.png`）、スマホ幅でも崩れない。悪い点: 6 点帯から前進が無く、静止画だけでは体験の変化が伝わらない。

## 動作確認で分かったこと
- `probe.mjs` mobile: goto→shot→clickAt→shot→eval 全 step ok。dataset は `mood=calm, stones=1, stoneHits=1, echoPending=4, letter=n=1;len=9`。
- 公式撮影だけが落ちる。`desktop-home.png` が出た後に落ちており、1 回の撮影で Chromium コンテキストを多数（4 画面×2 ビューポート）作る負荷が引き金の可能性がある。この機は chrome.exe が多数常駐している。harness は触れないので、撮影対象を減らして露出を下げるのが取れる唯一の手。

## 方向性の判断
polish。方向性ではなく環境の失敗。追想は rollback で消えたが、再導入は repair の間は行わない（c33 が健全に撮影できてから、normal で小さい単位に分けて戻す）。

## 次に最も効くこと
1. app/ を変えずに、`app/shots.json` を 3 画面（home / touched / hold）に減らして撮影の負荷を下げる（`echo` は `touched` とほぼ同じ絵で冗長）。
2. 撮影が通ったら次の normal で、追想を小さく再導入（`recall.js` 単体 → ghost への休符は別サイクル）。
3. その後「響」の階層（CSS 中心）。
