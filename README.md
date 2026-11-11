# アプリ自律進化ハーネス

人間が仕様を与えず、Claude Code 2体（**builder**＝作業役 / **commander**＝司令塔）が交互に動いて、
Web アプリを半日〜それ以上、自律的に進化させる実験の仕組みです。ここにあるのは「アプリ本体」ではなく、それを回すハーネスです。
`app/` は空の Vite 雛形（vanilla JS）で、最初のジャンルは commander が自分で決めます。

## セットアップ（初回のみ）

前提: Node.js 20 以上、Git、Claude Code CLI（ログイン済み）。

```powershell
npm run setup
```

中身は `npm install` → `npm --prefix app install` → `npx playwright install chromium` です。個別に実行しても構いません。

`claude` コマンドは PATH → `~\.local\bin` → npm グローバル → VS Code 拡張内のバイナリ、の順にハーネスが探します。
見つからない場合は `harness/config.json` の `claude.command` にフルパスを書いてください。

## 起動（2つのターミナル）

```powershell
# ターミナル1
npm run builder
# ターミナル2
npm run commander
```

どちらを先に起動しても構いません。それぞれが `comms/STATE.json` を数秒おきに監視し、自分の番になったら役割プロンプトを渡して
`claude -p --dangerously-skip-permissions --output-format stream-json --verbose` を1回実行し、終わったら番を相手に渡します。
出力はターミナルに流れつつ `logs/<role>-cNNN.log`（生の JSON ストリーム）にも保存されます。
中断しても `STATE.json` から同じターンを再開できます。

最初の起動時にハーネスが `git init` し、初期コミットを作ります（`user.name` / `user.email` が未設定の場合だけローカルに仮設定）。

## 1サイクルの流れ

| 段階 | 担当 | 内容 |
|---|---|---|
| サイクル0 | commander | ジャンルを自由に決め、`VISION.md`（北極星・変更不可）と最初の `orders/ORDERv1.md` を書く。ありがちなアプリは避ける |
| 1 | builder | `ORDERvN` を実装 → app をビルド → `reports/REPORTvN` を書く → git commit |
| 2 | ハーネス | ビルド → `vite preview` → Playwright でデスクトップ幅(1280×800)とスマホ幅(390×844)を撮影。コンソールエラー・ビルド失敗・真っ白判定を記録（`shots/cycle-NNN/`）。差分資料も生成 |
| 3 | commander | スクショ（画像）・REPORT・差分を見て、VISION に照らして**辛口**で採点 → `feedback/FEEDBACKvN` と `orders/ORDERv(N+1)`。必要なら probe ツールで実操作して確かめる。「磨く(polish)」か「方向転換(pivot)」かを毎回明記 |
| 4 | ハーネス | `LOG.md` に1行追記 → git commit → タグ `cycle-NNN` → 次のサイクルへ |

## フォルダ構成

```
harness/          ループ・プロンプト・撮影など。エージェントは編集禁止（変更されたら git で元に戻す）
  config.json     設定（実行中に編集すると次のターンから反映）
  loop.mjs        builder / commander のループ本体
  prompts/        役割プロンプト builder.md / commander.md
  lib/ tools/ dryrun/ timelapse.mjs
app/              アプリ本体（Vite）。app/shots.json が「撮影する画面」の宣言
comms/            2体のやり取り
  VISION.md       北極星（サイクル0で確定、以後変更禁止）
  STATE.json      { cycle, turn, mode, … }
  orders/ORDERv1.md …     commander → builder の指示（バージョンごとに別ファイル）
  reports/REPORTv1.md …   builder → commander の報告
  feedback/FEEDBACKv1.md … commander の評価（先頭に SCORE / DIRECTION / SUMMARY）
  IDEAS.md        革新的アイデアの提案と採否の記録（追記式）
  LOG.md          全サイクルの1行要約（ハーネスが追記）
shots/cycle-NNN/  スクショ、meta.json、console-errors.log、build.log、diff.*
logs/             claude の出力ログ（生の JSON ストリーム）
```

`ORDER` / `REPORT` / `FEEDBACK` はサイクル番号 `N` ごとにファイルを分けています（`ORDERv{N}` は「サイクル N の builder への指示」）。

## モード

`STATE.json` の `mode` は、そのサイクルの mode です（`nextMode` は次サイクルの mode）。

- **normal**: 通常。ORDER を実装する。
- **innovation**: `innovationEvery` サイクルごと（初期値4 → サイクル4, 8, 12…）。builder は実装せず、「他のアプリにない」機能案を3つ `IDEAS.md` に書く。
  commander が VISION に照らして1つ選ぶか全部却下し、採用案を次の ORDER にする。
- **repair**: ビルド失敗・画面が真っ白・コンソールエラーがあると自動発動（innovation より優先）。新機能は禁止で、修復だけを命じる。
  修復が `repair.rollbackAfterFailures`（初期値3）サイクル連続で失敗したら、最後に健全だった状態に `app/` を自動ロールバックします。

## 止め方

プロジェクト直下に `STOP` というファイルを置きます。

```powershell
New-Item STOP -ItemType File          # キリのいいところ（いまのサイクルが完了したところ）で両方止まる
"now" | Set-Content STOP              # 今のターンが終わり次第すぐ止まる
```

再開するときは `STOP` を削除してから、もう一度 `npm run builder` / `npm run commander` を実行します（同じターンから再開します）。
`claude` の再試行待ちの最中に置いた場合は、待機を中断してそのターンは未完了のまま止まります（再開すれば同じターンからやり直し）。

## 設定（`harness/config.json`）

| キー | 初期値 | 意味 |
|---|---|---|
| `pollIntervalSec` | 5 | STATE.json の監視間隔 |
| `cycleDelaySec` | 30 | サイクル間の待ち時間 |
| `maxCycles` | 100 | 最大サイクル数（超えたら両方終了） |
| `innovationEvery` | 4 | innovation の頻度（2以上） |
| `retry.waitMinutes` | 15 | claude が失敗（使用量上限・エラー・タイムアウト）したときの待ち時間 |
| `retry.backoffMultiplier` / `maxWaitMinutes` | 2 / 120 | 連続失敗するたびに待ち時間を倍にする。上限 |
| `retry.maxOutputRetries` | 2 | 必要なファイルが書かれなかったときの再試行回数（超えたらハーネスが代替ファイルを生成） |
| `claude.command` | `"claude"` | フルパスも可 |
| `claude.model` / `effort` / `maxBudgetUsd` | null | 指定すると `--model` / `--effort` / `--max-budget-usd` を付ける |
| `claude.timeoutMinutes` | 60 | 1回の実行のタイムアウト（超えたらプロセスを終了して再試行） |
| `claude.extraArgs` | [] | 追加の CLI 引数 |
| `app.demoQuery` | `demo=1` | 撮影時に URL に付ける。アプリはこれでデモモードに入る |
| `screenshots.*` | — | 待機 ms、fullPage、無視するコンソールエラーのパターン |
| `repair.rollbackAfterFailures` | 3 | 自動ロールバックまでの連続失敗サイクル数 |

## 守り（ガード）

- **VISION.md と harness/**（および root の `package.json` など）が変更されていたら、ハーネスが各ターン終了時に git で元に戻し、`LOG.md` に `(harness)` 行で記録し、次のエージェントにも通知します。
  ※ 戻すのは事後です。エージェントの権限確認はスキップされているため、「プロジェクトフォルダの外に触れない」は役割プロンプトによる指示で担保しています（強制はしていません）。
- **コミットに Claude を貢献者として入れない**: プロンプトで禁止し、`claude --settings harness/claude-settings.json` で attribution を空にし、
  さらに git の `commit-msg` フック（`harness/tools/strip-attribution.mjs`）が `Co-Authored-By: Claude …` などを必ず除去します（起動時に `.git/hooks` へ自動設置）。
- 使用量の上限などで `claude` が失敗したら待って再試行します（上表）。

## 評価をブラウザで行うための約束（エージェントにも伝えてあります）

- ブラウザの能力はフルに使ってよい（Canvas / WebGL / Web Audio / カメラ・マイク / センサー / ブラウザ内機械学習 / npm ライブラリ）。
- ただし評価は Playwright のヘッドレス Chromium なので、**カメラ・マイクが無くても `?demo=1`（または入力取得失敗時）で主要機能が動く**こと。
  撮影用ブラウザには偽のカメラ/マイクが許可された状態で起動します。

### steps（`app/shots.json` と probe の共通書式）

```json
{ "screens": [
  { "name": "home", "url": "/", "steps": [] },
  { "name": "play", "url": "/", "steps": [ { "click": "#start" }, { "wait": 800 } ] }
] }
```

`click` / `clickAt:[x,y]` / `dblclick` / `hover` / `fill:{selector,value}` / `press` / `type` / `wait`(ms) / `waitFor` / `scroll`(px) /
`drag:{from,to}` / `goto` / `eval` / `shot`。各画面は毎回読み込み直してから steps を実行し、最後に1枚撮ります。
step が失敗しても撮影は続け、`meta.json` の `warnings` に記録します（ヘルス NG にはしません）。

### probe（実操作ツール。commander と builder が使う）

```powershell
node harness/tools/probe.mjs steps.json --viewport mobile
```

`app/dist` を `vite preview` で配信し、ステップを実行して `shots/cycle-NNN/probe/` にスクショ、コンソールエラー、`eval` の結果（JSON）を出します。`--build` で先に再ビルド。

## 観察用: timelapse

```powershell
npm run timelapse               # shots/timelapse.html（画像は相対パス参照）
npm run timelapse -- --embed    # 画像を埋め込んだ単体 HTML
```

サイクル順に、スコア推移グラフ・mode/ヘルス/方向性のバッジ・LOG の要約・デスクトップ/スマホのスクショ（クリックで拡大）を並べます。実験の途中でも生成できます。

## dry-run（claude を呼ばない動作確認）

```powershell
npm run dry-run                          # 通常2サイクル
npm run dry-run -- --break-cycle 1       # cycle 1 でビルドを壊し、repair が発動・修復されるか
npm run dry-run -- --tamper              # VISION.md / harness/ の改変が元に戻るか
npm run dry-run -- --fail-once           # claude 失敗 → 待機 → 再試行
npm run dry-run -- --always-break --cycles 3   # 修復が続かず自動ロールバックが働くか
```

`.dryrun/sandbox/` にプロジェクトのコピーを作り、そこでダミーコマンド（`harness/dryrun/fake-claude.mjs`）を使って
builder / commander の2つのループを実際に同時起動し、番の受け渡し・スクショ・commit・タグ・LOG・timelapse を自動検証して PASS/FAIL を表示します。
本番の `comms/` や git 履歴は汚れません。

## GitHub に上げる

リモート `origin` が設定されていれば、ハーネスが **builder のターン終了時と commander のターン終了時（＝各サイクルに2回）に自動で push** します
（`git push origin main` と `git push origin --tags`。タグは強制上書きしません）。push が失敗（ネットワーク・認証）しても実験は止まらず、警告を出して続行します。
設定は `harness/config.json` の `git`（`push` を false にすると無効、`remote` / `branch` / `pushTimeoutSec`）。リモートが無ければ何もしません。

初回のみ手動でリモートを設定します:

```powershell
git remote add origin https://github.com/hirosugu415/appByClaude.git
git push -u origin main --tags
```

`shots/`・`logs/`・`node_modules/`・`STOP` は `.gitignore` 済みです。

### 評価が OK のときの commander のコミット

commander は FEEDBACK を書いたあと、**評価が OK（ヘルス OK・VISION 違反なし・5点以上）なら、次の ORDER を考える前にすぐコミット**します
（`cycle N: accepted (score X/10) — 要約`）。OK でないときはコミットせず、ORDER を書いたあとにハーネスがまとめてコミットします。

## トラブルシュート

- `claude が見つかりません` → `harness/config.json` の `claude.command` にフルパス（例: `C:\\Users\\you\\.local\\bin\\claude.exe`）。
- 使用量上限 → ログに `claude 失敗` と待機時間が出て、自動で再試行します。放置で問題ありません。
- 画面が真っ白と判定される → ほぼ単色（99.95% 以上が同色）のスクショを「真っ白」とみなします。意図的に暗転だけの画面を主要画面にしないでください。
- 撮影・ビルドが壊れたまま進まない → `shots/cycle-NNN/build.log`、`meta.json` の `reasons` を見てください。
