# REPORT v65  (mode: normal)
## やったこと
1. 分散項: 完了（効果は控えめ）。wave-gl.js の SIM に 4 次項（軸 ±2 の外側 4 点のみ追加読み）。`?disp=係数`（既定 0.03、0 で従来式、上限 0.035）。uK=0.44−3.3β、STEP_HZ を √(0.44/uK) 倍して長波の速さを維持、減衰は時間基準に補正。拡散 `?dif` は既定 0.006（従来 0.03）。
   - 係数 0.004 / 0.008 は `?disp=0` と区別できなかったため上げた。ORDER の 0.004 は格子上ほぼ無効。
   - 420 セル格子では安定条件（8K+32β<4）で β≤0.035 が上限。先走りは「外縁に弱い 1〜2 本の帯」止まりで、受け入れ条件「細かい同心列 2 本以上」を明確には満たせていない（disp-on で crisper な輪＋外側の薄い輪が見える程度）。
2. 発散防止: 完了。shader 内 clamp（h±3, v±1.5）＋ 2.5 秒ごとに状態を readPixels して max|h|>1.0 か NaN なら分散を 8 秒切る。強制発散での trip 発火は未検証（係数上限内では発散しない）。
3. 見た目: 無操作は波が無いので disp=0 と同一（数値比較はしていない）。さざ波は主波の 25% 以下に収まる見た目。
4. dataset.disp="係数,先行本数(推定),tripsN" / dispMax。?disp=0 で off。NOTES 記録済み。
5. 石・砂・砂州（bar-refract, sandfield-push）を各 1 枚確認、破綻なし。

## ORDER からの逸脱
- 係数既定を 0.004 → 0.03（効果が無かったため）。uK は 0.40 でなく 0.341。ステップ数 +14%（MAX_STEPS 4→5）。

## 動作確認
- build OK。連打 60 回＋ドラッグ＋雨 (rain=1) を desktop/mobile で実行 → コンソールエラー 0、trips 0、max|h| は 0.26→0.11 に減衰（30s 後の輝度 ±3% は未計測）。
- 比較 shot: disp-on / disp-off（shots.json 追加、mobile も）。probe で desktop/mobile とも確認。

## デモモード
- 変更なし。幽霊の指の輪にそのまま分散がかかる。

## 既知の問題・妥協点
- 効果が弱い。ring 半径は headless の step 上限でタイミング揺れ（disp 有無の半径比較は不正確）。
- 発散ガードの readPixels は headless(SwiftShader) で 15〜40ms/回（2.5s ごと）。実 GPU は約 2ms の見込み、mobile 実機は未計測。
- 2D フォールバックは分散なし。NOTES.md が 4KB を超過（約 9KB）。

## 変更した主なファイル
app/src/wave-gl.js, app/shots.json, app/NOTES.md

## 司令塔への申し送り
- 格子解像度が律速。本当に「波束」に見せるには sim 解像度↑（コスト）か、描画側での高周波強調が要る（ORDER 外）。DISP_DEF=0 で完全に従来へ戻せる。
