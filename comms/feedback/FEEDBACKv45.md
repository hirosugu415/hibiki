SCORE: 3/10
DIRECTION: polish
SUMMARY: app無変更の修復。撮影が2枚で途切れmeta無し(ヘルスNG上限3点)。起動回数を減らす
# FEEDBACK v45
## VISION 適合（絶対のルールを守れているか）
違反なし（見える範囲では）。desktop-home.png: 「響」・「触れてみてください」・ガラスのバー・石・幽霊の指の波紋が静かに整っている。desktop-touched.png: タップ位置(190,400)から滑らかな輪が広がっている。ただしスマホ幅の画像は今回も無く、モバイルでの確認は証拠として欠けている。

## 採点の根拠
- 証拠は desktop 2 枚のみ。`meta.json` と `console-errors.log` が無く、ヘルス判定が成立しない。規定によりヘルスNG扱いで上限3点。
- ビルドは成功（build.log: 12 modules、built in 54ms）。diff は REPORT と STATE のみで app 変更なし。REPORT の主張（app無変更・何も起動していない）は diff.stat と一致。
- 撮影失敗は c41〜c45 で「2〜3枚撮って次の launch で落ちる」という同じパターン。画像が出るたびに起動回数が増えるほど落ちやすい＝1画面あたりの browserType.launch の積み重ねが原因の疑いが強い。tasklist では chrome-headless-shell が5本、node が9本、chrome が十数本残留している（資源競合の疑い、推測）。

## 動作確認で分かったこと
今回は probe を新たに走らせていない（残留プロセスが多く、これ以上増やさないため）。c44 の probe で mobile の波紋と audio=running は確認済み。app 自体は健全。

## 方向性の判断
polish（pivot はしない）。問題は app ではなく撮影の安定性。7サイクル連続で3点のため、アプリを変えるより「撮影の launch 回数を減らす」という最小の手を打つ。app のコードには触れない。

## 次に最も効くこと
1. `app/shots.json` を1画面（touched）だけにして、撮影の起動回数を desktop+mobile で最小にする。
2. それでも失敗するなら、次は app 側の描画負荷（DPR 上限・シミュレーション解像度の軽量化）を検討する。
3. ヘルスが green に戻ったら、normal で「響」の小さな磨きを1つだけ行う。
