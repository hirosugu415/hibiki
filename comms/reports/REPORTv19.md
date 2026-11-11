# REPORT v19  (mode: normal)
## やったこと
1. 手紙の音つき再演（受け手）: **完了**。`#w=` 起動時 `letterVoiced="0"`。最初の pointerdown（「響」上は除く）の 0.6 秒後から、手紙を音つきで一度だけ再演（`letterVoiced="1"`、`letterPlay="1"`）。ユーザー自身の打はそのまま鳴り・輪も出る。再演中の操作では中断しない（`voicedTimers` は `letterStop` と別管理）。再演後は二度と鳴らさない。`#w=` なし／壊れた値では `letterVoiced` 未設定。
2. 「響」をタップして手紙を渡す（送り手）: **完了**。`#wordmark` に `role="button"` / `tabindex=0` / `aria-label="手紙を渡す"`、click と Enter/Space で動作。見た目（サイズ・位置・フォント）は不変、ホバー/押下/フォーカスで文字色の不透明度 .78→.96 のみ。当たり判定は `::before{inset:-8px}` で拡張。`navigator.share`+coarse pointer なら共有シート、そうでなければ clipboard → execCommand → 無言。AbortError は無言。成功時ヒントを 2 秒「手紙を渡しました」。記録 0 打は `letterShare="none"` で何もしない。「響」は `#water` の子ではないので水面の打にならず、手紙にも記録されない。
3. shots.json: **完了**。`letter-play` の wait 1500→900、`letter-share` を末尾に追加（追加行のみ、LF のまま）。

## ORDER からの逸脱
- 音つき再演を `?demo=1` でも有効にした。理由: `probe` は常に `?demo=1` を付けて起動するため、ORDER の受け入れ probe（`goto /#w=…` は hashchange 経路）が demo でも `letterVoiced` を動かす必要があったため。幽霊の指は従来どおり。
- `hashchange`（ページ内でハッシュだけ変更）でも、まだ音つき再演していなければ新しい手紙を再演待ちにする（既存の hashchange 再生と整合）。
- `letter.js` に `commit()`（デバウンス待ちの URL 書き込みを即時反映して href を返す）を追加。「響」タップ直後でも最新の演奏が共有されるため。

## 動作確認
- `npm run build` 成功。コンソールエラーは下記すべての probe で 0。
- ORDER 受け入れ probe（desktop、demo 経路）: 最初の eval `0` → `1|1|running|だれかの水面` → 最後 `0`。
- 実起動（`--url '/?x=1#w=PHn_AItg_xSzn_8V'`、demo なし）でも同じ: `0|0` → `1|1|running|だれかの水面` → `0|触れてみてください`。
- スクショ `desktop-real.png`: ユーザーの打（640,200）の大きな輪と、手紙の最初の打（300,380）の輪と、2 打目（700,300）の輪が同時に写る。ヒント「だれかの水面」も見える。
- 共有 probe（desktop・mobile）: `letterShare=1`（ヘッドレスでもクリップボード書き込みが成功）、`letter=n=2;len=14`（「響」タップで打は増えない。mobile の 1 打版でも n=1）、ヒント「手紙を渡しました」。`mobile-shared.png` で「響」・ヒント・バーが干渉せず 1 行に収まる。
- 記録 0 打: `letterShare=none`、ヒント不変。`/#w=!!!` と `/`: `letterVoiced` は未設定（undefined）。
- 「響」の当たり判定実寸: 文字本体 33.6×30px、`::before` を含め **約 49.6×46px**（desktop・mobile とも）。`elementFromPoint` で拡張部分が `#wordmark` を返すこと、外側は `#water` に抜けることを確認。キーボード（focus → Enter）でも `letterShare=1`。
- `audio` は `running`（ヘッドレスでも、最初の pointerdown 後）。

## デモモード
`?demo=1` は従来どおり幽霊の指が演奏。`?demo=1#w=…` も壊れず、最初の pointerdown で音つき再演が走る（上記の逸脱）。共有はヘッドレスで success（`1`）。

## 既知の問題・妥協点
- 実際に「聞こえる」ことは未確認（ヘッドレス）。`audio=running` と `tap()` が呼ばれることのコード・状態確認のみ。
- `navigator.share` 経路（coarse pointer の実機）は未確認。ヘッドレスでは clipboard 経路のみ検証。
- ヒントは、触れた後（`gone` 状態）に差し替える場合は静的な不透明度 .7 で出す（呼吸アニメ無し）。2 秒で元に戻る。
- 受け手が自分で演奏すると URL は自分の演奏で上書き（既存仕様）。
- 「響」が操作できることは、なお発見されにくい（UI を足さない制約どおり）。ヒントや手紙の文脈での案内は未実装。

## 変更した主なファイル
`app/src/main.js`, `app/src/letter.js`, `app/src/style.css`, `app/index.html`, `app/shots.json`

## 司令塔への申し送り
- ORDER の probe は常に `?demo=1` 付きで動くため、「demo では不要」の文言と受け入れ条件が噛み合わない点に注意（今回は demo でも動かして両立）。
- 次の候補: 「響」の発見性（初回の手紙送出後にワードマークがほんの一瞬だけ呼吸する等）、手紙再演時の音量・パンの確認（実機）。7 点横ばいが続くなら、c20 の innovation で別軸を。
