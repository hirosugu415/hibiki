# ORDER v33  (mode: repair)
## 目的
c32 の公式撮影が `browserType.launch: Target page, context or browser has been closed` で失敗した（`desktop-home.png` のみ、`screens: []`、healthy=false）。app は健全（司令塔の probe で確認済み）なので、撮影の負荷を下げて健全性を取り戻す。**何も変えないことが最善の修復になりうる。**

## 現状（前提）
- c32 のハーネス自動 rollback で app/ は 723bd57 の状態に戻っている。`app/src/recall.js` は存在せず、`app/shots.json` は 4 画面（home / touched / echo / hold）の元の姿。**追想（recall）はこのサイクルで復活させない。** REPORT v32 の「recall に置換」はもう当てはまらない。

## やること（優先順）
1. **健全性の再確認（app/src は無変更）**。`cd app && npm run build` → `node harness/tools/probe.mjs` を desktop / mobile で **1 本ずつ順に**（並列禁止）。`?demo=1` で ok=true・blank=false・consoleErrors=[]。
   - 受け入れ条件: build 成功、両ビューポートでコンソールエラー 0、画面が白くない。
2. **撮影負荷の軽減（`app/shots.json` のみ編集）**。`echo` 画面を **削除** して 3 画面（home / touched / hold）にする。各画面の wait 合計は 4 秒以下のまま。`touched` の clickAt は **スマホ幅 390 に収まる `[190, 400]` のまま**（c29 で調整済みの値）。
   - 受け入れ条件: `shots.json` が妥当な JSON で画面数 3。probe で `touched` 相当（wait600→clickAt[190,400]→wait100）と `hold` 相当を desktop / mobile で実行して ok・blank=false・コンソールエラー 0。1 度でも失敗したら `shots.json` を元に戻し、変更ゼロで終える。
3. **後始末**。自分が起動した vite / chromium / node は全て終了させる。他人の常駐プロセスや古い dev サーバには触らない。

## やらないこと
- 新機能・UI 追加・CSS 変更・`wave-gl.js` の変更・recall の復活・ライブラリ追加。
- `harness/`・`comms/STATE.json`・`comms/LOG.md`・`comms/VISION.md`・ルートの package 系・`.gitignore` の編集。
- probe や撮影の並列起動。

## 見た目・UX の要求
- 変更しない。デスクトップ 1280×800 とスマホ 390×844 の両方で白画面・崩れが無いことだけ確認する。

## デモモード
- `?demo=1`。カメラ・マイク不要。

## 作業役への注意
- 失敗して自動 rollback されると成果を失う。変更は `shots.json` の 1 ファイルに限定し、確認できなければ戻す。
- REPORT には、**実際に今のコードで確認した事実**（recall.js の有無、probe の dataset 値、生成画像を開いて見た内容）を書く。前サイクルの REPORT をコピーしない。コミットに Claude を貢献者として入れない。
