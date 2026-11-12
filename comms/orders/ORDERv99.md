# ORDER v99  (mode: normal)
## 目的
desktop の金のちぎれた染みを完全に無くし、水面を青だけの澄んだ質感に統一して、仕上げを Apple 水準に近づける。

## やること
1. **desktop でも金（caustic の暖色）を出さない（最優先）。** 症状: desktop-rebound-ring の右の輪の脇のギザギザの金の塊、desktop-vessel-full の器にまとわりつく割れた金の帯、desktop-meet-off の輪の間の金の破片。
   方針: `app/src/wave-gl.js` 約 638 行の `uCaus` の第2成分（`mob ? 0 : env*env*(3-2*env)`）を desktop でも 0 にする（mobile と同じ条件に統一）。`uWarm` による暖色の加算は他に使われていなければ無効のままでよい。他の場所で金・琥珀を足している箇所（glimmer.js の meet 輪、vesselRing、afterimage 等）も grep で確かめ、金色が画面に残らないようにする。
   受け入れ条件: desktop / mobile の rebound-ring・vessel-full・meet-off・meet-spark・caustic-ring・caustic-night・loop-cycle で、金・琥珀・黄の色が 1 ピクセルも見えない。青の屈折の輪の質感（明暗・細い縁）は c98 から変えない。
2. **「響」の近くに輪が寄らないように。** 症状: mobile-meet-spark で、「響」のすぐ脇（約 85,140）に輪が出て、光る文字と合わさって的に見える。
   方針: 幽霊の指・出会いの輪の中心が、画面左上 160px 四方に入らないようにする（演奏の座標を、そこでは押し出すかずらす）。
   受け入れ条件: desktop / mobile の meet-spark / loop-cycle で「響」の周囲 120px に輪の中心が無い。
3. **meet の粒が単独の明るい点として読める。** 受け入れ条件: meet-spark で 2 つの輪の交点に半径 6px 以上の粒が 1 つ。出ない撮影があれば、タイミングに依存しないよう寿命を延ばす。
4. NOTES.md を更新する（「金は全幅で off」と明記）。

## やらないこと
- 新機能・UI・ラベルの追加、色の作り直し、他の案の実装。
- 金を別の方法で作り直さない（今回は出さないだけ）。

## 見た目・UX の要求
- desktop(1280×800)/mobile(390×844): 全画面が青の濃淡だけで澄み、ホームは c98 から不変。

## デモモード
`/?demo=1&seed=1&hour=13`（既定）と `&meet=0`。夜は `hour=23` も確認する。

## 作業役への注意
- c94〜c98 は金を「弱める」だけで残す失敗が続いた。今回は条件分岐で desktop も確実にゼロにして終わらせる。
- REPORT は、desktop と mobile の rebound-ring・vessel-full・meet-off を自分で見てから書く。見ていないものを「無し」と書かない。
- コンソールエラー・ビルド失敗を出さない。
