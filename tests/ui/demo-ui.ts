
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';

// Admin Port: 3002, Merchant Port: 3000
const ADMIN_URL = 'http://localhost:3002';
const MERCHANT_URL = 'http://localhost:3000';

const USER_NAME = 'ceshimiziqiu';
const ADMIN_PWD = ''; // Default empty based on code analysis
const MERCHANT_PWD = '123456';

// Style Data
const DEMO_STYLE = {
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
    link: 'https://example.com/style/123',
    remark: 'Demo 自动推送款 - 2024夏季新品',
};

async function run() {
    console.log('🎬 启动 UI 自动化演示 (Puppeteer)...');

    // Launch browser with headful mode
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null, // Full width
        args: ['--start-maximized'],
        slowMo: 100, // Slow down operations for visibility
    });

    try {
        // ==========================================
        // 1. ADMIN: Login & Push Style
        // ==========================================
        console.log('🔹 [Admin] 打开管理后台...');
        const adminPage = await browser.newPage();
        await adminPage.goto(ADMIN_URL);
        await adminPage.bringToFront();

        // Login
        console.log('🔹 [Admin] 登录...');
        await adminPage.type('input[placeholder="输入角色名称"]', USER_NAME);
        await adminPage.type('input[placeholder="输入密码"]', ADMIN_PWD); // Empty password
        await adminPage.keyboard.press('Enter');
        await adminPage.waitForNavigation({ waitUntil: 'networkidle0' });

        console.log('🔹 [Admin] 进入推款管理...');
        // Click "款式管理" (Expand menu if needed) then "推款管理"
        // Find button containing text "推款管理"
        const pushMenuBtn = await adminPage.waitForSelector('xpath///button[contains(., "推款管理")]');
        if (pushMenuBtn) await pushMenuBtn.click();

        // Fill Push Form
        console.log('🔹 [Admin] 填写推款表单...');
        await new Promise(r => setTimeout(r, 1000)); // Pause for visual
        await adminPage.type('input[placeholder="输入图片URL"]', DEMO_STYLE.image);
        await adminPage.type('input[placeholder="输入链接"]', DEMO_STYLE.link);

        // Select Tags
        console.log('🔹 [Admin] 选择标签...');
        const visualTag = await adminPage.waitForSelector('xpath///span[contains(@class, "tag") and contains(., "人模")]');
        if (visualTag) await visualTag.click();
        await new Promise(r => setTimeout(r, 500));
        const styleTag = await adminPage.waitForSelector('xpath///span[contains(@class, "tag") and contains(., "优雅风")]');
        if (styleTag) await styleTag.click();

        // Select Shop
        console.log('🔹 [Admin] 选择店铺...');
        await adminPage.click('.search-box'); // Click to open dropdown
        await new Promise(r => setTimeout(r, 500));
        // Find shop item containing "小铃子" or "测试"
        // Based on mock data in PushManage.tsx: "新店测试", "示例官方旗舰店"
        // Let's pick one that is likely available. We'll pick the first one available.
        const shopItem = await adminPage.waitForSelector('.shop-select-item');
        if (shopItem) await shopItem.click();

        // Submit
        console.log('🔹 [Admin] 提交推送...');
        const submitBtn = await adminPage.waitForSelector('xpath///button[contains(., "确认私推")]');
        if (submitBtn) await submitBtn.click();

        // Handle Alert
        adminPage.on('dialog', async dialog => {
            console.log(`Alert: ${dialog.message()}`);
            await dialog.accept();
        });

        await new Promise(r => setTimeout(r, 2000)); // Wait for processing

        // ==========================================
        // 2. MERCHANT: Login & Accept
        // ==========================================
        console.log('🔸 [Merchant] 打开商家后台...');
        const merchantPage = await browser.newPage();
        await merchantPage.goto(MERCHANT_URL);
        await merchantPage.bringToFront();

        // Login
        console.log('🔸 [Merchant] 登录...');
        await merchantPage.type('input[placeholder="请输入账号"]', USER_NAME);
        await merchantPage.type('input[placeholder="请输入密码"]', MERCHANT_PWD);
        await merchantPage.click('button[type="submit"]');
        // Wait for login to complete (Header appears)
        await merchantPage.waitForSelector('header', { timeout: 5000 });

        console.log('🔸 [Merchant] 正在查看接款工作台...');
        await new Promise(r => setTimeout(r, 2000));

        // Find the "确认接款" button for our style
        // We look for the card with our image
        console.log('🔸 [Merchant] 寻找新推送...');
        // Using xpath to find the button relative to the image or just the first confirm button
        const confirmBtn = await merchantPage.waitForSelector('xpath///button[contains(., "确认接款")]', { timeout: 5000 });

        if (confirmBtn) {
            console.log('🔸 [Merchant] 点击确认接款...');
            await confirmBtn.click();
            await new Promise(r => setTimeout(r, 2000));
            console.log('✅ 接款成功！');
        } else {
            console.warn('⚠️ 未找到"确认接款"按钮，可能款式未送达或已接单。');
        }

        console.log('🎉 演示完成！3秒后关闭浏览器...');
        await new Promise(r => setTimeout(r, 3000));
        await browser.close();

    } catch (e) {
        console.error('❌ 演示出错:', e);
        // Do not close browser strictly on error to allow debugging
        // await browser.close();
    }
}

run();
