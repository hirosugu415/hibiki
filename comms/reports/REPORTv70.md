# REPORT v70  (mode: normal)
## やったこと
- ORDERv70（撮影失敗の修復確認）はハーネス通知どおり不要と判断し、通常モードで UX 改善を 1 つ実装: **ワードマーク「響」の階層と起動演出**（IDEAS c28 案C の最小版）。完了。
  - 「響」を 30px→38px（スマホ 34px）、字間 .12em→.18em、光彩をやや強め、階層を上げた。
  - 起動時 2.2 秒、字がぼかし 3px・字間広め（.34em）・不透明度 .5 から結像する CSS アニメ（`wm-resolve`）。途中でも不透明度は .5 を下回らず、`prefers-reduced-motion` では無効。
  - `document.body.dataset.opening`（`resolve`→約 2.3 秒後 `ready`）を追加（検証用）。
- `app/shots.json` に初画面 `home`（`?demo=1`、2.6 秒待ち、無操作）を追加。

## ORDER からの逸脱
ORDERv70（build のみ確認）は実行せず、ハーネス通知に従い UX 改善を実装した。

## 動作確認
- `npm run build` 成功（CSS 7.57 kB / JS 39.33 kB）。
- probe（mobile / desktop）: 起動後 `opening=resolve`、2.4 秒後 `ready`、字間の計算値は 6.12px（34px×.18）／6.84px（38px×.18）。mobile-ready.png / desktop 画像で「響」が大きく静かに立ち、ヒント・バー・波紋と重ならないことを目視。audio=running、blank=false、コンソールエラー無し。

## デモモード
変更なし。`?demo=1` で幽霊の指が演奏し、波紋が見える。

## 既知の問題・妥協点
- 雫の波紋演出・字が波で揺れる部分は未実装（CSS のみの最小版）。
- probe の「早期」ショットは待ち 350ms でも読み込み後のタイミングになるため、結像途中の絵は確認しきれていない。

## 変更した主なファイル
`app/src/style.css`、`app/src/main.js`（末尾 4 行）、`app/shots.json`

## 司令塔への申し送り
次は IDEAS 案C の残り（初回の雫の波紋、輪が通った時に字が揺れる）が候補。GL には触れていないので安全。
