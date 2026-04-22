import { useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase";

export type Extra = { name: string; price: number };

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  image: string;
  extras: Extra[];
  available?: boolean; // false means out of stock/hidden
  tags?: string[]; // "Spicy", "Vegan", "Gluten-Free", "Fasting"
};

export type Category = {
  id: string;
  name: string;
  parentId?: string; // if set, this is a sub-category of the parent
};

export type MenuData = {
  categories: Category[];
  items: MenuItem[];
};

export type AppSettings = {
  id: string;
  value: any;
};

const STORAGE_KEY = "sandwich-house-menu-v4";
const EVENT = "sandwich-house-menu-change";

const DEFAULT_DATA: MenuData = {
  "categories": [
    {
      "id": "cat-fasting",
      "name": "Fasting"
    },
    {
      "id": "cat-breakfast",
      "name": "Breakfast"
    },
    {
      "id": "cat-sandwich",
      "name": "Sandwich Section"
    },
    {
      "id": "cat-wrap",
      "name": "Wrap Section"
    },
    {
      "id": "cat-burger",
      "name": "Burger Section"
    },
    {
      "id": "cat-drinks",
      "name": "Drinks"
    },
    {
      "id": "cat-drinks-cool",
      "name": "Cool Drinks",
      "parentId": "cat-drinks"
    },
    {
      "id": "cat-drinks-smoothies",
      "name": "Smoothies",
      "parentId": "cat-drinks"
    },
    {
      "id": "cat-drinks-mojito",
      "name": "Mojito",
      "parentId": "cat-drinks"
    },
    {
      "id": "cat-drinks-juice",
      "name": "Juice",
      "parentId": "cat-drinks"
    },
    {
      "id": "cat-drinks-soft",
      "name": "Soft Drink",
      "parentId": "cat-drinks"
    },
    {
      "id": "cat-drinks-hot",
      "name": "Hot Drinks",
      "parentId": "cat-drinks"
    },
    {
      "id": "cat-extras",
      "name": "Extras"
    }
  ],
  "items": [
    {
      "id": "item-1",
      "name": "Egg Omelette",
      "description": "Egg, Tomato, Onion, Green Pepper; served with 3 slices of bread",
      "price": 300,
      "categoryId": "cat-breakfast",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-2",
      "name": "Beef Omelette",
      "description": "Egg, Grounded Beef, Tomato, Onion, Green Pepper; served with 3 slices of bread",
      "price": 420,
      "categoryId": "cat-breakfast",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-3",
      "name": "Scrambled Egg",
      "description": "Egg, Tomato, Onion, Green Pepper; served with bread",
      "price": 360,
      "categoryId": "cat-breakfast",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-4",
      "name": "Scrambled Egg with Meat",
      "description": "Egg, Grounded Beef, Tomato, Onion, Green Pepper; served with 3 slices of bread",
      "price": 440,
      "categoryId": "cat-breakfast",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-5",
      "name": "Scrambled Egg with Tuna",
      "description": "Egg, Tuna; served with flatbread",
      "price": 650,
      "categoryId": "cat-breakfast",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-6",
      "name": "Egg Sandwich",
      "description": "Egg, Tomato, Onion, Green Pepper",
      "price": 340,
      "categoryId": "cat-breakfast",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-7",
      "name": "Fetira",
      "description": "Flatbread with honey",
      "price": 230,
      "categoryId": "cat-breakfast",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-8",
      "name": "Fetira with Egg",
      "description": "Flatbread with egg and honey",
      "price": 290,
      "categoryId": "cat-breakfast",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-9",
      "name": "Special Fetira",
      "description": "Flatbread, Grounded Beef, Egg, Honey",
      "price": 400,
      "categoryId": "cat-breakfast",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-10",
      "name": "Chechebsa",
      "description": "Chopped flatbread of wheat flour, Red powdered pepper, Butter",
      "price": 260,
      "categoryId": "cat-breakfast",
      "image": "",
      "extras": [],
      "available": true,
      "tags": [
        "Fasting"
      ]
    },
    {
      "id": "item-11",
      "name": "Special Chechebsa",
      "description": "Chopped flatbread of wheat flour, Red powdered pepper, Butter, Egg",
      "price": 360,
      "categoryId": "cat-breakfast",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-12",
      "name": "Teff Chechebsa",
      "description": "Chopped flatbread of teff flour, Red powdered pepper, Butter",
      "price": 290,
      "categoryId": "cat-breakfast",
      "image": "",
      "extras": [],
      "available": true,
      "tags": [
        "Fasting"
      ]
    },
    {
      "id": "item-13",
      "name": "Special Teff Chechebsa",
      "description": "Chopped flatbread of teff flour, Red powdered pepper, Butter, Egg",
      "price": 400,
      "categoryId": "cat-breakfast",
      "image": "",
      "extras": [],
      "available": true,
      "tags": [
        "Fasting"
      ]
    },
    {
      "id": "item-14",
      "name": "French Toast",
      "description": "Sliced bread toasted with Egg; served with salad",
      "price": 290,
      "categoryId": "cat-breakfast",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-15",
      "name": "Waffle",
      "description": "Wheat flour, Egg, Milk, Vanilla, Syrup; served with salad",
      "price": 290,
      "categoryId": "cat-breakfast",
      "image": "",
      "extras": [],
      "available": true,
      "tags": [
        "Fasting"
      ]
    },
    {
      "id": "item-16",
      "name": "Teff Waffle",
      "description": "Teff flour, Egg, Milk, Vanilla, Syrup; served with salad",
      "price": 310,
      "categoryId": "cat-breakfast",
      "image": "",
      "extras": [],
      "available": true,
      "tags": [
        "Fasting"
      ]
    },
    {
      "id": "item-17",
      "name": "Pancake",
      "description": "Wheat flour, Vanilla, Egg, Syrup; served with salad",
      "price": 260,
      "categoryId": "cat-breakfast",
      "image": "",
      "extras": [],
      "available": true,
      "tags": [
        "Fasting"
      ]
    },
    {
      "id": "item-18",
      "name": "Oatmeal Pancake",
      "description": "Oat flour, Vanilla, Egg, Syrup; served with salad",
      "price": 350,
      "categoryId": "cat-breakfast",
      "image": "",
      "extras": [],
      "available": true,
      "tags": [
        "Fasting"
      ]
    },
    {
      "id": "item-19",
      "name": "Teff Pancake",
      "description": "Teff flour, Egg, Vanilla, Syrup; served with salad",
      "price": 300,
      "categoryId": "cat-breakfast",
      "image": "",
      "extras": [],
      "available": true,
      "tags": [
        "Fasting"
      ]
    },
    {
      "id": "item-20",
      "name": "Ful",
      "description": "Fava beans with flatbread",
      "price": 220,
      "categoryId": "cat-breakfast",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-21",
      "name": "Special Ful",
      "description": "Fava beans garnished with vegetables, served with flatbread",
      "price": 295,
      "categoryId": "cat-breakfast",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-22",
      "name": "Vegetable Sandwich",
      "description": "Tomato, Onion, Cucumber, Carrot, Cabbage, Lettuce; served with salad or fries",
      "price": 330,
      "categoryId": "cat-sandwich",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-23",
      "name": "Tuna Sandwich",
      "description": "Tuna, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries",
      "price": 630,
      "categoryId": "cat-sandwich",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-24",
      "name": "Chicken Sandwich",
      "description": "Grilled Chicken, Cheese, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries",
      "price": 630,
      "categoryId": "cat-sandwich",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-25",
      "name": "BBQ Chicken Sandwich",
      "description": "BBQ Grilled Chicken, Cheese, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries",
      "price": 650,
      "categoryId": "cat-sandwich",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-26",
      "name": "Special Chicken Sandwich",
      "description": "Grilled Chicken, Cheese, Egg, Chicken Mortadella, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries",
      "price": 730,
      "categoryId": "cat-sandwich",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-27",
      "name": "Beef Sandwich",
      "description": "Grilled Beef, Cheese, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries",
      "price": 600,
      "categoryId": "cat-sandwich",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-28",
      "name": "BBQ Beef Sandwich",
      "description": "BBQ Grilled Beef, Cheese, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries",
      "price": 620,
      "categoryId": "cat-sandwich",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-29",
      "name": "Special Beef Sandwich",
      "description": "Grilled Beef, Cheese, Egg, Beef Mortadella, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries",
      "price": 680,
      "categoryId": "cat-sandwich",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-30",
      "name": "Club Sandwich / Chicken",
      "description": "Chicken, Cheese, Egg, Green Pepper, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries",
      "price": 650,
      "categoryId": "cat-sandwich",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-31",
      "name": "Club Sandwich / Tuna",
      "description": "Tuna, Cheese, Egg, Green Pepper, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries",
      "price": 640,
      "categoryId": "cat-sandwich",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-32",
      "name": "Vegetable Wrap",
      "description": "Tomato, Onion, Cucumber, Lettuce; served with salad or fries",
      "price": 300,
      "categoryId": "cat-wrap",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-33",
      "name": "Tuna Wrap",
      "description": "Tuna, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries",
      "price": 600,
      "categoryId": "cat-wrap",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-34",
      "name": "Chicken Wrap",
      "description": "Grilled Chicken, Cheese, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries",
      "price": 595,
      "categoryId": "cat-wrap",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-35",
      "name": "BBQ Chicken Wrap",
      "description": "BBQ Grilled Chicken, Cheese, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries",
      "price": 640,
      "categoryId": "cat-wrap",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-36",
      "name": "Special Chicken Wrap",
      "description": "Grilled Chicken, Cheese, Chicken Mortadella, Egg, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries",
      "price": 750,
      "categoryId": "cat-wrap",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-37",
      "name": "Beef Wrap",
      "description": "Grilled Beef, Cheese, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries",
      "price": 580,
      "categoryId": "cat-wrap",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-38",
      "name": "BBQ Beef Wrap",
      "description": "BBQ Grilled Beef, Cheese, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries",
      "price": 630,
      "categoryId": "cat-wrap",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-39",
      "name": "Special Beef Wrap",
      "description": "Grilled Beef, Cheese, Beef Mortadella, Egg, Lettuce, Tomato, Onion, Mayonnaise; served with salad or fries",
      "price": 750,
      "categoryId": "cat-wrap",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-40",
      "name": "Beef Burger",
      "description": "Beef, Lettuce, Tomato, Onion, Mayonnaise; served with fries",
      "price": 430,
      "categoryId": "cat-burger",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-41",
      "name": "Cheese Burger",
      "description": "Beef, Cheese, Lettuce, Tomato, Onion, Mayonnaise; served with fries",
      "price": 490,
      "categoryId": "cat-burger",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-42",
      "name": "Double Beef Burger",
      "description": "Double Beef, Double Cheese, Lettuce, Tomato, Onion, Mayonnaise; served with fries",
      "price": 595,
      "categoryId": "cat-burger",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-43",
      "name": "Special Burger",
      "description": "Double Beef, Double Cheese, Double Beef Mortadella, Egg, Lettuce, Tomato, Onion, Mayonnaise; served with fries",
      "price": 680,
      "categoryId": "cat-burger",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-44",
      "name": "French Fries",
      "description": "",
      "price": 280,
      "categoryId": "cat-burger",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-45",
      "name": "Ice Coffee",
      "description": "",
      "price": 140,
      "categoryId": "cat-drinks-cool",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-46",
      "name": "Iced Latte",
      "description": "",
      "price": 170,
      "categoryId": "cat-drinks-cool",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-47",
      "name": "Iced Caramel Latte",
      "description": "",
      "price": 220,
      "categoryId": "cat-drinks-cool",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-48",
      "name": "Iced Mocha",
      "description": "",
      "price": 210,
      "categoryId": "cat-drinks-cool",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-49",
      "name": "Strawberry/Banana",
      "description": "",
      "price": 240,
      "categoryId": "cat-drinks-smoothies",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-50",
      "name": "Banana/Avocado/Peanut",
      "description": "",
      "price": 220,
      "categoryId": "cat-drinks-smoothies",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-51",
      "name": "Banana/Papaya",
      "description": "",
      "price": 220,
      "categoryId": "cat-drinks-smoothies",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-52",
      "name": "Strawberry",
      "description": "",
      "price": 250,
      "categoryId": "cat-drinks-smoothies",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-53",
      "name": "House Special (Banana, Avocado, Strawberry, Papaya, Milk, Cinnamon)",
      "description": "",
      "price": 240,
      "categoryId": "cat-drinks-smoothies",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-54",
      "name": "Mocha Frappe Smoothie",
      "description": "",
      "price": 230,
      "categoryId": "cat-drinks-smoothies",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-55",
      "name": "Caramel Frappe Smoothie",
      "description": "",
      "price": 230,
      "categoryId": "cat-drinks-smoothies",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-56",
      "name": "Fasting Special",
      "description": "",
      "price": 220,
      "categoryId": "cat-drinks-smoothies",
      "image": "",
      "extras": [],
      "available": true,
      "tags": [
        "Fasting"
      ]
    },
    {
      "id": "item-57",
      "name": "Peanut Banana Espresso",
      "description": "",
      "price": 240,
      "categoryId": "cat-drinks-smoothies",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-58",
      "name": "Strawberry Mojito",
      "description": "",
      "price": 240,
      "categoryId": "cat-drinks-mojito",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-59",
      "name": "Orange Mojito",
      "description": "",
      "price": 150,
      "categoryId": "cat-drinks-mojito",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-60",
      "name": "Lemon Mojito",
      "description": "",
      "price": 240,
      "categoryId": "cat-drinks-mojito",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-61",
      "name": "Mint Mojito",
      "description": "",
      "price": 150,
      "categoryId": "cat-drinks-mojito",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-62",
      "name": "Pineapple Mojito",
      "description": "",
      "price": 230,
      "categoryId": "cat-drinks-mojito",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-63",
      "name": "Papaya",
      "description": "",
      "price": 190,
      "categoryId": "cat-drinks-juice",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-64",
      "name": "Avocado",
      "description": "",
      "price": 220,
      "categoryId": "cat-drinks-juice",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-65",
      "name": "Watermelon",
      "description": "",
      "price": 200,
      "categoryId": "cat-drinks-juice",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-66",
      "name": "Mixed Juice (Banana, Avocado, Strawberry, Papaya)",
      "description": "",
      "price": 210,
      "categoryId": "cat-drinks-juice",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-67",
      "name": "Mango",
      "description": "",
      "price": 250,
      "categoryId": "cat-drinks-juice",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-68",
      "name": "Fasting Special Juice (Banana, Avocado, Papaya, Strawberry, Peanut)",
      "description": "",
      "price": 220,
      "categoryId": "cat-drinks-juice",
      "image": "",
      "extras": [],
      "available": true,
      "tags": [
        "Fasting"
      ]
    },
    {
      "id": "item-69",
      "name": "Strawberry",
      "description": "",
      "price": 280,
      "categoryId": "cat-drinks-juice",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-70",
      "name": "Lemonade",
      "description": "",
      "price": 220,
      "categoryId": "cat-drinks-juice",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-71",
      "name": "Special Shake",
      "description": "",
      "price": 230,
      "categoryId": "cat-drinks-juice",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-72",
      "name": "Soft Drink",
      "description": "",
      "price": 60,
      "categoryId": "cat-drinks-soft",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-73",
      "name": "Mineral Water 500ml",
      "description": "",
      "price": 45,
      "categoryId": "cat-drinks-soft",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-74",
      "name": "Mineral Water 1L",
      "description": "",
      "price": 60,
      "categoryId": "cat-drinks-soft",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-75",
      "name": "Tea",
      "description": "",
      "price": 45,
      "categoryId": "cat-drinks-hot",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-76",
      "name": "Tea with Lemon",
      "description": "",
      "price": 60,
      "categoryId": "cat-drinks-hot",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-77",
      "name": "Tea with Coffee / Spice",
      "description": "",
      "price": 80,
      "categoryId": "cat-drinks-hot",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-78",
      "name": "Special Tea",
      "description": "",
      "price": 160,
      "categoryId": "cat-drinks-hot",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-79",
      "name": "Ginger Tea",
      "description": "",
      "price": 95,
      "categoryId": "cat-drinks-hot",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-80",
      "name": "Ginger Tea with Honey",
      "description": "",
      "price": 130,
      "categoryId": "cat-drinks-hot",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-81",
      "name": "Green Tea / Flavored Tea",
      "description": "",
      "price": 45,
      "categoryId": "cat-drinks-hot",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-82",
      "name": "Peanut Tea (Lewz)",
      "description": "",
      "price": 95,
      "categoryId": "cat-drinks-hot",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-83",
      "name": "Machine Coffee",
      "description": "",
      "price": 80,
      "categoryId": "cat-drinks-hot",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-84",
      "name": "Macchiato",
      "description": "",
      "price": 95,
      "categoryId": "cat-drinks-hot",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-85",
      "name": "Double Macchiato",
      "description": "",
      "price": 180,
      "categoryId": "cat-drinks-hot",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-86",
      "name": "Milk",
      "description": "",
      "price": 110,
      "categoryId": "cat-drinks-hot",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-87",
      "name": "Espresso",
      "description": "",
      "price": 80,
      "categoryId": "cat-drinks-hot",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-88",
      "name": "Americano",
      "description": "",
      "price": 85,
      "categoryId": "cat-drinks-hot",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-89",
      "name": "Café Latte",
      "description": "",
      "price": 180,
      "categoryId": "cat-drinks-hot",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-90",
      "name": "Tea Latte",
      "description": "",
      "price": 150,
      "categoryId": "cat-drinks-hot",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-91",
      "name": "Cappuccino",
      "description": "",
      "price": 195,
      "categoryId": "cat-drinks-hot",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-92",
      "name": "Coffee Karavat",
      "description": "",
      "price": 80,
      "categoryId": "cat-drinks-hot",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-93",
      "name": "Steamed Coffee",
      "description": "",
      "price": 75,
      "categoryId": "cat-drinks-hot",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-94",
      "name": "Egg",
      "description": "",
      "price": 35,
      "categoryId": "cat-extras",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-95",
      "name": "Bread",
      "description": "",
      "price": 35,
      "categoryId": "cat-extras",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-96",
      "name": "Cheese",
      "description": "",
      "price": 70,
      "categoryId": "cat-extras",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-97",
      "name": "Honey",
      "description": "",
      "price": 50,
      "categoryId": "cat-extras",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    },
    {
      "id": "item-98",
      "name": "Mayonnaise",
      "description": "",
      "price": 45,
      "categoryId": "cat-extras",
      "image": "",
      "extras": [],
      "available": true,
      "tags": []
    }
  ]
};;

/** Format a number as Ethiopian Birr */
export function formatPrice(amount: number): string {
  return `ETB ${amount.toLocaleString("en-ET", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// ── Cloud Database (Supabase) Helpers ──

async function withTimeout<T>(promise: Promise<T>, ms: number = 5000): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Connection Timeout")), ms)
  );
  return Promise.race([promise, timeout]);
}

export async function fetchMenuCloud(): Promise<MenuData | null> {
  try {
    const fetchCats = supabase.from("categories").select("*").order("sort_order", { ascending: true });
    const fetchItems = supabase.from("menu_items").select("*").order("sort_order", { ascending: true });

    const [{ data: cats }, { data: items }] = await withTimeout(Promise.all([fetchCats, fetchItems]), 6000);

    if (!cats || !items) return null;

    return {
      categories: cats.map(c => ({ 
        id: c.id, 
        name: c.name, 
        parentId: c.parent_id 
      })),
      items: items.map(i => ({
        id: i.id,
        name: i.name,
        description: i.description || "",
        price: Number(i.price),
        categoryId: i.category_id,
        image: i.image || "",
        extras: Array.isArray(i.extras) ? i.extras : [],
        available: i.available !== false,
        tags: i.tags || []
      }))
    };
  } catch (err) {
    console.warn("Cloud Fetch Failed (Timeout or Network):", err);
    return null;
  }
}

export async function testConnectionCloud(): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await withTimeout(supabase.from("categories").select("id").limit(1), 5000);
    if (error) return { success: false, message: error.message };
    return { success: true, message: "Connected successfully!" };
  } catch (err: any) {
    return { success: false, message: err.message || "Unknown Network Error" };
  }
}


export async function saveMenuCloud(data: MenuData) {
  try {
    // 1. Prepare Categories
    const categoriesToUpsert = data.categories.map((c, idx) => ({
      id: c.id,
      name: c.name,
      parent_id: c.parentId || null,
      sort_order: idx
    }));

    // 2. Prepare Items
    const itemsToUpsert = data.items.map((i, idx) => ({
      id: i.id,
      name: i.name,
      description: i.description || "",
      price: i.price,
      category_id: i.categoryId,
      image: i.image || "",
      extras: i.extras || [],
      available: i.available !== false,
      tags: i.tags || [],
      sort_order: idx
    }));

    // Start by syncing categories so foreign keys on items work
    const { error: catError } = await withTimeout(supabase.from("categories").upsert(categoriesToUpsert));
    if (catError) throw catError;

    const { error: itemError } = await withTimeout(supabase.from("menu_items").upsert(itemsToUpsert));
    if (itemError) throw itemError;

    return true;
  } catch (err) {
    console.error("Cloud Save Failed:", err);
    return false;
  }
}

export async function deleteItemCloud(id: string) {
  await supabase.from("menu_items").delete().eq("id", id);
}

export async function deleteCategoryCloud(id: string) {
  await supabase.from("categories").delete().eq("id", id);
}

// ── Passcode Persistence ──
export async function fetchPasscodeCloud(): Promise<string | null> {
  const { data } = await supabase.from("app_settings").select("value").eq("id", "admin_passcode").single();
  return data?.value?.passcode || null;
}

export async function savePasscodeCloud(passcode: string) {
  await supabase.from("app_settings").upsert({ id: "admin_passcode", value: { passcode } });
}

// ── Legacy Local Storage ──
export function loadMenuLocal(): MenuData {
  if (typeof window === "undefined") return DEFAULT_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DATA;
    const parsed = JSON.parse(raw) as MenuData;
    return {
      categories: parsed.categories || [],
      items: (parsed.items || []).map(i => ({ ...i, available: i.available !== false, tags: i.tags || [] }))
    };
  } catch {
    return DEFAULT_DATA;
  }
}

export function saveMenuLocal(data: MenuData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch (err) {
    console.warn("Local save failed (usually storage full)");
  }
}

/**
 * Compresses an image data URL to a smaller size/quality to save localStorage space.
 */
export async function compressImage(dataUrl: string, maxWidth = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl); // Fallback to original if error
  });
}

export function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useMenu(): { 
  data: MenuData; 
  update: (d: MenuData) => Promise<void>; 
  isLoading: boolean;
  cloudStatus: "online" | "offline" | "connecting";
  migrateToCloud: () => Promise<void>;
  skipSync: () => void;
} {
  const [data, setData] = useState<MenuData>(loadMenuLocal());
  // Zero-Wait Loading: Don't show loading screen if we have local data already
  const [isLoading, setIsLoading] = useState(() => {
    const local = loadMenuLocal();
    return !(local.categories.length > 0 || local.items.length > 0);
  });
  const [cloudStatus, setCloudStatus] = useState<"online" | "offline" | "connecting">("connecting");

  const pull = useCallback(async (isInitial = false) => {
    try {
      const cloud = await fetchMenuCloud();
      if (cloud) {
        setData(cloud);
        saveMenuLocal(cloud);
        setCloudStatus("online");
      } else {
        setCloudStatus("offline");
      }
    } catch {
      setCloudStatus("offline");
    } finally {
      // Small delay on initial load to prevent flickering if cloud is instant
      if (isInitial) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial Pull in background
    pull(true);

    // 2. Realtime Subscriptions
    let itemSub: any = null;
    try {
      itemSub = supabase
        .channel("menu_changes")
        .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, () => pull())
        .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => pull())
        .subscribe((status) => {
           if (status === "TIMED_OUT" || status === "CLOSED") setCloudStatus("offline");
        });
    } catch (err) {
      console.warn("Realtime not available:", err);
    }

    // 3. Local Event (Fallback)
    const onChange = () => setData(loadMenuLocal());
    window.addEventListener(EVENT, onChange);

    return () => {
      if (itemSub) itemSub.unsubscribe();
      window.removeEventListener(EVENT, onChange);
    };
  }, [pull]);

  const update = async (next: MenuData) => {
    // 1. Optimistic UI update (Instant)
    setData(next);
    saveMenuLocal(next);
    
    // 2. Background cloud save (Non-blocking)
    // We don't 'await' this so the caller (Admin UI) can minimize/close instantly
    saveMenuCloud(next).then(success => {
      if (success) setCloudStatus("online");
      else setCloudStatus("offline");
    }).catch(err => {
      console.warn("Background cloud sync failed:", err);
      setCloudStatus("offline");
    });
  };

  const migrateToCloud = async () => {
    const local = loadMenuLocal();
    const success = await saveMenuCloud(local);
    if (success) {
      setCloudStatus("online");
      await pull();
    } else {
      setCloudStatus("offline");
      throw new Error("Could not reach the cloud. Please check your internet.");
    }
  };

  const skipSync = () => {
     setIsLoading(false);
     setCloudStatus("offline");
  };

  return { data, update, isLoading, cloudStatus, migrateToCloud, skipSync };
}
