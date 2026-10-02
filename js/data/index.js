// 全項目の登録。項目の追加は、各ジャンルの定義ファイルに追記してここに並べるだけ。
import { kitchenItems } from './items/kitchen.js';
import { dailyItems } from './items/daily.js';
import { housingItems } from './items/housing.js';
import { moneyItems } from './items/money.js';
import { transportItems } from './items/transport.js';
import { hobbyItems } from './items/hobby.js';

// SPEC のジャンル順に並べる
export const ITEMS = [...kitchenItems, ...dailyItems, ...housingItems, ...moneyItems, ...transportItems, ...hobbyItems];
export const getItem = (id) => ITEMS.find((i) => i.id === id);
