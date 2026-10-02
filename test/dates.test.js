import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dayNumber, ymd, toIso, parseIso, todayDays, weekdayName, dateText, isLeap, inRange, MAX_DAYS,
  warekiOfYear, seirekiOfWareki, warekiOfDate, eraYearText, eto, ageInfo, weeksDays,
} from '../js/dates.js';

const D = (y, m, d) => dayNumber(y, m, d);

test('日付: 日数 ⇄ 年月日（1970-01-01 が 0）', () => {
  assert.equal(D(1970, 1, 1), 0);
  assert.equal(D(1970, 1, 2), 1);
  assert.equal(D(1969, 12, 31), -1);
  for (const [y, m, d] of [[1900, 3, 1], [2000, 2, 29], [2026, 10, 3], [1868, 10, 23], [99, 5, 5]]) {
    assert.deepEqual(ymd(D(y, m, d)), { y, m, d });
  }
});

test('日付: ISO文字列との変換。存在しない日付・空欄は NaN', () => {
  assert.equal(toIso(D(2026, 10, 3)), '2026-10-03');
  assert.equal(toIso(D(99, 5, 5)), '0099-05-05');
  assert.equal(parseIso('2026-10-03'), D(2026, 10, 3));
  for (const s of ['', '2026-02-30', '2026-13-01', 'abc', '2026/10/03', '2026-1-3']) assert.ok(Number.isNaN(parseIso(s)), s);
  assert.equal(parseIso('2024-02-29'), D(2024, 2, 29)); // うるう日
  assert.ok(Number.isNaN(parseIso('2026-02-29')));
});

test('日付: 曜日・今日・うるう年・範囲', () => {
  assert.equal(weekdayName(D(2026, 10, 3)), '土');
  assert.equal(weekdayName(D(1970, 1, 1)), '木');
  assert.equal(weekdayName(D(2000, 1, 1)), '土');
  assert.equal(weekdayName(D(2024, 2, 29)), '木');
  assert.equal(weekdayName(D(1969, 12, 31)), '水');
  assert.equal(todayDays(new Date(2026, 9, 3, 23, 59)), D(2026, 10, 3)); // 端末の日付（時刻に関係なく同じ日）
  assert.equal(dateText(D(2026, 10, 3)), '2026年10月3日（土）');
  assert.deepEqual([2000, 1900, 2024, 2026].map(isLeap), [true, false, true, false]);
  assert.ok(inRange(0) && inRange(MAX_DAYS) && !inRange(MAX_DAYS + 1) && !inRange(NaN));
});

test('元号: 西暦 → 和暦（改元の年は2つ、古い順）', () => {
  const t = (y) => warekiOfYear(y).map((w) => eraYearText(w.era, w.n));
  assert.deepEqual(t(2026), ['令和8年']);
  assert.deepEqual(t(2019), ['平成31年', '令和元年']);
  assert.deepEqual(t(1989), ['昭和64年', '平成元年']);
  assert.deepEqual(t(1926), ['大正15年', '昭和元年']);
  assert.deepEqual(t(1912), ['明治45年', '大正元年']);
  assert.deepEqual(t(1868), ['明治元年']);
  assert.deepEqual(t(1867), []);
});

test('元号: 和暦 → 西暦（元号ごとの年数を超えたら null）', () => {
  assert.equal(seirekiOfWareki('令和', 8), 2026);
  assert.equal(seirekiOfWareki('令和', 1), 2019);
  assert.equal(seirekiOfWareki('令和', 100), 2118);
  assert.equal(seirekiOfWareki('平成', 31), 2019);
  assert.equal(seirekiOfWareki('平成', 32), null);
  assert.equal(seirekiOfWareki('昭和', 64), 1989);
  assert.equal(seirekiOfWareki('昭和', 65), null);
  assert.equal(seirekiOfWareki('大正', 15), 1926);
  assert.equal(seirekiOfWareki('明治', 45), 1912);
  assert.equal(seirekiOfWareki('明治', 46), null);
  for (const n of [0, -1, 1.5, NaN]) assert.equal(seirekiOfWareki('令和', n), null);
  assert.equal(seirekiOfWareki('天平', 1), null);
});

test('元号: 日付 → 元号（改元日の前日と当日）', () => {
  const w = (y, m, d) => warekiOfDate(D(y, m, d));
  assert.deepEqual(w(2019, 4, 30), { era: '平成', n: 31 });
  assert.deepEqual(w(2019, 5, 1), { era: '令和', n: 1 });
  assert.deepEqual(w(1989, 1, 7), { era: '昭和', n: 64 });
  assert.deepEqual(w(1989, 1, 8), { era: '平成', n: 1 });
  assert.deepEqual(w(1926, 12, 24), { era: '大正', n: 15 });
  assert.deepEqual(w(1926, 12, 25), { era: '昭和', n: 1 });
  assert.deepEqual(w(2026, 10, 3), { era: '令和', n: 8 });
  assert.equal(w(1868, 10, 22), null);
});

test('干支: 2026は丙午、1984は甲子', () => {
  assert.equal(eto(2026), '丙午');
  assert.equal(eto(1990), '庚午');
  assert.equal(eto(1984), '甲子');
  assert.equal(eto(2024), '甲辰');
  assert.equal(eto(1984 + 60), '甲子'); // 60年で一巡
});

test('年齢: 満年齢・数え年・次の誕生日まで', () => {
  const info = ageInfo(D(1990, 7, 1), D(2026, 10, 3));
  assert.equal(info.age, 36);
  assert.equal(info.kazoe, 37);
  assert.equal(info.lived, D(2026, 10, 3) - D(1990, 7, 1));
  assert.equal(info.toNext, 271); // 2027-07-01 まで
  assert.equal(info.nextDays, D(2027, 7, 1));
});

test('年齢: 誕生日の前日・当日・翌日', () => {
  const b = D(1990, 7, 1);
  assert.deepEqual([ageInfo(b, D(2026, 6, 30)).age, ageInfo(b, D(2026, 6, 30)).toNext], [35, 1]);
  assert.deepEqual([ageInfo(b, D(2026, 7, 1)).age, ageInfo(b, D(2026, 7, 1)).toNext], [36, 0]);
  assert.deepEqual([ageInfo(b, D(2026, 7, 2)).age, ageInfo(b, D(2026, 7, 2)).toNext], [36, 364]);
  assert.equal(ageInfo(b, b).age, 0); // 生まれた日
  assert.equal(ageInfo(b, b).lived, 0);
  assert.equal(ageInfo(b, b - 1), null); // 生まれる前
});

test('年齢: 2月29日生まれは、うるう年でない年は3月1日に年をとる', () => {
  const b = D(2000, 2, 29);
  assert.equal(ageInfo(b, D(2026, 2, 28)).age, 25);
  assert.equal(ageInfo(b, D(2026, 3, 1)).age, 26);
  assert.equal(ageInfo(b, D(2027, 2, 28)).age, 26);
  assert.equal(ageInfo(b, D(2028, 2, 29)).age, 28);
  assert.equal(ageInfo(b, D(2026, 2, 28)).toNext, 1); // 次は 2026-03-01
});

test('日数の言い方: 週と日', () => {
  assert.equal(weeksDays(100), '14週間2日');
  assert.equal(weeksDays(7), '1週間');
  assert.equal(weeksDays(3), '3日');
  assert.equal(weeksDays(-10), '1週間3日');
  assert.equal(weeksDays(0), '0日');
});
