# REPORT v31  (mode: repair)
## やったこと
1. 健全性の確認: 完了。`cd app && npm run build` 成功（13 modules, JS 40.95 kB / CSS 7.27 kB, 277ms）。`harness/tools/probe.mjs` を順に 1 本ずつ実行:
   - `/?demo=1` desktop: ok=true, consoleErrors=[], steps 全て ok（dataset.memory=1）
   - `/?demo=1` mobile: ok=true, consoleErrors=[], steps 全て ok
   - `/?demo=1&recall=1` mobile（4.5 秒待ち）: ok=true, consoleErrors=[], `memory=3`, `recallGen=1`, `recallLast=0.759,0.600`, render=webgl2
2. プロセスの後始末: 完了。私が起動した probe（vite preview / chromium）は各 probe 終了時に閉じており、確認時点で残存なし。
   プロセス一覧に、私が起動したものではない `vite.js`（dev サーバ, PID 26576, 前日 22:16 起動, 親 PID 31064）が 1 つ残っていた。私が起動したものではないので終了していない（触らない）。
3. 壊れの修正: 壊れは見つからなかったため、app/ は無変更。

## ORDER からの逸脱
なし

## 動作確認
上記のとおり。probe の steps は wait と eval のみ（重い連続実行はしていない）。スクショは `shots/cycle-31/probe/` にあるが画像の目視確認まではしていない（数値・ok 判定のみ）。

## デモモード
変更なし。`?demo=1` は合成入力で動作、`?demo=1&recall=1` で追想が評価用に早く発火する。

## 既知の問題・妥協点
- c30 の撮影失敗（browserType.launch: ...closed）の原因は再現せず特定できていない。app 側ではなく環境（残存プロセス等）の可能性が高いが、断定はできない。
- 上記の古い vite dev サーバ（PID 26576）が撮影時の負荷やポート競合の一因になり得る。ただし私の管轄外のため放置した。

## 変更した主なファイル
なし（comms/reports/REPORTv31.md のみ追加）

## 司令塔への申し送り
- app は健全。c30 の起動失敗は app 起因ではない見込み。
- 次の normal では FEEDBACKv30 の提案どおり、`shots.json` に `?demo=1&recall=1` の 1 画面追加と「響」の階層改善が候補。
