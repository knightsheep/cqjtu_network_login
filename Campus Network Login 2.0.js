// ==UserScript==
// @name         DrCom 强制手机终端模式2.0
// @namespace    http://tampermonkey.net/
// @version      2026-04-07
// @description  强制 a41.js 识别为手机终端，绕过 util.getTermType 检测
// @author       You
// @match        *://172.19.7.17/*
// @match        *://*.drcom.com.cn/*
// @run-at       document-start
// @grant        unsafeWindow
// @grant        GM_info
// ==/UserScript==

(function() {
  'use strict';

  // 手机配置（与真实手机一致，避免其他检测项异常）
  const MOBILE_CONFIG = {
    termType: 2,  // 强制返回手机类型
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    platform: 'Android',
    vendor: 'Google Inc.',
    maxTouchPoints: 5,
    screen: { width: 393, height: 851, availWidth: 393, availHeight: 851 },
    innerSize: { width: 393, height: 735 },  // 减去地址栏等
    devicePixelRatio: 2.75
  };

  // 1. 最早期：覆盖 navigator 属性（防止其他脚本读取）
  try {
    const navProps = {
      userAgent: { value: MOBILE_CONFIG.userAgent, configurable: true },
      platform: { value: MOBILE_CONFIG.platform, configurable: true },
      vendor: { value: MOBILE_CONFIG.vendor, configurable: true },
      maxTouchPoints: { value: MOBILE_CONFIG.maxTouchPoints, configurable: true }
    };
    Object.defineProperties(navigator, navProps);

    // 添加触摸事件支持（部分页面检测 'ontouchstart' in window）
    if (!('ontouchstart' in window)) {
      window.ontouchstart = null;
    }
  } catch (e) {
    console.warn('[DrCom] navigator 修改受限:', e);
  }

  // 2. Hook util.getTermType - 核心！直接返回手机类型
  function hookGetTermType() {
    if (typeof unsafeWindow.util !== 'object') return false;

    const originalGetTermType = unsafeWindow.util.getTermType;
    unsafeWindow.util.getTermType = function() {
      console.log('[DrCom] util.getTermType() 被拦截，强制返回手机类型: 2');
      return MOBILE_CONFIG.termType;
    };
    return true;
  }

  // 3. Hook term.init - 双重保险，确保 term.type 被覆盖
  function hookTermInit() {
    if (typeof unsafeWindow.term?.init !== 'function') return false;

    const originalInit = unsafeWindow.term.init;
    unsafeWindow.term.init = function(next) {
      // 先执行原始 init（获取 IP/MAC 等必要参数）
      const result = originalInit.call(this, function() {
        // 关键：强制覆盖 type 为手机
        unsafeWindow.term.type = MOBILE_CONFIG.termType;
        console.log('[DrCom] term.type 已强制设为:', MOBILE_CONFIG.termType);
        // 执行原始回调
        next && next();
      });
      return result;
    };
    return true;
  }

  // 4. 修改 screen/inner 尺寸（辅助判断）
  function mockScreenSize() {
    try {
      // screen 对象
      Object.defineProperties(window.screen, {
        width: { get: () => MOBILE_CONFIG.screen.width, configurable: true },
        height: { get: () => MOBILE_CONFIG.screen.height, configurable: true },
        availWidth: { get: () => MOBILE_CONFIG.screen.availWidth, configurable: true },
        availHeight: { get: () => MOBILE_CONFIG.screen.availHeight, configurable: true }
      });

      // inner 尺寸
      Object.defineProperties(window, {
        innerWidth: { get: () => MOBILE_CONFIG.innerSize.width, configurable: true },
        innerHeight: { get: () => MOBILE_CONFIG.innerSize.height, configurable: true },
        devicePixelRatio: { get: () => MOBILE_CONFIG.devicePixelRatio, configurable: true }
      });
    } catch (e) {
      console.warn('[DrCom] 屏幕尺寸修改受限:', e);
    }
  }

  // 5. 轮询注入（应对动态加载的 a41.js）
  function injectWithRetry(maxRetries = 50, interval = 100) {
    let count = 0;
    const timer = setInterval(() => {
      count++;
      let success = 0;

      // 尝试 Hook util.getTermType
      if (typeof unsafeWindow.util === 'object' && typeof unsafeWindow.util.getTermType === 'function') {
        if (hookGetTermType()) success++;
      }

      // 尝试 Hook term.init
      if (typeof unsafeWindow.term === 'object' && typeof unsafeWindow.term.init === 'function') {
        if (hookTermInit()) success++;
      }

      // 都成功或超时则停止
      if (success >= 2 || count >= maxRetries) {
        clearInterval(timer);
        console.log(`[DrCom] 注入完成，尝试 ${count} 次`);
      }
    }, interval);
  }

  // 执行入口
  function main() {
    console.log('[DrCom] 手机模拟脚本启动');

    // 立即尝试修改屏幕尺寸
    mockScreenSize();

    // 如果 a41.js 已加载，直接 Hook
    if (typeof unsafeWindow.util?.getTermType === 'function') {
      hookGetTermType();
    }
    if (typeof unsafeWindow.term?.init === 'function') {
      hookTermInit();
    }

    // 否则轮询等待加载
    injectWithRetry();

    // 监听 term 对象创建（应对极端动态加载）
    new MutationObserver(() => {
      if (typeof unsafeWindow.util?.getTermType === 'function' &&
          unsafeWindow.util.getTermType.toString().indexOf('iTermType') !== -1) {
        hookGetTermType();
      }
      if (typeof unsafeWindow.term?.init === 'function') {
        hookTermInit();
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  // 确保在 unsafeWindow 上下文执行
  if (typeof unsafeWindow !== 'undefined') {
    main();
  } else {
    // 兼容模式
    main();
  }
})();
