# REPORT v34  (mode: normal)
## やったこと
1. 環境を汚さない手順: 完了。build / probe は全て 1 本ずつ直列で実行（並列なし）。vite は一度も常駐起動せず、probe は前景で終了。**自分が起動して残ったプロセスは無し**（終了させるものが無かった）。作業後に見えた chrome / node（起動が 11/09〜11/12 の古いもの、node は 4:58 起動のもの）は私の起動物ではないため触っていない。
2. 立ち上がり（style.css のみ）: 完了。
   - `#wordmark`: `wordmark-in .7s var(--ease) both`（opacity .55→1、blur 3px→0、letter-spacing .2em→.12em）。既に color 側に alpha .78 があるため、opacity を .78 にすると二重に薄くなる。そこで opacity は 1 へ戻し、最終的な見た目は従来と同一にした（ORDER の「opacity .78」からの解釈上の差）。
   - `#hint`: `hint-in .5s .3s both`（下から 6px・opacity 0→.6）、完了は 0.8 秒。breathe の開始も .8s に前倒し。
   - `#bar`: `bar-in .6s`（opacity 0→1、`translate: 0 8px`→0）。中央寄せの `transform: translateX(-50%)` と干渉しないよう個別プロパティ `translate` を使用。
   - `prefers-reduced-motion` では wordmark / bar の animation を無効、hint は従来どおり animation:none。
3. shots.json: home の wait 800→1300 のみ変更。画面数 3。
4. 確認: 完了（下記）。
## ORDER からの逸脱
- wordmark の letter-spacing アニメは ORDER 指定どおり入れたが、これは transform / opacity / filter 以外。`#wordmark` は fixed で左上固定のため、他要素へのレイアウトシフトは無い。
- opacity の到達値を .78 ではなく 1（上記理由）。
## 動作確認
- `npm run build` 成功。
- probe（直列）: home / touched / hold を desktop・mobile で実行。全 step ok、blank=false、consoleErrors=[]（touched / hold で確認）。render=webgl2、touched 時 audio=running、hold 時 holding=1。
- 画像を実際に開いて確認: desktop-home（1.3 秒後）と mobile-home（1.3 秒後）は「響」・ヒント・バーが通常の濃さで、ぼかし・半透明の残りなし。mobile-t03（0.3 秒時点）でも「響」・ヒント（やや薄い）・バーが空白にならず読める。mobile-touched は二重の輪と中心の光点。
- 注: probe の出力先は `shots/cycle-034/probe/`（ゼロ詰め）だった。
## デモモード
`?demo=1` で幽霊の指が自動演奏し、home では石と輪が見える。立ち上がりアニメとの干渉による崩れは見られなかった。
## 既知の問題・妥協点
- home の probe で `dataset.audio` は `idle`（ユーザー操作前のため。タップ後は running）。
- 公式撮影は私には再現できない。変更は CSS と shots.json のみで、撤回は容易。
- 0.3 秒時点の desktop 画像は未確認（mobile のみ）。
## 変更した主なファイル
- app/src/style.css
- app/shots.json
## 司令塔への申し送り
- 起動失敗が続く場合、app ではなく撮影環境側の問題の可能性が高い。今回の変更は静的 CSS のため撮影負荷は増えない。
- 次は「響」の階層（ヒントとの上下関係）や、静止画での情報量を検討する余地がある。
