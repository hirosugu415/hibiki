SCORE: 3/10
DIRECTION: polish
SUMMARY: 撮影が起動失敗でまた証拠ゼロ。app は無変更で健全、ヘルス規則で3点上限
# FEEDBACK v23

## VISION 適合（絶対のルールを守れているか）
**守れている（app は c19 状態のまま）。** 根拠は自分の probe（`shots/cycle-023/probe/desktop-touched.png`）。`/?demo=1` を開いて 1.5 秒で非ブランク、`render=webgl2`・`audio=running`。タップ 1 回で触れた位置に細い同心の光輪が広がり、`stoneHits=1`・`stonePush=1`（音と石は状態で確認）。左上の「響」、下部のガラス質ピル（凪／夜／暁＋音量）は一貫していて崩れなし。ただしヘルス NG のため採点は上限 3 点。

## 採点の根拠
- `meta.json`: healthy=false、`screens: []`、理由は `browserType.launch: Target page, context or browser has been closed`。ビルド成功・コンソールエラー 0。公式の撮影証拠は 0 枚。
- 失敗は `launchBrowser()`（`harness/lib/capture.mjs`）の Chromium 起動時点で、`shots.json` の中身（画面数・待機）に到達する前。app も `shots.json` も原因ではない。c19・c20・c22・c23 で同じ失敗が出ていて、環境側（ブラウザプロセス・メモリ・残留プロセス等）の問題とみなす。
- REPORT v23 の `shots.json` 軽量化（14→9 枚）は REPORT どおり `diff.stat.txt` と一致し、JSON も妥当。ただし起動失敗には効かない。REPORT 自身も「直る保証はない」と書いていて、その自己認識は正しい。
- 体験の質は c19 水準（実質 7 点相当）。ただし新しい前進は 0 で、ヘルス規則により 3 点。

## 動作確認で分かったこと
- probe（desktop, `/?demo=1`）: goto → 1.5 秒 → clickAt(300,380)。エラー 0、非ブランク。dataset は `render=webgl2, audio=running, stones=1, stoneHits=1, stonePush=1, letter=n=1;len=9, mood=calm`。
- つまり app は壊れていない。壊れているのはハーネスの撮影環境。

## 方向性の判断
polish。方向転換の理由は無い（スコアは 7 で横ばい後、環境障害で 3）。app の機能追加は、撮影が healthy になるまで凍結する。

## 次に最も効くこと
1. app を一切触らない（機能追加・復元禁止）。壊れていないものを「直そう」として壊さない。
2. `shots.json` をさらに減らす（5 枚程度）。起動失敗に効く保証はないが、撮影が起動できた回に確実に完走させるため。
3. 起動失敗が続く場合は、ハーネス・環境側の問題として REPORT に事実だけ書き、無理な「修復」をしない。
