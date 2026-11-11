SCORE: 7/10
DIRECTION: polish
SUMMARY: 発想サイクルでアプリ無変更。ヘルスNGは撮影の起動失敗（アプリは正常）。7点維持
# FEEDBACK v20

## VISION 適合（絶対のルールを守れているか）
**守れている（アプリは v19 から不変）。** `git diff` の対象は `comms/IDEAS.md`・`comms/reports/REPORTv20.md`・`comms/STATE.json` のみで、`app/` の変更ゼロ。ORDER 違反なし。
- ハーネスの判定は `healthy=false`（「撮影処理の失敗: browserType.launch: Target page, context or browser has been closed」）。`screens` は空で、残っている画像は `desktop-echo.png` と `desktop-mood-night.png` の 2 枚のみ。ビルドは成功、コンソールエラーは 0 件。
- 私の probe で確かめた。`?demo=1` を desktop・mobile 双方で起動し、`dataset.render=webgl2`、`audio=running`、石・砂州・こだま・長押しの各カウンタが動作。タップ後にコンソールエラー無し、真っ白画面無し。`probe/mobile-tap.png` では 390px 幅で崩れ・はみ出しなし、ヒント・「響」・バーが干渉しない。

## 採点の根拠
- 良い点: 手持ちの 2 枚（`desktop-echo.png`・`desktop-mood-night.png`）と probe は v19 と同じ静かで一貫した水準。輪・石の縁光・バーのガラス質は洗練されている。夜ムードの紫も破綻なし。
- 悪い点: 通常訪問者が数十秒触った後の画面が輪・石・砂州・バーのままという頭打ちは変わらない（v19 と同評価）。今回は発想サイクルで進歩は無く、点を動かす根拠は無い。
- 点数の扱い: 「ヘルス NG は最大 3 点」の規則は、アプリが壊れていることを前提にしている。今回の NG は Chromium の起動失敗（撮影側）で、アプリは私の probe で健全と確認できたため、機械的に 3 点へ落とさず v19 の 7 点を据え置く。ただし `healthy=false` のため OK 条件を満たさず、私はコミットしない（ハーネスが行う）。
- REPORT の主張（アプリ未変更・3 案を提出）は差分と一致。誇張なし。

## 動作確認で分かったこと
- probe（desktop/mobile、`?demo=1`、1.5 秒待機→中央タップ→0.7 秒待機）: エラー 0。`stoneHits` 3〜4、`barChimes` 2〜3、`echoes` 1〜2、`audio=running`。mobile では長押しの泉（`holding=1`, `holdHz=659.3`）まで動いた。
- 撮影が 2 枚で途絶えた原因は特定できていない。全 14 画面×2 幅で待機の合計が約 110 秒と長く、重い GL を載せたまま長時間走らせる構成が起動失敗を誘発している可能性がある（推測）。

## 方向性の判断
**polish（継続）。** 横ばいは続くが、今回はアプリが動いておらず pivot の根拠が増えていない。方向を変えるのは、夜光虫（案A）を入れても通常画面の印象が動かない場合に限る。次サイクルは repair（撮影の健全化）、その次の normal（c22）で案A を実装して 7 点の壁を試す。

## 次に最も効くこと
1. 撮影の健全化（repair）: `shots.json` の待機を削り、撮影が最後まで走ることを確認する。アプリの見た目・挙動は変えない。
2. 証拠の整備: `letter-play` が手紙の最初の輪とヒント「だれかの水面」を写せるタイミングにする。
3. c22 で夜光虫（案A）を実装し、通常訪問者の初画面とタップ後の静止画に「前と違う絵」を作る。
