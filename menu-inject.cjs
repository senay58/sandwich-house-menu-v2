const fs = require('fs');
const data = require('./menu_data_generated.json');

const categories = [
  { id: 'cat-breakfast', name: 'Breakfast' },
  { id: 'cat-sandwich', name: 'Sandwich Section' },
  { id: 'cat-wrap', name: 'Wrap Section' },
  { id: 'cat-burger', name: 'Burger Section' },
  { id: 'cat-drinks', name: 'Drinks' },
  { id: 'cat-drinks-cool', name: 'Cool Drinks', parentId: 'cat-drinks' },
  { id: 'cat-drinks-smoothies', name: 'Smoothies', parentId: 'cat-drinks' },
  { id: 'cat-drinks-mojito', name: 'Mojito', parentId: 'cat-drinks' },
  { id: 'cat-drinks-juice', name: 'Juice', parentId: 'cat-drinks' },
  { id: 'cat-drinks-soft', name: 'Soft Drink', parentId: 'cat-drinks' },
  { id: 'cat-drinks-hot', name: 'Hot Drinks', parentId: 'cat-drinks' },
  { id: 'cat-extras', name: 'Extras' }
];

const newDefaultData = {
  categories: categories,
  items: data
};

let tsContent = fs.readFileSync('src/lib/menu-store.ts', 'utf-8');

// replace DEFAULT_DATA
const startText = 'const DEFAULT_DATA: MenuData = {';
const startIndex = tsContent.indexOf(startText);
let endText = '};';
let endIndex = tsContent.indexOf('};', startIndex) + 2;
// Check if it's the right one
if(startIndex > -1) {
   let closingBracket = -1;
   let openBrackets = 0;
   for(let i = startIndex + startText.length - 1; i < tsContent.length; i++) {
        if(tsContent[i] === '{') openBrackets++;
        if(tsContent[i] === '}') {
            openBrackets--;
            if(openBrackets === 0) {
               closingBracket = i;
               break;
            }
        }
   }
   if(closingBracket > -1) {
       const replacement = 'const DEFAULT_DATA: MenuData = ' + JSON.stringify(newDefaultData, null, 2) + ';';
       tsContent = tsContent.substring(0, startIndex) + replacement + tsContent.substring(closingBracket+1);
   }
}

// Bump version
tsContent = tsContent.replace('const STORAGE_KEY = "sandwich-house-menu-v2";', 'const STORAGE_KEY = "sandwich-house-menu-v3";');

fs.writeFileSync('src/lib/menu-store.ts', tsContent);
console.log('updated menu-store.ts');
