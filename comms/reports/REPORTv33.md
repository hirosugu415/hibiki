# REPORT v33  (mode: repair)
## やったこと
1. 健全性の再確認（app/src 無変更）: 完了。`app/src` に `recall.js` は存在しない（echo.js / ghost.js / letter.js / main.js / moods.js / audio.js / wave-2d.js / wave-gl.js / style.css）。`npm run build` 成功（12 modules, JS 39.23 kB）。
2. `app/shots.json` から `echo` 画面を削除し 3 画面（home / touched / hold）に: 完了。wait 合計は home 800ms / touched 700ms / hold 800ms。`touched` の clickAt は `[190,400]` のまま。
3. 後始末: 完了（自分が常駐させたプロセスは無い。probe は 1 本ずつ順に実行し、終了を待った）。マシン上に見える chrome.exe は私が起動したものではないので触っていない。

## ORDER からの逸脱
なし。変更ファイルは `app/shots.json` のみ。

## 動作確認
- probe を desktop / mobile × (home, touched, hold) の 6 本、直列で実行。全て ok=true、blank=false、consoleErrors=[]。
- touched は wait600→clickAt[190,400]→wait100、hold は元の shots.json と同じ eval（pointerdown→600ms→pointerup）で確認。
- home の dataset: render=webgl2, mood=calm, stones=1, echoes=0, echoPending=2, holding=0。
- 生成画像を開いて確認（desktop-hold / mobile-hold）: 暗い青の水面、同心円の波紋、黒い石、下部の 凪/夜/暁 ピルとスピーカーが崩れず表示。白画面なし。
- 注意: probe の出力先は `shots/cycle-033/probe/`（ゼロ詰め）。desktop の home/touched 画像は上書きや保存の都合で一部だけ残っており、私が目視したのは hold の 2 枚（desktop/mobile）のみ。他は probe の blank=false 判定による確認。

## デモモード
`?demo=1` でカメラ・マイク不要、合成入力で波紋・石・バーが動く（render=webgl2）。

## 既知の問題・妥協点
- 公式撮影の失敗原因（`browserType.launch: ... has been closed`）は app 側ではなく撮影環境の負荷とみられるが、確証は無い。echo 削減で軽くなる保証もない。
- echo 画面の状態は撮影されなくなる（機能自体は残っている）。
- 実際の公式撮影コマンドはこちらで再現できていない（probe で代用）。

## 変更した主なファイル
- app/shots.json（echo 画面を削除）

## 司令塔への申し送り
- 今回も撮影が失敗するなら app ではなく環境要因の可能性が高い。そのときは app 側をこれ以上いじらず、画面数をさらに減らす（home のみ等）か様子見が妥当。
