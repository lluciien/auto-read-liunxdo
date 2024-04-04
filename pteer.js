const fs = require("fs");

const path = require("path");
const puppeteer = require("puppeteer");
require("dotenv").config();

(async () => {
  try {
    //随机等待时间
    function delayClick(time) {
      return new Promise(function (resolve) {
        setTimeout(resolve, time);
      });
    }
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"], //linuzx需要
      defaultViewport: {
        width: 1280,
        height: 800,
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36",
      },
    });
    const page = await browser.newPage();
    page.on("pageerror", (error) => {
      console.error(`Page error: ${error.message}`);
    });
    page.on("error", async (error) => {
      console.error(`Error: ${error.message}`);
      // 检查是否是 localStorage 的访问权限错误
      if (
        error.message.includes(
          "Failed to read the 'localStorage' property from 'Window'"
        )
      ) {
        console.log("Trying to refresh the page to resolve the issue...");
        await page.reload(); // 刷新页面
        // 重新尝试你的操作...
      }
    });
    page.on("console", async (msg) => {
      console.log("PAGE LOG:", msg.text());
      if (msg.text().includes("the server responded with a status of 429")) {
        await page.evaluate(() => {
          localStorage.setItem("autoLikeEnabled", "false");
        });
        // 等待一段时间，比如 10 秒
        await new Promise((resolve) => setTimeout(resolve, 10000));
        console.log("Retrying now...");
        // 尝试刷新页面
        await page.reload();
      }
    });
    // // 监听所有请求
    // page.on("request", (request) => {
    //   console.log("Request URL:", request.url());
    //   console.log("Request Headers:", request.headers());
    // });

    //登录操作
    await page.goto("https://linux.do");
    console.log("登录操作");
    // 使用XPath查询找到包含"登录"或"login"文本的按钮
    await page.evaluate(() => {
      let loginButton = Array.from(document.querySelectorAll("button")).find(
        (button) =>
          button.textContent.includes("登录") ||
          button.textContent.includes("login")
      );
      // 如果没有找到，尝试根据类名查找
      if (!loginButton) {
        loginButton = document.querySelector(
          ".widget-button.btn.btn-primary.btn-small.login-button.btn-icon-text"
        );
      }
      console.log(loginButton);
      if (loginButton) {
        loginButton.click();
        console.log("Login button clicked.");
      } else {
        console.log("Login button not found.");
      }
    });

    // 等待用户名输入框加载
    await page.waitForSelector("#login-account-name");
    // 模拟人类在找到输入框后的短暂停顿
    await delayClick(500); // 延迟500毫秒
    // 清空输入框并输入用户名
    await page.click("#login-account-name", { clickCount: 3 });
    await page.type("#login-account-name", process.env.USERNAMELINUXDO, {
      delay: 100,
    }); // 输入时在每个按键之间添加额外的延迟

    // 等待密码输入框加载
    await page.waitForSelector("#login-account-password");
    // 模拟人类在输入用户名后的短暂停顿
    await delayClick(500);
    // 清空输入框并输入密码
    await page.click("#login-account-password", { clickCount: 3 });
    await page.type("#login-account-password", process.env.PASSWORDLINUXDO, {
      delay: 100,
    });

    // 模拟人类在输入完成后思考的短暂停顿
    await delayClick(1000);

    // 假设登录按钮的ID是'login-button'，点击登录按钮
    await page.waitForSelector("#login-button");
    await delayClick(500); // 模拟在点击登录按钮前的短暂停顿
    await Promise.all([
      page.waitForNavigation(), // 等待页面跳转
      page.click("#login-button"), // 点击登录按钮触发跳转
    ]);
    await delayClick(1000);
    // 查找具有类名 "avatar" 的 img 元素验证登录是否成功
    const avatarImg = await page.$("img.avatar");

    if (avatarImg) {
      console.log("找到avatarImg，登录成功");
      // 可以继续对 avatarImg 进行操作，比如获取其属性等
    } else {
      console.log("未找到avatarImg，登录失败");
    }

    //真正执行阅读脚本
    // 读取外部脚本文件的内容
    const externalScriptPath = path.join(__dirname, "external.js");
    const externalScript = fs.readFileSync(externalScriptPath, "utf8");

    // 在每个新的文档加载时执行外部脚本
    await page.evaluateOnNewDocument((...args) => {
      const [scriptToEval] = args;
      eval(scriptToEval);
    }, externalScript);

    // 添加一个监听器来监听每次页面加载完成的事件
    // page.on("load", async () => {
    //   await page.evaluate(externalScript);
    // });
    await page.goto("https://linux.do/t/topic/13716/100");
  } catch (err) {
    console.log(err);
  }
})();