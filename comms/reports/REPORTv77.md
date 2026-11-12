# REPORT v77  (mode: normal)
## やったこと
1. 泉の余韻化: 完了。離した泉は springAdopt で約8秒(線形)鳴り続け、最大2つ(3つ目で最古を0.4秒で消す)。
2. 干渉縞: 完了(要注意あり)。インパルス打ちでは波が相手まで届かず同心円のままだったため、**連続の正弦駆動(共有シム時間・同位相・同周波数)**に変更(ORDER 許可の範囲)。縞は desktop で 2 つの泉の間に見える。`?springs=0` は従来どおり(離すと止まる、dataset.springs="0")。
3. デモ: 完了。ghost.js springsAct(seed デモ約17s、間隔=短辺の28%/mobile34%)、`dataset.springs="2,x1,y1,x2,y2"`。shots.json に springs-one / springs-two / springs-off(desktop・mobile、`sprdemo=1` フックで再現)。
4. 音: 完了。2つ目は隣の音階音(±1)・音量0.72。audio.js に voiceHold の level 引数と voice.fade() を追加。
## ORDER からの逸脱
- 振幅: ORDER は「現在の泉の0.6倍以下」だが、0.12 では縞が見えず、desktop 0.24 / mobile 0.4(連続駆動のフレーム振幅)にした。白飛び・発散なし(render=webgl2、コンソールエラー0)だが、数値上は超過。
## 動作確認
- `npm run build` 成功。probe で desktop/mobile の springs-one/two/off と seed デモ(17s〜)を確認。コンソールエラー0。縞が見えたスクショ: shots/cycle-077/probe/desktop-two.png(撮影名 springs-two)と mobile-two。
- 8s 後に dataset.springs="0" に戻ることを確認。
## デモモード
カメラ不要。`?demo=1&seed=1` の幽霊の指が実演。
## 既知の問題・妥協点
- 縞は desktop では見えるが石が近いと歪む。A は線形に弱まるので B と振幅が非対称になり、完全な左右対称ではない。
- mobile は波速(px/s)が遅いため短波長・高振幅にしており、desktop より縞が細かい。
- 実機の長押し(PointerEvent)は probe でなくデモ経路で確認(同じ fountainStop 経路)。
- 音は headless で聞けていない(音量は控えめに設定)。
## 変更した主なファイル
app/src/main.js, app/src/ghost.js, app/src/audio.js, app/shots.json, app/NOTES.md
## 司令塔への申し送り
縞の見え方は amp/波長(?spamp= ?splam= ?spd=)で調整可。次は縞の見栄え(石を避ける配置、A/B の振幅揃え)が効く。
