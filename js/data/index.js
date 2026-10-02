// 全項目の登録。項目の追加は、各ジャンルの定義ファイルに追記してここに並べるだけ。
import { kitchenItems } from './items/kitchen.js';
import { dailyItems } from './items/daily.js';
import { housingItems } from './items/housing.js';

export const ITEMS = [...kitchenItems, ...dailyItems, ...housingItems];
export const getItem = (id) => ITEMS.find((i) => i.id === id);
