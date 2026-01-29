
import { runDemoScenario } from './scenarios/demo';
import { api } from './api-client';

async function main() {
    const args = process.argv.slice(2);
    const loop = args.includes('--loop');

    console.log('正在连接 API 服务器...');
    try {
        await api.healthCheck();
        console.log('✅ API 连接成功');
    } catch (e) {
        console.error('❌ 无法连接后端 API，请确保 `npm run server` 已运行。');
        process.exit(1);
    }

    if (loop) {
        console.log('🔁 进入无限循环演示模式 (按 Ctrl+C 停止)');
        while (true) {
            try {
                await runDemoScenario();
            } catch (e) {
                console.error('演示过程中发生错误:', e);
                console.log('3秒后重试...');
                await new Promise(r => setTimeout(r, 3000));
            }
        }
    } else {
        await runDemoScenario();
    }
}

main().catch(console.error);
