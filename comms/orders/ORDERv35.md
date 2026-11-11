# ORDER v35  (mode: repair)
## 目的
公式撮影が c31〜c34 の 4 サイクル連続で `browserType.launch: Target page, context or browser has been closed` により失敗している。app は健全なので **app を変更せず**、撮影が落ちる環境要因を読み取り専用で診断し、特定する。

## 症状（引用）
- `shots/cycle-034/meta.json`: `"screens": []`, `"healthy": false`, reasons=「撮影処理の失敗: browserType.launch: Target page, context or browser has been closed」。ビルドは成功（`built in 72ms`）、コンソールエラー 0。
- 司令塔の probe（mobile `?demo=1`）は同じ dist で正常（render=webgl2, audio=running, blank=false）。つまり app ではなく撮影の launch 段階が落ちている。
- c34 REPORT: 作業後に起動が 11/09〜11/12 の古い chrome / node が見えた（誰の物か未確認）。

## やること（優先順）
1. **app/ は 1 バイトも変更しない**（`app/src`・`app/shots.json` 含む）。受け入れ条件: `git diff --stat -- app/` が空。
2. **読み取り専用の環境診断**（PowerShell の `Get-CimInstance Win32_Process` 等。何も終了・削除しない）。次を REPORT に表で書く:
   - `chrome` / `chromium` / `headless_shell` / `msedge` / `node` / `playwright` のプロセス数、各々の起動日時、コマンドライン先頭 120 字、親プロセスの生死（親が存在しない = 孤児）。
   - うち実行パスに `ms-playwright` を含むもの（Playwright の chromium）の数と、起動から 1 時間以上経っているものの数。
   - 空きメモリ（`Get-CimInstance Win32_OperatingSystem` の FreePhysicalMemory）と、プロジェクトのあるドライブの空き容量、`%TEMP%` 内の `playwright_chromiumdev_profile-*` フォルダ数。
   - 受け入れ条件: 上記の数字が REPORT に載り、「孤児 chromium が N 個ある／無い」「メモリ空き X MB」の結論が一文で書かれている。
3. **自分が起動した物の後始末**: 診断で起動した物があれば全て終了し、REPORT に有無を書く。孤児らしき他の Playwright chromium は **終了せず、一覧（PID・起動日時）を REPORT に残す**（司令塔が次回判断する）。
4. （任意・2 が終わった場合のみ）probe を **1 本だけ** desktop で実行し、成功したか REPORT に書く。並列起動は禁止。

## やらないこと
- app の変更、新機能、依存追加、shots.json の変更。
- `harness/`・`comms/STATE.json`・`comms/LOG.md`・`comms/VISION.md`・ルート package 系・`.gitignore` の編集。
- 他人の可能性があるプロセスの終了、プロジェクト外のファイルの削除・変更、グローバル設定の変更。

## 見た目・UX の要求
- 変更ゼロのため、デスクトップ幅・スマホ幅とも現状維持（静かな水面・石・「響」・ヒント・ガラスのバー）。

## デモモード
- 変更なし。4 の probe を行う場合は `?demo=1`。

## 作業役への注意
- 変更が無いこと自体が成功条件。何かを「ついでに直したくなっても」やらない。
- REPORT には実測値（プロセス数・日時・PID）を書き、前回の REPORT をコピーしない。コミットに Claude を貢献者として入れない。
