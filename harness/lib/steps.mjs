// Playwright の操作ステップを実行する共通ランナー（shots.json の steps と probe.mjs が使う）
import path from 'node:path';

export const STEP_KINDS = ['click', 'clickAt', 'dblclick', 'hover', 'fill', 'press', 'type', 'wait', 'waitFor', 'goto', 'scroll', 'drag', 'eval', 'shot'];

/**
 * steps: [{click:"#a"}, {fill:{selector:"#b", value:"x"}}, {press:"Enter"}, {wait:500}, ...]
 * ctx: { baseUrl, timeout, shotDir, prefix, demoQuery }
 * 戻り値: [{ i, step, ok, error?, value?, file? }]
 */
export async function runSteps(page, steps, ctx) {
  const timeout = ctx.timeout ?? 5000;
  const results = [];
  for (const [i, s] of (steps || []).entries()) {
    const kind = Object.keys(s).find((k) => STEP_KINDS.includes(k));
    const r = { i, step: s, ok: true };
    try {
      switch (kind) {
        case 'click': await page.click(s.click, { timeout }); break;
        case 'dblclick': await page.dblclick(s.dblclick, { timeout }); break;
        case 'hover': await page.hover(s.hover, { timeout }); break;
        case 'clickAt': await page.mouse.click(s.clickAt[0], s.clickAt[1]); break;
        case 'fill': await page.fill(s.fill.selector, String(s.fill.value), { timeout }); break;
        case 'press': await page.keyboard.press(s.press); break;
        case 'type': await page.keyboard.type(String(s.type), { delay: 20 }); break;
        case 'wait': await page.waitForTimeout(Number(s.wait)); break;
        case 'waitFor': await page.waitForSelector(s.waitFor, { timeout }); break;
        case 'scroll': await page.mouse.wheel(0, Number(s.scroll)); await page.waitForTimeout(200); break;
        case 'drag': {
          const [x1, y1] = s.drag.from, [x2, y2] = s.drag.to;
          await page.mouse.move(x1, y1); await page.mouse.down(); await page.mouse.move(x2, y2, { steps: 12 }); await page.mouse.up();
          break;
        }
        case 'goto': {
          const u = new URL(s.goto, ctx.baseUrl + '/');
          if (ctx.demoQuery && !u.search) u.search = '?' + ctx.demoQuery;
          await page.goto(u.toString(), { waitUntil: 'load' });
          break;
        }
        case 'eval': r.value = await page.evaluate(s.eval); break;
        case 'shot': {
          const file = path.join(ctx.shotDir, `${ctx.prefix || 'step'}-${String(s.shot).replace(/[^\w-]/g, '_')}.png`);
          await page.screenshot({ path: file, fullPage: ctx.fullPage ?? true });
          r.file = file; break;
        }
        default: throw new Error('未知のステップ: ' + JSON.stringify(s));
      }
    } catch (e) {
      r.ok = false; r.error = String(e.message || e).split('\n')[0];
    }
    results.push(r);
  }
  return results;
}
