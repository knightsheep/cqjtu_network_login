# Campus Network Login 2.0

这是一个用于 DrCom 校园网登录页面的 Tampermonkey 用户脚本。脚本会在页面加载早期模拟手机端环境，并尝试让登录页面将当前设备识别为手机终端。

## 功能简介

- 覆盖 `navigator.userAgent`、`platform`、`vendor`、`maxTouchPoints` 等浏览器属性。
- 模拟手机屏幕尺寸、窗口尺寸和设备像素比。
- Hook `util.getTermType()`，强制返回手机终端类型。
- Hook `term.init()`，确保 `term.type` 被设置为手机类型。
- 通过轮询和页面变动监听，应对 `a41.js` 动态加载的情况。

## 适用范围

脚本默认匹配以下页面：

```text
*://172.19.7.17/*
*://*.drcom.com.cn/*
```

如果你的校园网登录地址不同，需要在脚本头部的 `@match` 中自行添加对应地址。

## 使用方法

1. 安装浏览器扩展 Tampermonkey。
2. 新建用户脚本。
3. 将 `Campus Network Login 2.0.js` 的内容复制到 Tampermonkey 编辑器中并保存。
4. 打开校园网登录页面，脚本会在页面加载时自动运行。

## 注意事项

- 本脚本仅用于个人校园网登录环境测试与学习。
- 不同学校或不同版本的 DrCom 登录页可能存在差异，脚本不保证通用。
- 如果登录页脚本结构发生变化，可能需要调整 Hook 逻辑。
- 使用前请确认符合所在网络环境的相关规定。
