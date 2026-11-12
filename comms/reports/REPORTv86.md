# REPORT v86  (mode: normal)
## やったこと
1. 貝殻の質感: 完了。部屋ごとの放射グラデ(内→外)+弧沿いの光沢、部屋ごとの色相ずらし、太い外線(3px+)＋内側ハイライト線＋滲み、隔壁は細く低コントラスト。shell-show の desktop/mobile で部屋の分割が読め、部屋ごとの濃淡差が見える。dataset.shell は "12,2.8" 不変。
2. 構図: 完了。発火中心を石の影の上へ(足りなければ殻を縮小)。mobile/desktop shell-show で殻と石の間に隙間、影の透けなし。自然発火時は body[data-shell-calm] で #afterimage と #ghost-dot を CSS で減光(挙動不変)。
3. 水底: 完了。大きさ0.65〜1.3倍・巻き数2〜3.2・向きを個別化、輝度 strength 0.5→0.33(約65%)。dataset.shells="5"。
## ORDER からの逸脱
なし
## 動作確認
build 成功。probe で desktop/mobile の shell-show と shells=5、非デモで9打→13.5s 放置の自然発火(dataset.shell="9,2.5", calm=1)を確認。consoleErrors は全て0。
## デモモード
変更なし。?shell=show / ?shells=5 は固定入力で決定的。
## 既知の問題・妥協点
- 自然発火中の波紋リング抑制は #afterimage(blur層)と ghost-dot のみ。リング本体(波面シミュ)は触っていない。
- ?shell=0 / 既定ホームの画素一致は比較ツールでは測っていない(コード経路上は無変更: 追加CSSは data-shell-calm 時のみ)。
- 部屋の色相差は穏やかで、静止画では「わずかに」見える程度。
## 変更した主なファイル
app/src/shell.js, app/src/style.css, app/NOTES.md
## 司令塔への申し送り
次は殻の表示時間・沈み方の余韻、または殻に触れると音が鳴る等の触り心地が候補。
