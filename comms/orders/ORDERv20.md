# ORDER v20  (mode: repair)

## 目的
サイクル 19 のヘルス NG（撮影の起動失敗）を解消し、全ショットが撮れる状態に戻す。新機能は禁止。

## 症状（引用）
- `shots/cycle-019/meta.json`: `healthy: false`、`reasons: ["撮影処理の失敗: browserType.launch: Target page, context or browser has been closed"]`、`screens: []`。
- ビルドは成功（`build.log`）、`console-errors.log` は空。
- 司令塔が同じビルドを `node harness/tools/probe.mjs` で desktop・mobile ともに起動して動作を確認済み（アプリ本体は正常）。`app/shots.json` は有効な JSON（差分は `letter-play` の wait 1500→900 と、末尾への `letter-share` 追加のみ）。
- つまり原因は (a) ブラウザ起動時の一過性の失敗、(b) 撮影が重くなって起動後に落ちる、(c) `letter-share` ショットの `click:"#wordmark"` 経路、のいずれかの可能性。確定はしていない。

## やること（優先順）
1. **原因の切り分け**
   - `npm run build` 後に、probe で `shots.json` の各ショット相当を順に実行し、どこで落ちるか／落ちないかを記録する。特に `letter-share`（`#wordmark` クリック＋クリップボード書き込み）と、`letter-play` を単独で実行する。
   - 受け入れ条件: REPORT に、各ショットの成否と、落ちた場合はその直前のステップを書く。再現しなければ「再現せず（一過性）」と明記する。
2. **再現した場合のみ修正する**
   - 「響」クリックのクリップボード／`execCommand` 経路が、ヘッドレスで例外・フリーズ・ページクローズを起こすなら、非同期の失敗を握りつぶし、同期区間を最小化する。`navigator.share` は coarse pointer のときだけ。
   - 描画負荷が原因なら、新しい負荷は追加せず、ショットの待ち時間を調整する。
   - 受け入れ条件: probe で `desktop` と `mobile` の両方、全ショット相当が完走し、`console-errors` が 0。
3. **再現しない場合**: アプリのコードは変更せず、`shots.json` の `letter-share` の末尾 wait を 600 → 800 にするなど、撮影の余裕だけを増やす。他は変えない。

## やらないこと
- 新機能・新 UI・新ショットの追加（「響」の発見性の呼吸アニメを含む）。
- 手紙・砂州・石・波・音の仕様変更。`harness/`、`comms/STATE.json`、`comms/VISION.md` の編集。
- 新規ライブラリ、外部通信。

## 見た目・UX の要求
- 見た目は v19 のまま。desktop 1280×800・mobile 390×844 で、初画面・タップ後・手紙再演・「響」タップ後のヒントがいずれも今のまま 1 行で崩れないこと。

## デモモード
- `?demo=1` で幽霊の指が演奏すること。`?demo=1#w=PHn_AItg_xSzn_8V` でも壊れないこと。probe は常に demo 付きで起動する点に注意。

## 作業役への注意
- 修復が目的。変更は最小にする。1 つ直すたびに build と probe（desktop・mobile）で確認する。
- REPORT に、切り分けの結果（どのショットが成功・失敗したか）と、変更の有無を正直に書く。再現しなかったなら、そう書く。
- コミットに Claude を貢献者として入れない。
