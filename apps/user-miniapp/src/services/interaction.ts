export function createTapGuard(intervalMs = 420) {
  let lastTapAt = 0;

  return function canTap() {
    const now = Date.now();
    if (now - lastTapAt < intervalMs) {
      return false;
    }
    lastTapAt = now;
    return true;
  };
}

export function shortToast(title: string, icon: "success" | "none" = "none") {
  uni.showToast({ title, icon, duration: 750 });
}
