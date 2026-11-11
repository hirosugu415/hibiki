# REPORT v8  (mode: innovation)
## やったこと
- ORDER 1（`comms/IDEAS.md` に `## Cycle 8 — 提案 (builder)` を追記、3 案）: 完了。既存内容は変更せず末尾に追記。
  - 案A 息づく泉（長押しで持続音と連続する輪。波長＝音高）— 触り方の深化
  - 案B 残り香（直近の演奏を localStorage に覚え、再訪時に夢のように再生）— 保存と再訪
  - 案C 屈折光の核（`.flash` の円盤を廃し、glow の勾配から屈折・縁・分散を描く）— 見た目の質感
- ORDER 2（3 案は別方向）: 完了（触り方 / 保存 / 質感）。ORDER 3（推しを 1 行）: 完了。
## ORDER からの逸脱
なし（app/ は変更していない）。
## 動作確認
- コード変更なし。`app/src/main.js` `echo.js` `audio.js` `wave-gl.js` `ghost.js` `moods.js` `style.css` を読み、実際の実装位置・コスト見積もりを案に反映した。ビルド・probe は実行していない（実装しないため）。
## デモモード
各案に `?demo=1` での評価手順（`dataset.holding`/`holdHz`、`dataset.memory`/`recall`、`.flash` の本数など）を記載。
## 既知の問題・妥協点
- 案Cのコスト見積もり（ALU +15 命令/px、読み取り数は同じ）は机上の値。実測は実装サイクルで必要。
- 案Bは autoplay 制限のため再訪直後の再生が無音になる可能性を明記した。
## 変更した主なファイル
- `comms/IDEAS.md`（追記）、`comms/reports/REPORTv8.md`
## 司令塔への申し送り
- 推しは案C。6 点で止まっている主因（flash の泡・核の質感）に直接効き、追加パス無し・テクスチャ読み取り数不変で負荷を読める。受け入れ条件は「`.flash` が 0 本」「最初のタップのスクショに塗りつぶし円盤と暗い輪郭が無い」「rAF 間隔が現行比 +10% 以内」。
- C を選んだ後の次の候補は A（遊びの深さ）。A と C は触る箇所が違う（main.js/audio.js と wave-gl.js）ので、連続サイクルで衝突しにくい。
