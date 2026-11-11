# REPORT v21  (mode: repair)
## やったこと
1. **`app/shots.json` を軽くした（完了）**: wait の合計 約55,000ms → **23,640ms**（受け入れ条件 25,000ms 以下）。画面は 14 → **12**（`calm-after`・`stone-push` を削除。`stone-shadow2` は残した）。`home`・`touched`・`idle`・`hold`・`echo`・`stone-shadow`・`bar-refract`・`letter-play`・`letter-share`・`mood-night`・`mood-dawn` はすべて残している。
   - 固定待ちを減らし、`idle` は `waitFor body[data-stone-laps='1']` → 4500ms → `waitFor laps='2'`（2回、最大計 10 秒）に、`hold` は 1500ms → `waitFor holding='1'` → 1800ms にして、アプリ側の進行に追従させた（`waitFor` の timeout はハーネス固定の 5 秒なので 2 段に分けた）。
   - `echo` は戻りが 5.5 秒後なので 5700ms（元 6600）。mood 系は 700ms（元 1500）。
2. **`letter-play` の証拠（完了、ただし ORDER の秒数とは違う）**: 撮影ハーネスが `goto` 後に settleMs=1500ms 待つため、画面の `url` だけでは「goto 直後 600〜900ms」で撮れない。そこで `url` を `/?demo=1&pre=1`（別クエリ）にし、steps の先頭で `goto` → `wait 560` → `shot first` → `wait 300` → `shot second` とした。
   - `first`: 手紙の最初の輪（左の輪）＋ヒント「だれかの水面」。probe で 2 回再現（lp1/lp2）。
   - `second`: 輪が 3 つ（左・上中央・右下）＋ヒント「だれかの水面」。
   - ORDER は 2 枚目を 2.5〜3 秒後としていたが、**ヒントの文言差し替えは 2000ms で元に戻る**（`hintSay('だれかの水面', 2000)`）ので、その時刻だとヒントが写らない（実際に 3.3 秒後の撮影では「触れてみてください」に戻っていた）。ヒントと別位置の輪の両方を写すことを優先して約 1.3 秒後にした。
3. **撮影ツールを通して確認（完了）**: 下記「動作確認」。
4. **アプリ側の負荷点検（完了。私はコード無変更。ただし下記「既知の問題」の未コミット差分あり）**: 下記。

## ORDER からの逸脱
- `letter-play` の 2 枚目のタイミングが 2.5〜3 秒ではない（理由は上記。ヒントが 2 秒で消えるため）。
- それ以外なし。`app/` のコードは 1 行も変えていない（変更は `app/shots.json` のみ）。

## 動作確認
- `cd app && npm run build`: 成功。
- harness の撮影ループ（`captureCycle` と同じ手順: viewport ごと・画面ごとに新規コンテキスト、goto → settle 1500ms → steps → 800ms → 最終 shot、`page.setDefaultTimeout(5000)`）を `harness/lib` の関数で再現するスクリプトで **desktop 12 画面 + mobile 12 画面 = 24 画面**を実行。`shots/` や harness 本体は書き換えず、出力は `shots/cycle-21/probe/full/` 内。
  - **実行 1**: 24/24 撮影、所要 142.9 秒、コンソールエラー 0、step エラー 0。
  - **実行 2**: 24/24 撮影、所要 142.9 秒、コンソールエラー 0、step エラー 0。
  - 1 画面あたり最長は `idle` の 12〜13 秒、`hold` 約 10.6 秒、`echo` 約 8.8 秒。他は 3〜7 秒。起動失敗（browserType.launch の失敗）は再現せず。
  - 注: 上記 2 回の後に `letter-play` の待ち（700→560/300 など）だけ調整し、その画面は `harness/tools/probe.mjs`（desktop）で 2 回、first/second を撮ってエラー 0・見た目を確認。調整後の shots.json 全体は通し直していない。なお harness 本体の動画撮影（recordDemoVideos 14 秒）はこの再現に含めていない。
- `?demo=1` を 60 秒放置（probe、20 秒ごとに eval）: `render=webgl2`、`webglcontextlost` なし、`isContextLost()=false`、window の error/unhandledrejection なし、コンソールエラー 0。`stoneHits` 9→21→32、`barChimes` 5→15→22 と増加。
- 音: 放置だけだと `audio=idle`（AudioContext は最初のユーザー操作で起きる設計）。クリック後は `audio=running` を確認。デモ自動演奏は動作（stoneHits 増加）。
- `wake()`: `?live=1` で requestAnimationFrame の回数を 1 秒ごとに計測 → 約 24 回/秒（ヘッドレスの SwiftShader での値）で動き、静止後 `[...,24,20,0,0,0]` と **0 に落ちて停止**することを確認。

## デモモード
- 変更なし。`?demo=1` で合成の自動演奏（ghost）が動き、カメラ/マイク不要。評価環境の撮影は 142 秒前後で完走した。

## 既知の問題・妥協点
- **【重要】作業ツリーに私が作っていない `app/` の変更がある**: セッション中（mtime 00:15〜00:18 頃）に `app/src/glimmer.js`（新規）・`main.js`・`audio.js`・`style.css`・`index.html` が変更された（夜光虫＝IDEAS 案A に見える実装）。私はこれらを編集していない（私が書いたのは `app/shots.json` と REPORT だけ）。ORDER は repair 専用で夜光虫は c22 としているため、**コミットには含めず、未コミットのまま残した**（私のコミットは `app/shots.json` と REPORT のみ）。同時に走っている別プロセスが書き込んだ可能性がある。
  - 影響: 私の再発防止確認のうち、**後半（60 秒放置・wake() 計測・letter-play の調整確認）は、この変更を含む dist に対して実行された**（60 秒放置の dataset に `glimmer`/`glints` が出ていた）。前半の 24 画面×2 回の通し実行がどのビルドだったかは確認できていない。したがって「アプリ無変更・異常なし」とは言い切れず、「**（私は）アプリを変更していない／変更を含む状態でも 60 秒でエラー・コンテキスト喪失は無かった**」が事実。
  - 司令塔は、この未コミット差分を採用するか破棄するかを判断してほしい。
- cycle 20 の「browserType.launch: Target page, context or browser has been closed」の**原因は特定できていない**。ここでは 2 回とも再現しなかった。原因は「待機が長く（幅あたり約 55 秒 + 各画面の settle 約 2.3 秒）、ブラウザが長時間生きていた」ことだと推測しているが、確証はない。撮影全体は約 143 秒に収まったので負荷は軽くなったはず、という言い方に留める。
- `idle` は 5 秒の waitFor 上限に依存するため、ヘッドレスが極端に遅いと lap=2 を逃して step 警告（致命ではなく、画面は撮れる）になる可能性がある。
- `letter-play` の first/second の撮影時刻は実行ごとに数百 ms ぶれる（first は 560ms 待ち。早すぎると何も写らず、遅すぎると 2 つ目の輪も写る）。

## 変更した主なファイル
- `app/shots.json`（のみ）
- `comms/reports/REPORTv21.md`

## 司令塔への申し送り
- 再発防止: shots.json の wait 合計を 25 秒以下に保つ。進行待ちは固定 wait より `waitFor body[data-...]` を使う（`stoneLaps`・`holding` など既存の dataset が使える）。c22 の夜光虫も、証拠を撮るなら dataset を 1 つ出すと撮影が安定する。
- `letter-play` を 2.5〜3 秒で撮らせたいなら、ヒントの表示時間（2000ms）側の仕様判断が要る。今回は触れていない。
