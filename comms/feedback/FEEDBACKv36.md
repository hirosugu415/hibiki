SCORE: 3/10
DIRECTION: polish
SUMMARY: app無変更の修復。撮影launch失敗でヘルスNG(上限3点)。app自体はprobeで健全
# FEEDBACK v36

## VISION 適合（絶対のルールを守れているか）
**違反の証拠は無い（守れている）。ただし公式ヘルスは NG。**
- `shots/cycle-036/meta.json`: build ok、`screens: []`、healthy=false、reasons=「撮影処理の失敗: browserType.launch: Target page, context or browser has been closed」。コンソールエラーは 0 件。
- 一方、`shots/cycle-036/` には `desktop-home.png` と `desktop-touched.png` が残っていた（meta には載っていない）。どちらも暗い水面、左上「響」、中央の石、下部のガラス質バー（凪／夜／暁／音）、一言ヒント「触れてみてください」が崩れず表示され、touched では左端に滑らかな輪が出ている。余白・タイポ・配色は一貫している。
- 司令塔の probe（`?demo=1`、モバイル 390×844、2 秒待機→タップ）: `shots/cycle-036/probe/mobile-tap.png` でタップ地点(300,300)に輪が出て、石・バー・「響」ははみ出し無し。blank=false、`dataset.render=webgl2`、`dataset.audio=running`、エラー無し。

## 採点の根拠
- ヘルス NG は規定により最大 3 点。app の質を下げた結果ではなく、撮影インフラの失敗が理由。app の質は c34 の 6 点相当を維持しているが、それを今回の点にはしない。
- `diff.stat`: `app/shots.json`（wait 1300→800）と `app/src/style.css`（立ち上がりアニメーションの削除など）の差分があるが、これはハーネスが app/ を最後に健全だった状態 (37f26b81) へ自動ロールバックした結果。REPORT は「app/ を変更していない」と述べており、これは作業役の手による変更ではない点で矛盾しない。ただし、c34 で入れた「立ち上がり」CSS（wordmark-in／bar-in／hint-in の調整）は、このロールバックで失われた。
- REPORT の「builder が 2 本」という申告は司令塔も確認した: `loop.mjs builder` は PID 8332（11/11 23:46 起動）と PID 29712（11/12 00:02 起動）の 2 本、`commander` は PID 27204 の 1 本が常駐。撮影の launch 失敗が交互に出る経緯（c31〜c36）と整合する。
- REPORT は「今回は chromium を起動していない」と書いており、これは撮影の失敗要因が作業役側に無いという主張。司令塔側の probe 実行は撮影後で、因果は逆。

## 動作確認で分かったこと
- 単独の probe は成功。app も chromium も健全。失敗するのは、撮影が他のループの chromium と並行した場合だけ、という状況証拠がさらに強まった。
- 司令塔・作業役は `harness/` や他人のプロセスに触れないので、解消には人間が重複 builder を 1 本にするしかない。

## 方向性の判断
polish。壊れているのは app ではなく撮影の運用。方向転換する理由は無い。

## 次に最も効くこと
1. app/ を変更せず build だけ確認し、撮影が healthy=true で通るかを見る（修復の継続）。
2. 作業役は、撮影が走る間は chromium・probe を起動しない。
3. 撮影が通ったら次の normal で、ロールバックで失われた立ち上がり演出を小さく入れ直し、それから追想を再開する。
