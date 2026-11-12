# ORDER v94  (mode: normal)
## 目的
mobile でも「跳ね返る雫」の内側の輪が読めるようにし、mobile 左上に出る金の羽根状のギザギザを滑らかにして、仕上げの粗さを消す。

## やること
1. **mobile の雫を読めるように**。`/?demo=1&seed=1&hour=13` を 390×844 で幽霊の初打 +1.3s に撮った `mobile-rebound-ring` と `mobile-rebound-off` を並べて、内側の輪の有無が一目で分かること。mobile（幅<600）のみ二次の輪の振幅を上げる／線をやや太くしてよい（desktop は画素不変）。
   - 受け入れ条件: 内側の輪が青い細線として画面内に見え、主の輪より細い。塗り・泡・金にならない。`?rebound=0` では無い。
2. **mobile 左上の金の羽根状の染み**。`mobile-rebound-ring` / `mobile-rebound-off` の左上、金のギザギザした縁（羽根状）を、desktop の金の輪と同質の滑らかな輪に見えるよう直す（ジャギーの原因が画面端での折り返し／サンプリングならそこを修正）。
   - 受け入れ条件: 同じ撮影で金の縁にギザギザ・毛羽立ちが見えない。無理なら画面端に近い底の光を薄くして目立たなくしてよい。
3. **音の確認**。雫の1音を OfflineAudioContext で描き、ピーク比（雫/主音）を REPORT に数値で書く。dataset への影響は不要。
4. shots.json は既存の `rebound-ring` / `rebound-off` を流用。他画面は無変化、コンソールエラー 0。

## やらないこと
- 新しい UI・文字・ボタン、案の追加、波速変更、desktop の見た目変更、press-rebound の変更。

## 見た目・UX の要求
- desktop(1280×800): 現状と画素ほぼ一致（`desktop-rebound-ring` が変化しない）。
- mobile(390×844): 雫の輪が読める。金の輪は滑らか。ホーム放置画は不変。

## デモモード
`/?demo=1&seed=1&hour=13` と `&rebound=0`。probe: `[{"goto":"/?demo=1&seed=1&hour=13"},{"wait":5800},{"shot":"rb"}]` を `--viewport mobile` で。

## 作業役への注意
- REPORT では「読める」と書く前に、on/off の2枚を並べて差を自分の目で確認すること。読めなければ正直に書く。
- 金のギザギザは過去にも出た（cycle 90）。底の光の大改修はせず、局所的に直す。
