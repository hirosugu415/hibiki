# ORDER v39  (mode: normal)
## 目的
c38 で落ちすぎた mobile の砂場を「石の周りの輪として読める」強さに戻し、節の中心に残る放射状の滲み（mobile-sandfield-push 約(190,420)）を消す。

## やること
1. まず原因を特定する（wave-gl.js 砂ブロック、約 L213–219）。mobile の sandfield-push で、滲みが「砂の star 項」由来か「波の glow/環境光」由来かを、砂 br を一時的に 0 にして probe 撮影して切り分ける。砂由来でなければ、その本来の描画箇所を直す。
   - 受け入れ条件: `mobile-sandfield-push` で石から離れた位置に放射状・星形・ぼやけた塊が見えない。線は細く均一。
2. mobile の砂の強さを戻す。soft-clamp 定数（0.4）と上限 min(br, 0.34) を mobile のみ引き上げる（例 0.55 / 0.46）か、halo 係数を ×1.3 → ×1.7 に。desktop は不変。
   - 受け入れ条件: `mobile-letter-play` / `mobile-sandfield-push` で、石を取り巻く砂の輪が一目で読める。ただし石が最も目立つ（石の縁のハイライト > 砂線）。
3. star 減光（`1.0 - star * mix(0.3,0.7,mob)`）は輝度を落とす方向でなく、結び目の「広がり」を締める方向で調整する（star の smoothstep(1.5, 6.0) の範囲を狭める等）。交点が滲まず、かつ線が交点でちぎれない。
   - 受け入れ条件: desktop の `letter-play` で交差部が自然に繋がっている。
4. 撮影を必ず確認: desktop/mobile の `letter-play` `vessel-full` `sandfield-push` を probe で撮り、REPORT に「見た結果」を書く（未撮影は禁止）。NOTES.md に c39 を 1〜2 行追記。

## やらないこと
- 新 UI・文字・バー要素・ライブラリ追加、砂の縁質感の再調整、halo 外径の変更、石マスク(dpx)の変更。home の見た目変更。

## 見た目・UX の要求
- home は砂なしで現状と同じ静かな4階層。デスクトップ・スマホ両方で、砂は石の影のように静かで、白飛び・ちらつき・滲みなし。

## デモモード
`?demo=1` の幽霊の指で確認。letter-play / vessel-full / sandfield-push の静止画。

## 作業役への注意
- c38 は「抑えすぎて mobile が消える」失敗だった。数値は一方向に振り切らず、撮影して中間を探す。
- コンソールエラー 0・ビルド成功を最優先。
