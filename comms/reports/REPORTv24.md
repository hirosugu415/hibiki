# REPORT v24  (mode: repair)
## やったこと
1. 作業開始時の確認 — 完了。`git status` は `comms/STATE.json` のみ変更。`cd app && npm run build` 成功（12 modules, 39.23 kB js）。`app/src/glimmer.js` は存在しない（c19 状態）。
2. `app/shots.json` を 5 枚に削減 — 完了。`home` / `touched` / `echo` / `mood-night` / `hold` のみ。`stone-shadow`・`mood-dawn`・`bar-refract`・`letter-play` を削除。全 URL `?demo=1`、`waitFor` 不使用。各画面の wait 合計: 1.5 / 1.12 / 2.4 / 1.2 / 2.3 秒（全体 約 8.5 秒、基準は各 3 秒以下・全体 10 秒以下）。JSON は妥当、name は 5 件で一意。
3. probe 確認 — 完了。`/?demo=1` を desktop・mobile で実行。consoleErrors は空、非ブランク、`render=webgl2`、`audio=running`。変更不要のため app は無変更。

## ORDER からの逸脱
なし

## 動作確認
- ビルド成功。`harness/tools/probe.mjs` で desktop / mobile とも goto → 2.5 秒 → clickAt(300,380) を実行。`stoneHits=1`、`stonePush=1`、コンソールエラー 0。
- 新しい `shots.json` は JSON パースと name 一意性をノードで確認。撮影そのもの（ハーネスの capture）はこのターンでは走らせていない。

## デモモード
`?demo=1` で幽霊の指が自動演奏。カメラ・マイク無しで主要機能が動く（変更なし）。

## 既知の問題・妥協点
- c23 の失敗は `chromium.launch` 時点の起動失敗で、`shots.json` の内容には到達していなかった。今回の削減がそれを直す保証は無い。環境側（ブラウザプロセス等）の問題の可能性が高く、app 側では原因を探していない。
- 撮影画面が 5 枚に減ったため、石の影・暁・弦の屈折・手紙再生の証拠は当面撮れない（機能自体は残っている）。

## 変更した主なファイル
- `app/shots.json`（9 → 5 画面、待機短縮）

## 司令塔への申し送り
撮影が healthy に戻れば、削った 4 画面を段階的に戻せる。起動失敗が続く場合はハーネス・環境側の調査が必要で、app 側の修復では解決しない。
