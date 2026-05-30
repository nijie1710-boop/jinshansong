<script lang="ts">
import { installMerchantAuthGuard } from "./services/auth-guard";

export default {
  onLaunch() {
    installMerchantAuthGuard();
  },
  onShow() {
    installMerchantAuthGuard();
  }
};
</script>

<style>
page {
  min-height: 100%;
  background: #f7f8fa;
  color: #111111;
  font-family:
    "PingFang SC",
    "Microsoft YaHei",
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
}

body {
  background: linear-gradient(180deg, #dfe3e8 0%, #eef1f5 100%);
  scrollbar-width: none;
}

body::-webkit-scrollbar,
uni-app::-webkit-scrollbar,
uni-page::-webkit-scrollbar,
uni-page-body::-webkit-scrollbar {
  display: none;
}

uni-app {
  display: block;
  width: 100%;
  max-width: 390px;
  min-height: 100vh;
  margin: 0 auto;
  overflow-x: hidden;
  background: #f7f8fa;
  box-shadow: 0 18px 70px rgba(17, 17, 17, 0.18);
  scrollbar-width: none;
}

uni-page-body {
  min-height: 100vh;
  background: #f7f8fa;
}

uni-page-head .uni-page-head {
  right: auto !important;
  left: 50% !important;
  width: 100% !important;
  max-width: 390px !important;
  transform: translateX(-50%);
}

uni-tabbar .uni-tabbar {
  right: auto !important;
  left: 50% !important;
  width: 100% !important;
  max-width: 390px !important;
  transform: translateX(-50%);
  border-top: 0 !important;
  box-shadow: 0 -8px 28px rgba(17, 17, 17, 0.08);
}

.page {
  min-height: 100vh;
  padding: 12px;
  padding-bottom: calc(76px + constant(safe-area-inset-bottom));
  padding-bottom: calc(76px + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.card {
  border: 1px solid rgba(17, 17, 17, 0.025);
  border-radius: 20px;
  background: #ffffff;
  padding: 14px;
  box-shadow: 0 10px 28px rgba(17, 17, 17, 0.055);
}

.section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
}

.muted {
  color: #666666;
}

.price {
  color: #ff3b30;
  font-weight: 700;
}

.tag {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 3px 7px;
  background: #fff2e8;
  color: #ff7a00;
  font-size: 11px;
}

.primary-button {
  display: flex;
  height: 46px;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ff7a00, #ffb020);
  color: #ffffff;
  font-weight: 600;
  line-height: 1;
  box-shadow: 0 8px 18px rgba(255, 122, 0, 0.22);
}

.ghost-button {
  display: flex;
  height: 42px;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid #ff7a00;
  color: #ff7a00;
  background: #ffffff;
  font-weight: 600;
  line-height: 1;
}

.primary-button:active,
.ghost-button:active {
  transform: scale(0.985);
  opacity: 0.88;
}

.primary-button::after,
.ghost-button::after {
  border: 0;
}

.mobile-fixed-bottom {
  position: fixed;
  right: auto;
  bottom: 0;
  left: 50%;
  width: 100%;
  max-width: 390px;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  transform: translateX(-50%);
  box-sizing: border-box;
}

input,
textarea {
  box-sizing: border-box;
  font-size: 16px;
}

@media (max-width: 390px) {
  uni-app {
    max-width: 100%;
    box-shadow: none;
  }

  uni-tabbar .uni-tabbar {
    max-width: 100% !important;
  }

  uni-page-head .uni-page-head {
    max-width: 100% !important;
  }
}
</style>
