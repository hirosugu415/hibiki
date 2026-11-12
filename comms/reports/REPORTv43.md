# REPORT v43  (mode: normal)
## やったこと
1. 砂線の質感: 完了（一部）。線幅 w を約1.35倍、輝度係数 0.5→0.4、soft-clamp/上限を下げ、star を更に絞り、縁の smoothstep 幅を拡げ、対角S字歪みの振幅を約20%下げ、halo 倍率 1.9→1.55。desktop の石周りの短い擦れ線は減ったが、石の左下・左上に細い粒立った弧が2本ほど残る。mobile は放射状の糸が減り長い弧中心になった。
2. mobile の明るい一筋: 完了。輝度上限 .5→.34 と sc 低下で、mobile-afterimage-washed（probe、タップ位置は自分で選んだ）に際立つ線は無い。
3. 残像の色: 完了。白混ぜ20%→約11%、水の青緑寄りに。不透明度は据え置き。desktop shown で青緑の光として見える。
## ORDER からの逸脱
なし
## 動作確認
`npm run build` 成功。probe で desktop/mobile の push・wash・shown を確認、コンソールエラー 0。
## デモモード
変更なし（`?demo=1` で幽霊の指が演奏）。
## 既知の問題・妥協点
- 砂が全体に弱くなったので、mobile の砂は以前よりさらに淡い。desktop の石周りに細い断片が完全には消えていない。
- mobile-afterimage-washed の確認はタップ位置が司令塔のスクショと違う可能性あり。
## 変更した主なファイル
app/src/wave-gl.js, app/src/afterimage.js, app/NOTES.md
## 司令塔への申し送り
断片が残るなら次は halo 内の keep の粒ノイズ(nz)自体を滑らかにするのが効く。
