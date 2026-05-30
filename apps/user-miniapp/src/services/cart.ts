export const CART_STORAGE_KEY = "jss_cart_items";
export const CHECKOUT_CART_STORAGE_KEY = "jss_checkout_cart_items";

export interface CartItem {
  skuId: string;
  productId: string;
  name: string;
  skuName?: string;
  imageUrl?: string;
  price: number;
  stock?: number;
  storeName?: string;
  quantity: number;
  addedAt: string;
}

function normalizeQuantity(quantity: unknown) {
  const value = Number(quantity ?? 1);
  return Number.isFinite(value) ? Math.min(99, Math.max(1, Math.floor(value))) : 1;
}

function normalizePrice(price: unknown) {
  const value = Number(price ?? 0);
  return Number.isFinite(value) ? Math.max(0, Math.round(value * 100) / 100) : 0;
}

function normalizeStock(stock: unknown) {
  if (stock === undefined || stock === null || stock === "") {
    return undefined;
  }
  const value = Number(stock);
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : undefined;
}

export function readCartItems() {
  const cached = uni.getStorageSync(CART_STORAGE_KEY);
  if (!Array.isArray(cached)) {
    return [];
  }

  return cached
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      skuId: String(item.skuId || ""),
      productId: String(item.productId || ""),
      name: String(item.name || "数码配件"),
      skuName: typeof item.skuName === "string" ? item.skuName : "",
      imageUrl: typeof item.imageUrl === "string" ? item.imageUrl : "",
      price: normalizePrice(item.price),
      stock: normalizeStock(item.stock),
      storeName: typeof item.storeName === "string" ? item.storeName : "",
      quantity: normalizeQuantity(item.quantity),
      addedAt: typeof item.addedAt === "string" ? item.addedAt : new Date().toISOString()
    }))
    .filter((item) => item.skuId && item.productId)
    .slice(0, 50);
}

export function saveCartItems(items: CartItem[]) {
  uni.setStorageSync(CART_STORAGE_KEY, items.slice(0, 50));
}

export function addCartItem(item: Omit<CartItem, "quantity" | "addedAt"> & { quantity?: number }) {
  const items = readCartItems();
  const quantity = normalizeQuantity(item.quantity);
  const existing = items.find((cartItem) => cartItem.skuId === item.skuId);
  const nextItem: CartItem = {
    ...item,
    price: normalizePrice(item.price),
    stock: normalizeStock(item.stock),
    quantity: existing
      ? Math.min(existing.quantity + quantity, item.stock && item.stock > 0 ? item.stock : 99)
      : quantity,
    addedAt: new Date().toISOString()
  };
  saveCartItems([nextItem, ...items.filter((cartItem) => cartItem.skuId !== item.skuId)]);
  return nextItem;
}

export function updateCartItemQuantity(skuId: string, quantity: number) {
  const nextItems = readCartItems().map((item) =>
    item.skuId === skuId ? { ...item, quantity: normalizeQuantity(quantity) } : item
  );
  saveCartItems(nextItems);
  return nextItems;
}

export function removeCartItems(skuIds: string[]) {
  const removable = new Set(skuIds);
  const nextItems = readCartItems().filter((item) => !removable.has(item.skuId));
  saveCartItems(nextItems);
  return nextItems;
}

export function clearCartItems() {
  uni.removeStorageSync(CART_STORAGE_KEY);
}

export function saveCheckoutCartItems(items: CartItem[]) {
  uni.setStorageSync(CHECKOUT_CART_STORAGE_KEY, items);
}

export function readCheckoutCartItems() {
  const cached = uni.getStorageSync(CHECKOUT_CART_STORAGE_KEY);
  return Array.isArray(cached) ? (cached as CartItem[]) : [];
}

export function clearCheckoutCartItems() {
  uni.removeStorageSync(CHECKOUT_CART_STORAGE_KEY);
}
