# REPORT v35  (mode: repair)

## やったこと
1. app/ 無変更 — **完了**。`git diff --stat -- app/` は空（`app/dist` は gitignore 対象のビルド成果物のみ更新）。
2. 読み取り専用の環境診断 — **完了**（`Get-CimInstance` / `Get-ChildItem` のみ。何も終了・削除していない）。結果は下表。
3. 自分が起動した物の後始末 — **完了**。自分が起動したプロセスは probe の chromium のみで、probe 終了時に自動で閉じた（診断後に ms-playwright 系プロセスは 0 個）。
4. probe 1 本（desktop, `?demo=1`）— **完了**、成功（ok=true, blank=false, 失敗ステップ無し）。

## ORDER からの逸脱
なし。ただし probe は出力先をハーネス側の現在サイクル番号に合わせるため `shots/cycle-034/probe/` に書いた（`shots/cycle-35/probe/` には steps.json のみ）。プロジェクト内で、コミット対象の app には影響しない。

## 動作確認（実測値, 2026-11-12 05:01 JST 時点）

### プロセス
| 種類 | 数 | 起動日時 | 親の生死 | ms-playwright | 1h 以上 |
|---|---|---|---|---|---|
| msedge | 8 | 11/06 19:22–19:23 | 親玉 PID 14756 の親 (8084) が **死亡＝孤児**。残り 7 個は 14756 の子 | 0 | 8（約 130h） |
| chrome | 13 | 11/09 15:46 〜 11/12 04:55 | 全て PID 21792（ユーザーの通常 Chrome, 親 explorer.exe）の子。`--headless` 無し | 0 | 12（0.1h の 1 個を除く） |
| node | 8 | 11/11 22:16 〜 11/12 00:02 | 全て生存親あり（下記） | 0 | 8 |
| headless_shell / chromium / playwright | **0** | – | – | 0 | 0 |

- msedge 孤児: 親 PID 14756 (`msedge --headless=new --user-data-dir=...\Temp\scoped_dir9640_1727186303 about:blank`)、その子 7 個 (PID 7792, 13036, 12540, 10412, 21856, 14224, 15936)。Playwright の物ではなく（`ms-playwright` を含まない、`scoped_dir` は Edge の WebDriver/自動化系）、11/06 起動でこのハーネスより前。**未終了・司令塔判断待ち**。
- chrome: 21792 はユーザーの通常 Chrome（11/09 から常駐）で、配下は通常のレンダラー等。Playwright の chromium ではない。
- node のうち **`node harness/loop.mjs builder` が 2 本**（PID 8332 = 11/11 23:46 起動、PID 29712 = 11/12 00:02 起動。それぞれ別の `npm run builder` 配下）。`harness/loop.mjs commander` は 1 本（27204）、`vite` dev (26576, 11/11 22:16)。→ **builder ループが二重起動している**。

### Playwright 系の孤児一覧（要求どおり）
**孤児 Playwright chromium: 0 個**（PID・起動日時の一覧は空）。

### リソース
- 空きメモリ: **17,605 MB**（総 32,469 MB）。空き仮想メモリ 13,166 MB。
- C: 空き容量: **1,651.7 GB**（プロジェクトも C:）。
- `%TEMP%` の `playwright_chromiumdev_profile-*`: **0 個**（`playwright*` で始まるフォルダ自体も 0）。
- `%LOCALAPPDATA%\ms-playwright` には chromium-1254 / chromium_headless_shell / ffmpeg-1013 が存在（ブラウザ本体は有る）。

### 撮影結果の事実（`shots/*/meta.json` と mtime）
| cycle | 現在の meta.healthy | ファイル更新時刻 |
|---|---|---|
| 031 | false（launch 失敗） | 04:50 |
| 032 | **true** | 04:53 |
| 033 | false（launch 失敗） | 04:55 |
| 034 | **true**（画像 6 枚・video あり・consoleErrors 0） | 04:59〜05:00 |

- ORDER は「c34 の meta は screens=[] / healthy=false」としていたが、**現在の `shots/cycle-034/meta.json` は healthy=true**（画面 6 枚、白画面なし）。LOG 上は c34 は失敗扱いのままなので、撮影はその後に再実行されたと思われる。
- 成否が **031 失敗 → 032 成功 → 033 失敗 → 034 成功** と交互になっている。builder の log 時刻も 04:49 / 04:52 / 04:55 / 04:59 と 3〜4 分間隔で、**2 本の builder ループ（かつ commander ループ）が同じ撮影を取り合って競合している**疑いが強い。

### 結論（一文）
**孤児 Playwright chromium は 0 個、空きメモリは 17,605 MB（余裕あり）、一時プロファイルも 0 個で、資源枯渇や孤児 chromium は原因ではない。有力な原因は、`harness/loop.mjs builder` が 2 本同時に常駐していること（撮影の launch が互いに衝突し `Target page, context or browser has been closed` になる）で、孤児なのは 11/06 の古い msedge 8 個のみ（Playwright とは無関係）。**
※ 競合の確証（同時刻の launch ログ）までは取っていない。仮説として扱う。

### probe（desktop `?demo=1` 1 本、単独実行）
build ok（53ms）→ goto → wait → shot → eval すべて ok、blank=false、コンソールエラー無し。`dataset.audio` は "idle"（ジェスチャ前のため。タップ後に running になることは過去の probe で確認済み、今回は触れていない）。この時点で Playwright chromium の launch 自体は成功しており、**単独なら起動できる**。

## デモモード
変更なし。`?demo=1` で幽霊の指が演奏する（今回の probe で desktop 表示を確認）。

## 既知の問題・妥協点
- 二重 builder ループが原因という点は状況証拠のみ（プロセス生成時刻・成否の交互パターン）。launch 失敗時刻と別ループの撮影時刻が重なっているかのログ照合はしていない。
- 私は `harness/` や STATE を触れないため、二重起動の解消（片方の `npm run builder` の停止）は実施していない。他人のプロセスの可能性があるので終了もしていない。
- `comms/STATE.json` はこのターン開始時点で既に変更済みだった（ハーネスによる更新。私は触っていない）。

## 変更した主なファイル
なし（app/ ゼロ変更）。追加は `comms/reports/REPORTv35.md` のみ。

## 司令塔への申し送り
1. **最優先: 人間（またはハーネス側）が、重複している `node harness/loop.mjs builder`（PID 8332 と 29712 のどちらか。古い方 8332 が 11/11 23:46 起動、親 `npm run builder` は bash PID 24076 / 11300）を 1 本にする**必要がある。私の権限（プロジェクト外・harness 外の操作禁止、他人のプロセス終了禁止）では対応不可。
2. 11/06 の msedge headless 孤児（PID 14756 ほか 7 個）は、メモリ的には無害（空き 17GB）。放置で可、気になるなら人間が終了。
3. 次の normal では、撮影が通る前提で「響」と石の静止画での情報量を磨く。app は変更無しで健全。
