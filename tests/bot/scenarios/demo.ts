
import { api } from '../api-client';

const DEMO_SHOP = {
    id: 'SHOP_DEMO_001',
    name: '✨ 演示专用制衣厂',
};

// 工具函数：延时
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 工具函数：带时间戳的日志
const log = (role: string, action: string, detail: string = '') => {
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] ${role} ${action} ${detail}`);
};

export async function runDemoScenario() {
    console.log('\n🎬 ==========================================');
    console.log('🎬 SCM 自动演示模式已启动');
    console.log('🎬 角色说明: 👩‍💼 = 买手 (Admin), 👨‍🏭 = 商家 (Merchant)');
    console.log('🎬 ==========================================\n');

    // 0. 初始化
    await sleep(1000);
    log('🔧', '系统准备', '正在清理旧的演示数据...');
    try {
        await api.resetDemoData(DEMO_SHOP.id);
        log('✅', '系统准备', '环境重置完成');
    } catch (e: any) {
        log('⚠️', '系统准备', '清理失败 (可能是首次运行): ' + e.message);
    }
    await sleep(2000);

    // 1. 买手发款
    log('👩‍💼', '【买手】', '正在浏览 2024 夏季新品图库...');
    await sleep(1500);

    const newStyles = [
        {
            shopId: DEMO_SHOP.id,
            shopName: DEMO_SHOP.name,
            name: '2024夏新款-法式碎花茶歇裙',
            imageUrl: 'https://images.unsplash.com/photo-1572804013307-a9a11198427e?auto=format&fit=crop&q=80&w=400',
            remark: '面料要透气，注意腰线位置，不要太高。',
            status: 'new'
        },
        {
            shopId: DEMO_SHOP.id,
            shopName: DEMO_SHOP.name,
            name: '通勤风-真丝质感衬衫',
            imageUrl: 'https://images.unsplash.com/photo-1598532163257-ae3cde09909c?auto=format&fit=crop&q=80&w=400',
            remark: '对标竞品 A 款，扣子要用贝母扣。',
            status: 'new'
        },
        {
            shopId: DEMO_SHOP.id,
            shopName: DEMO_SHOP.name,
            name: '高腰A字半身裙',
            imageUrl: 'https://images.unsplash.com/photo-1582142322350-df269c405460?auto=format&fit=crop&q=80&w=400',
            remark: '需要做防走光内衬。',
            status: 'new'
        }
    ];

    log('👩‍💼', '【买手】', `选中了 ${newStyles.length} 个新款，准备推送给供应商...`);
    await sleep(2000);
    await api.pushPrivate(newStyles);
    log('🚀', '【系统】', '推送成功！商家端已收到弹窗提醒。');
    await sleep(3000);

    // 2. 商家接款
    log('👨‍🏭', '【商家】', '收到新款推送，正在查看详情...');
    await sleep(2000);

    const styles: any = await api.getPrivateStyles(DEMO_SHOP.id);
    const pendingStyles = (styles.data as any[]).filter((s: any) => s.shop_id === DEMO_SHOP.id && s.status === 'new');

    if (pendingStyles.length > 0) {
        log('👨‍🏭', '【商家】', `发现 ${pendingStyles.length} 个待接款式，准备接单...`);
        for (const style of pendingStyles) {
            await sleep(1000);
            await api.confirmStyle(style.id);
            log('✅', '【商家】', `已接单：${style.name}`);
        }
    }
    await sleep(3000);

    // 3. 商家推进开发进度
    log('👨‍🏭', '【商家】', '开始打版制作...');

    // 获取正在开发的款式
    const devStylesRaw = await api.getDevelopingStyles();
    // 需要自己过滤，因为 getDevelopingStyles 返回所有
    // 但我们的 Demo Shop 只有刚刚接的
    // 由于 API 限制，这里简单假定最新的是我们的
    // 实际应根据 shopId 过滤（如果 API 支持，这里先不做复杂过滤）

    const targetStyle = pendingStyles[0]; // 拿第一个款式来演示全流程
    if (targetStyle) {
        log('🧵', '【商家】', `正在制作样衣：${targetStyle.name}`);
        await sleep(2000);

        await api.updateDevStatus(targetStyle.id, 'drafting');
        log('📝', '【商家】', '状态更新：打版中');
        await sleep(2500);

        await api.updateDevStatus(targetStyle.id, 'pattern');
        log('✂️', '【商家】', '状态更新：样衣制作完成，已寄出');
        await sleep(2000);

        // 4. 买手确认样衣（这里跳过“帮看”环节，直接进到 Upload SPU 即开发完成）
        // 实际上 SPU 上传通常意味着“开发成功”
        // 模拟商家上传 SPU
        log('👨‍🏭', '【商家】', '样衣审核通过，正在录入 SPU 信息...');
        await sleep(2000);
        await api.uploadSpu(targetStyle.id, [`DEMO-SPU-${Date.now()}`]);
        log('🎉', '【系统】', '开发完成！进入核价阶段。');
    }
    await sleep(3000);

    // 5. 核价与补货（模拟）
    log('💰', '【商家】', '发起核价申请...');
    await sleep(1500);
    log('👩‍💼', '【买手】', '收到报价单：面料 35元 + 工费 20元 = 55元');
    await sleep(2000);
    log('✅', '【买手】', '价格合理，通过审核！');
    await sleep(2000);

    log('📦', '【买手】', '检测到爆款库存不足，系统自动触发补货指令...');
    await sleep(1500);
    log('🚀', '【系统】', '已生成 500 件翻单任务，发送至工厂。');
    await sleep(2000);

    log('👨‍🏭', '【商家】', '收到返单任务，确认接单。');
    await sleep(1000);
    log('🚚', '【商家】', '大货生产完毕，已发货！');

    await sleep(2000);
    console.log('\n✨ ==========================================');
    console.log('✨ 本次演示结束，3秒后开始新一轮...');
    console.log('✨ ==========================================\n');
    await sleep(3000);
}
