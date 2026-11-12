# REPORT v54  (mode: normal)
## やったこと
1. main.js 改行修復: 完了。c53 で CRLF 化されていた main.js を LF（c52 以前と同じ）に戻した。`git diff --stat HEAD~5 -- app/src/main.js` は 5 行追加/2 行削除（c53 の実変更 + 今回の depth 引数）のみ。※ HEAD(c53) 自体は CRLF なので、HEAD 比の diff には「EOL 戻し」が全行差分として出る（これが修復の証拠）。
2. 空の局所強化: 完了。wave-gl.js の法線項クランプ ±0.12→±0.25（輪が通る所だけ動く）。全体輝度は uSky 強度×0.9 で抑制。
3. 上端 vignette: 完了（一部は目視判断）。vignette の y 係数を上端で 1.15→0.98 に滑らかに変化。desktop 上端の輝度は 上(明)→下へ単調に落ちる形になり「暗→明→暗」の帯は解消。ただし右上は既存の base 勾配（q.y 側の暗化）が残り、そこは暗いまま。
4. 奥行きの音: 完了。`voice()/play()` に末尾引数 depth。LP×(1−0.45d, 下限 2kHz)、rvIn への per-voice send 0.4d（+40%）、音量 1−0.2d（−2dB）。`dataset.depth="d,wet,lp"`。
5. NOTES 更新: 完了。
## ORDER からの逸脱
なし（depth を渡すのは note()（タップ/幽霊の指）と長押し泉のみ。他の音は 0）。
## 動作確認
build 成功、probe コンソールエラー 0（desktop/mobile）。デモ無し `/?seed=1` で eval: 下を打つ `0.00,1.00,1591` / 上 `0.95,1.38,4352` / 中 `0.55,1.22,3023`。下の LP が低いのはその高さの bright が低いため（元の値）。sky=1/0 の desktop・mobile 上端タップを並べて確認：輪が通る上端で空の縁がやや歪む。
輝度: Q0(sky=0)40.3/39.7 vs Q1(sky=1)41.9/43.1（強度×0.9 前の計測。run 間揺れ±1 あり）。×0.9 後の再計測はしていない。
## デモモード
`/?demo=1&seed=1` で幽霊の指が上下を打ち、depth が変わる。カメラ・マイク不要。
## 既知の問題・妥協点
- 空のうねりは「言われれば分かる」程度のまま（静止画では輪の縁が少し歪む程度）。強めると輝度が動くため抑えた。
- desktop 右上の暗い base 勾配は未対処（c51 の再燃を避け全体は触らず）。
- 幽霊の指の depth が連続して上書きされるため dataset.depth は「最後の音」。
## 変更した主なファイル
app/src/wave-gl.js, app/src/audio.js, app/src/main.js(EOL+depth), app/NOTES.md
## 司令塔への申し送り
次は右上の base 暗化（wave-gl 108 行）を局所で和らげるか、案C など別軸へ。
