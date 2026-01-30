import React, { useState, useEffect } from 'react';

interface DashboardStats {
    keyCount: number;
    shopCount: number;
    spuCount: number;
    activeUsers: number;
    styleOrderCount: number;
    pricingOrderCount: number;
    anomalyOrderCount: number;
    restockOrderCount: number;
}

interface PushStats {
    privatePending: number;
    privateAccepted: number;
    privateInProgress: number;
    publicTotal: number;
    publicFull: number;
    publicIntent: number;
}

interface ShopLevelData {
    level: string;
    count: number;
    color: string;
}

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats>({
        keyCount: 0,
        shopCount: 0,
        spuCount: 0,
        activeUsers: 0,
        styleOrderCount: 0,
        pricingOrderCount: 0,
        anomalyOrderCount: 0,
        restockOrderCount: 0
    });

    const [pushStats, setPushStats] = useState<PushStats>({
        privatePending: 0,
        privateAccepted: 0,
        privateInProgress: 0,
        publicTotal: 0,
        publicFull: 0,
        publicIntent: 0
    });

    const [shopLevelData, setShopLevelData] = useState<ShopLevelData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

                // 并行获取所有数据
                const [dashboardRes, privateRes, publicRes] = await Promise.all([
                    fetch(`${API_BASE}/api/admin/dashboard`),
                    fetch(`${API_BASE}/api/styles/private?pageSize=1000`),
                    fetch(`${API_BASE}/api/styles/public?pageSize=1000`)
                ]);

                if (!dashboardRes.ok) throw new Error('Failed to fetch dashboard data');

                const dashboardData = await dashboardRes.json();
                const privateData = await privateRes.json();
                const publicData = await publicRes.json();

                const { stats: apiStats, shop_levels } = dashboardData;
                const privateStyles = privateData.data || [];
                const publicStyles = publicData.data || [];

                // 设置统计数据
                setStats({
                    keyCount: apiStats.key_total || 0,
                    shopCount: apiStats.shop_total || 0,
                    spuCount: apiStats.spu_total || 0,
                    activeUsers: apiStats.user_total || 4,
                    styleOrderCount: apiStats.style_pending || 0,
                    pricingOrderCount: apiStats.pricing_pending || 0,
                    anomalyOrderCount: apiStats.anomaly_pending || 0,
                    restockOrderCount: apiStats.restock_pending || 0
                });

                // 计算真实的推款统计
                const privatePending = privateStyles.filter((s: any) => s.status === 'new' || s.status === 'locked').length;
                const privateAccepted = privateStyles.filter((s: any) => s.status === 'developing').length;
                const privateInProgress = privateStyles.filter((s: any) => s.development_status && s.development_status !== 'success').length;

                const publicTotal = publicStyles.length;
                const publicFull = publicStyles.filter((s: any) => s.intent_count >= s.max_intents).length;
                const publicIntent = publicStyles.filter((s: any) => s.intent_count > 0 && s.intent_count < s.max_intents).length;

                setPushStats({
                    privatePending,
                    privateAccepted,
                    privateInProgress,
                    publicTotal,
                    publicFull,
                    publicIntent
                });

                // 设置商家等级分布
                if (shop_levels) {
                    setShopLevelData([
                        { level: 'S级', count: shop_levels.S || 0, color: '#FF6B6B' },
                        { level: 'A级', count: shop_levels.A || 0, color: '#4ECDC4' },
                        { level: 'B级', count: shop_levels.B || 0, color: '#45B7D1' },
                        { level: 'C级', count: shop_levels.C || 0, color: '#96CEB4' },
                        { level: 'N级', count: shop_levels.N || 0, color: '#9CA3AF' },
                    ]);
                }

            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
                // 使用空数据作为备用
                setStats({
                    keyCount: 0,
                    shopCount: 0,
                    spuCount: 0,
                    activeUsers: 0,
                    styleOrderCount: 0,
                    pricingOrderCount: 0,
                    anomalyOrderCount: 0,
                    restockOrderCount: 0
                });
                setPushStats({
                    privatePending: 0,
                    privateAccepted: 0,
                    privateInProgress: 0,
                    publicTotal: 0,
                    publicFull: 0,
                    publicIntent: 0
                });
                setShopLevelData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const StatCard: React.FC<{ title: string; value: number; icon: string; color: string; subtitle?: string }> =
        ({ title, value, icon, color, subtitle }) => (
            <div className="stat-card" style={{ borderLeft: `4px solid ${color}` }}>
                <div className="stat-icon" style={{ background: `${color}15`, color }}>
                    <span className="material-symbols-outlined">{icon}</span>
                </div>
                <div className="stat-info">
                    <div className="stat-value">{loading ? '-' : value}</div>
                    <div className="stat-title">{title}</div>
                    {subtitle && <div className="stat-subtitle">{subtitle}</div>}
                </div>
            </div>
        );

    const totalShops = shopLevelData.reduce((sum, d) => sum + d.count, 0);

    return (
        <div className="dashboard-page">
            <div className="page-header">
                <h1>🏠 首页看板</h1>
                <p className="page-subtitle">供应链运营数据概览</p>
            </div>

            {/* 第一行：KEY数量、商家数量、SPU数量、系统情况 */}
            <div className="stats-row">
                <StatCard
                    title="KEY数量"
                    value={stats.keyCount}
                    icon="key"
                    color="#6366F1"
                    subtitle="商家主体"
                />
                <StatCard
                    title="商家数量"
                    value={stats.shopCount}
                    icon="store"
                    color="#8B5CF6"
                    subtitle="店铺总数"
                />
                <StatCard
                    title="SPU数量"
                    value={stats.spuCount}
                    icon="inventory"
                    color="#06B6D4"
                    subtitle="在库款式"
                />
                <StatCard
                    title="系统情况"
                    value={stats.activeUsers}
                    icon="group"
                    color="#10B981"
                    subtitle="今日活跃"
                />
            </div>

            {/* 第二行：款式工单、核价工单、异常工单、大货工单 */}
            <div className="stats-row">
                <StatCard
                    title="款式工单"
                    value={stats.styleOrderCount}
                    icon="checkroom"
                    color="#EC4899"
                />
                <StatCard
                    title="核价工单"
                    value={stats.pricingOrderCount}
                    icon="price_check"
                    color="#F59E0B"
                />
                <StatCard
                    title="异常工单"
                    value={stats.anomalyOrderCount}
                    icon="warning"
                    color="#EF4444"
                />
                <StatCard
                    title="大货工单"
                    value={stats.restockOrderCount}
                    icon="inventory_2"
                    color="#14B8A6"
                />
            </div>

            {/* 第三行：私推/公池情况 | 商家分层情况 */}
            <div className="dashboard-row-split">
                {/* 私推和公池情况 */}
                <div className="dashboard-section">
                    <h2>📦 私推和公池情况</h2>
                    <div className="push-stats-grid">
                        <div className="push-category">
                            <h3>私推</h3>
                            <div className="push-stat-item">
                                <span className="push-label">待接款</span>
                                <span className="push-value" style={{ color: '#F59E0B' }}>{pushStats.privatePending}</span>
                            </div>
                            <div className="push-stat-item">
                                <span className="push-label">已接款</span>
                                <span className="push-value" style={{ color: '#10B981' }}>{pushStats.privateAccepted}</span>
                            </div>
                            <div className="push-stat-item">
                                <span className="push-label">进行中</span>
                                <span className="push-value" style={{ color: '#6366F1' }}>{pushStats.privateInProgress}</span>
                            </div>
                        </div>
                        <div className="push-divider"></div>
                        <div className="push-category">
                            <h3>公池</h3>
                            <div className="push-stat-item">
                                <span className="push-label">总款式</span>
                                <span className="push-value" style={{ color: '#8B5CF6' }}>{pushStats.publicTotal}</span>
                            </div>
                            <div className="push-stat-item">
                                <span className="push-label">已满额</span>
                                <span className="push-value" style={{ color: '#EF4444' }}>{pushStats.publicFull}</span>
                            </div>
                            <div className="push-stat-item">
                                <span className="push-label">意向中</span>
                                <span className="push-value" style={{ color: '#06B6D4' }}>{pushStats.publicIntent}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 商家分层情况 */}
                <div className="dashboard-section">
                    <h2>📊 商家分层情况</h2>
                    <div className="level-distribution">
                        {shopLevelData.map(item => (
                            <div key={item.level} className="level-bar-container">
                                <div className="level-label">{item.level}</div>
                                <div className="level-bar-wrapper">
                                    <div
                                        className="level-bar"
                                        style={{
                                            width: totalShops > 0 ? `${(item.count / totalShops) * 100}%` : '0%',
                                            backgroundColor: item.color
                                        }}
                                    />
                                </div>
                                <div className="level-count">{item.count}</div>
                            </div>
                        ))}
                    </div>
                    <div className="level-total">
                        总计：<strong>{totalShops}</strong> 家
                    </div>
                </div>
            </div>

            <style>{`
                .dashboard-page {
                    padding: 24px;
                }
                .page-header {
                    margin-bottom: 24px;
                }
                .page-header h1 {
                    margin: 0;
                    font-size: 24px;
                    color: var(--text-primary);
                }
                .page-subtitle {
                    margin: 8px 0 0;
                    color: var(--text-muted);
                    font-size: 14px;
                }
                .stats-row {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 16px;
                    margin-bottom: 20px;
                }
                @media (max-width: 1200px) {
                    .stats-row {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
                .stat-card {
                    background: var(--card-bg);
                    border-radius: 12px;
                    padding: 20px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    box-shadow: var(--shadow-sm);
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .stat-card:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }
                .stat-icon {
                    width: 48px;
                    height: 48px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .stat-icon .material-symbols-outlined {
                    font-size: 24px;
                }
                .stat-value {
                    font-size: 28px;
                    font-weight: 700;
                    color: var(--text-primary);
                }
                .stat-title {
                    font-size: 13px;
                    color: var(--text-muted);
                    margin-top: 2px;
                }
                .stat-subtitle {
                    font-size: 11px;
                    color: var(--text-muted);
                    opacity: 0.7;
                }
                .dashboard-row-split {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                }
                @media (max-width: 900px) {
                    .dashboard-row-split {
                        grid-template-columns: 1fr;
                    }
                }
                .dashboard-section {
                    background: var(--card-bg);
                    border-radius: 12px;
                    padding: 24px;
                    box-shadow: var(--shadow-sm);
                }
                .dashboard-section h2 {
                    margin: 0 0 20px;
                    font-size: 16px;
                    color: var(--text-primary);
                }
                .push-stats-grid {
                    display: flex;
                    gap: 24px;
                }
                .push-category {
                    flex: 1;
                }
                .push-category h3 {
                    font-size: 14px;
                    color: var(--text-secondary);
                    margin: 0 0 12px;
                    padding-bottom: 8px;
                    border-bottom: 1px solid var(--border-color);
                }
                .push-divider {
                    width: 1px;
                    background: var(--border-color);
                }
                .push-stat-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 0;
                }
                .push-label {
                    font-size: 13px;
                    color: var(--text-muted);
                }
                .push-value {
                    font-size: 18px;
                    font-weight: 600;
                }
                .level-distribution {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .level-bar-container {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .level-label {
                    width: 36px;
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--text-primary);
                }
                .level-bar-wrapper {
                    flex: 1;
                    height: 20px;
                    background: var(--bg-secondary);
                    border-radius: 6px;
                    overflow: hidden;
                }
                .level-bar {
                    height: 100%;
                    border-radius: 6px;
                    transition: width 0.5s ease;
                }
                .level-count {
                    width: 32px;
                    text-align: right;
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-primary);
                }
                .level-total {
                    margin-top: 16px;
                    padding-top: 12px;
                    border-top: 1px solid var(--border-color);
                    font-size: 13px;
                    color: var(--text-muted);
                    text-align: right;
                }
                .level-total strong {
                    color: var(--text-primary);
                    font-size: 16px;
                }
            `}</style>
        </div>
    );
};

export default Dashboard;
