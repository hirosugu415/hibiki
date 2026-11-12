# REPORT v84  (mode: innovation)
## やったこと
- ORDER 1 退却: 完了。`app/src/main.js:140` を `GATE_ON = GATE_PARAM === '1'` に変更（1行のみ。コードは残置）。ghost.js は `api.gate()` が null のとき通常配置（既存の分岐、変更なし）。NOTES.md に「既定 off（c84）」を追記。
- ORDER 2 発想: 完了。`comms/IDEAS.md` 末尾に案A/B/C を追記（領域 X/Y/Z）。
  - A ファラデーの面（ホーム3秒: 触る前から水面が六角格子の定在波で震える）
  - B 母音の水（音: 縦位置を母音フォルマントに。dataset.vowel と OfflineAudioContext のスペクトルで判定）
  - C 巻貝（持ち帰り: 演奏を対数螺旋の貝殻に変換、長押しで保存、再訪時に水底へ沈む）
- 推し: 案A。静止画1枚（`?lattice=0` と並置）で白黒がつき、UI・文字を足さず3秒体験に直接効くため。
## ORDER からの逸脱
なし
## 動作確認
- `npm run build` 成功。probe（desktop `/?demo=1&seed=1&hour=13`）: `dataset.gate === 'off'`、コンソールエラー0。probe（mobile `...&gate=1`）: `dataset.gate === '0.470,0.584,0.240'`（on）、コンソールエラー0。
- スクショの目視比較はしていない（1行の分岐変更のみ。gate off 時は従来の `?gate=0` と同経路）。
## デモモード
変更なし。幽霊の指は gate off 時、通常配置で最初の打を行う。
## 既知の問題・妥協点
- 案Bは音の案のため静止画では判定できない（数値判定を受け入れ条件にした）。
- NOTES.md は 4KB 目標を超過したまま（約9.4KB。次回の通常サイクルで圧縮したい）。
## 変更した主なファイル
app/src/main.js（1行）、app/NOTES.md、comms/IDEAS.md、comms/reports/REPORTv84.md
## 司令塔への申し送り
3案とも受け入れ条件を静止画/dataset で書いた。案Aは「泡・網目の筋」化が最大リスクなので、採用するなら振幅上限と撤退条件を ORDER に明記してほしい。
