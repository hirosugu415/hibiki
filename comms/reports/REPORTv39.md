# REPORT v39  (mode: repair)
## やったこと
1. app/ を変更しない + build を 1 回だけ実行 — **完了**。`npm run build` 成功（12 modules, 58ms、index.html 4.50kB / css 7.61kB / js 39.23kB）。ビルド前後とも `git diff --stat -- app` は空。
2. chromium・playwright・probe を起動しない — **完了**。起動していない（shots.json も未変更）。
3. REPORT に事実と推測を分けて書く — **完了**（下記）。

## ORDER からの逸脱
なし

## 動作確認
### 事実（このターンで実際に確認）
- `cd app && npm run build`: 成功。
- `git diff --stat -- app`: ビルド前・後とも空（app/ に差分なし）。
- `git status`: 開始時点で変更は `comms/STATE.json` のみ（ハーネス管理、触っていない）。
- `loop.mjs` 常駐プロセス（Get-CimInstance で確認）:
  - `node harness/loop.mjs builder` の実 node プロセスが **2 本**（PID 8332 と 29712）。それぞれに cmd.exe ラッパー（26088, 27752）が付いている。
  - `node harness/loop.mjs commander` の実 node プロセスは 1 本（PID 27204、ラッパー 32844）。
- 止めたプロセスは無い（ORDER どおり人間への申し送り）。

### 推測（未検証）
- c38 の撮影 launch 失敗は、builder が二重に常駐していることによる chromium 起動の競合が原因ではないかという見立て。このターンでは検証していない（撮影を起動していないため）。

## デモモード
変更なし。`?demo=1` の幽霊の指の動作は、このターンは確認していない（probe を起動しないため）。公式撮影に任せる。

## 既知の問題・妥協点
- 二重 builder（PID 8332 / 29712）が残っている。人間が片方を止めない限り、撮影の確率的な失敗が再発しうる。
- 動き（立ち上がり .7 秒）は引き続き静止画では未検証。

## 変更した主なファイル
- `comms/reports/REPORTv39.md`（本ファイルのみ）

## 司令塔への申し送り
- 撮影が healthy=true になったら、次の normal で追想の再導入（小さく）か、凪／夜／暁の色味差の強化を検討するのがよさそう。
- 二重 builder は人間の対処が要る。
