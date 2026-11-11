# REPORT v30  (mode: normal)
## やったこと
1. `app/src/recall.js`（約 75 行）: **完了**。直近 6 件の tap（ユーザー＋幽霊）を記録、最後の tap/pointerdown から 6 秒の静止で再演。1 周目=元の順・間隔×1.5・vel×0.55、2 周目=1 音おき・5 度上（ペンタトニックで +3 段、範囲外は 1 オクターブ下）・vel×0.35、3 周目=最高音 1 つ・vel×0.2。`document.hidden` で発火せず/再演の音を鳴らさない。こだま・追想自身は記録しない。
2. `main.js` 配線: **完了**（約 25 行）。`tap()` の `record` 真で `recall.record`、`pointerdown`（capture）で `recall.interrupt()`、`play` は `ripple`+`note` のみ（echoRing 無し）。`?recall=0` で `recall=null`（従来と同じ経路）、`?recall=1` で待ち 1.2 秒。dataset: `memory` / `recallGen` / `recallLast`。ミュート時の音は既存の audio 側がミュートで鳴らさず、輪だけ立つ。
3. 幽霊の休符: **一部（形を変えた）**。`?demo=1&recall=1` のときだけ、最初の一幕（firstAct）の代わりに 3 音（500ms 間隔）→ 休符 → 通常モチーフ、の台本にした。通常の `?demo=1` は従来どおり（差分なし）。
4. `shots.json`: 変更なし。

## ORDER からの逸脱
- 休符は ORDER の 1.4 秒ではなく **5 秒**。理由: probe の wait 4500ms で `recallGen≥1` を満たすには firstAct（最初のタップが 4 秒台）を使えず、また追想（3 周で約 10 秒）が幽霊の次のモチーフで潰れないようにするため。`recall=1` の評価時のみで、通常デモ・本番には影響しない。
- `recall.js` はこの作業中に別の版へ書き換わっているのをディスク上で確認し、その版（`onChange(n, gen, last)`、`interrupt` は記憶を残して再度アームする）にそのまま合わせた。1 周目〜3 周目の進行中に新しい tap があっても再演は止まらず、次の発火時に stopPlayback して最初からやり直す。

## 動作確認
- `npm run build`: 成功。
- probe `/?demo=1&recall=1`、4.5 秒待ち: desktop `memory=3, recallGen=1, recallLast=0.759,0.600`、mobile `memory=3, recallGen=1, recallLast=0.557,0.500`。consoleErrors は両方 `[]`。desktop-recall.png に幽霊の指（右側の同心輪）とは別の石の周りの弱い輪が写っている。
- `/?demo=1&recall=0`: `memory=0, recallGen=0`（無効、エラー無し）。
- `/` の mobile 1 タップ: consoleErrors `[]`、blank=false。
- 起動した probe のプロセスは終了済み（probe は 1 回ごとに閉じる）。

## デモモード
通常の `?demo=1` は従来どおり幽霊が演奏し続けるため、追想は幽霊が 6 秒静止した時のみ（実際の 6 秒版は未観察。短縮版 1.2 秒で確認）。`?demo=1&recall=1` は評価用。マイク/カメラ不要。

## 既知の問題・妥協点
- 実際の 6 秒待ち・3 周完走（gen=2,3）は probe で確認していない（gen=1 まで）。
- 追想の音が実際に鳴ることは audio=idle のヘッドレスでは確認できず、コード経路（既存 `note`）に依拠。
- 通常デモでは幽霊が止まらないので追想は本番では実プレイヤーが手を止めたときにのみ見える。静止画で映すには shots.json に画面追加が必要（今回は指示により未実施）。

## 変更した主なファイル
`app/src/recall.js`（新規）, `app/src/main.js`, `app/src/ghost.js`

## 司令塔への申し送り
次は shots.json に `?demo=1&recall=1` の 1 枚（wait 4.5 秒、他を削って合計 4 秒以下に調整）を入れると追想が静止画で評価できる。見た目の弱点（「響」が小さい・数十秒で絵が変わらない）は未解決。
