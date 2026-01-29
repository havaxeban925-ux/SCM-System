import React, { useState } from 'react';

interface StyleOrder {
    id: string;
    shop_name: string;
    style_name: string;
    image_url: string;
    sub_type: '改图帮看' | '打版帮看' | '上传SPU';
    submit_time: string;
    status: '待处理' | '已处理' | '已驳回';
    content?: string;
    spu_list?: string;
}

const StyleOrderPage: React.FC = () => {
    const [orders, setOrders] = useState<StyleOrder[]>([
        {
            id: '1',
            shop_name: '韩都衣舍旗舰店',
            style_name: '法式碎花连衣裙',
            image_url: 'https://picsum.photos/seed/style1/100',
            sub_type: '改图帮看',
            submit_time: '2026-01-28 10:30',
            status: '待处理',
            content: '请帮忙看一下这个图片颜色是否正确，需要调整到更接近实物'
        },
        {
            id: '2',
            shop_name: '茵曼女装店',
            style_name: '极简真丝衬衫',
            image_url: 'https://picsum.photos/seed/style2/100',
            sub_type: '打版帮看',
            submit_time: '2026-01-28 14:00',
            status: '待处理',
            content: '版型有一点偏差，袖子长度需要确认'
        },
        {
            id: '3',
            shop_name: '欧时力官方旗舰店',
            style_name: '复古大摆裙',
            image_url: 'https://picsum.photos/seed/style3/100',
            sub_type: '上传SPU',
            submit_time: '2026-01-27 09:15',
            status: '已处理',
            spu_list: 'SPU-2026-001 SPU-2026-002 SPU-2026-003'
        },
        {
            id: '4',
            shop_name: '太平鸟女装',
            style_name: '针织开衫外套',
            image_url: 'https://picsum.photos/seed/style4/100',
            sub_type: '改图帮看',
            submit_time: '2026-01-28 08:45',
            status: '待处理',
            content: '图片背景需要更换，希望换成更简洁的纯色背景'
        },
        {
            id: '5',
            shop_name: '伊芙丽专卖店',
            style_name: '高腰阔腿裤',
            image_url: 'https://picsum.photos/seed/style5/100',
            sub_type: '打版帮看',
            submit_time: '2026-01-27 16:20',
            status: '已处理',
            content: '腰围尺寸可能有问题，请帮忙二次确认'
        },
        {
            id: '6',
            shop_name: '拉夏贝尔旗舰店',
            style_name: '蕾丝拼接上衣',
            image_url: 'https://picsum.photos/seed/style6/100',
            sub_type: '上传SPU',
            submit_time: '2026-01-28 11:00',
            status: '待处理',
            spu_list: 'SPU-2026-004 SPU-2026-005'
        },
        {
            id: '7',
            shop_name: 'ONLY女装官方店',
            style_name: '毛呢大衣',
            image_url: 'https://picsum.photos/seed/style7/100',
            sub_type: '改图帮看',
            submit_time: '2026-01-26 15:30',
            status: '已驳回',
            content: '图片清晰度不够，需要重新拍摄'
        },
        {
            id: '8',
            shop_name: '三彩服饰旗舰店',
            style_name: '棉麻休闲套装',
            image_url: 'https://picsum.photos/seed/style8/100',
            sub_type: '打版帮看',
            submit_time: '2026-01-28 09:00',
            status: '待处理',
            content: '整体版型需要调整，希望更加修身'
        },
        {
            id: '9',
            shop_name: '秋水伊人女装',
            style_name: '印花雪纺裙',
            image_url: 'https://picsum.photos/seed/style9/100',
            sub_type: '上传SPU',
            submit_time: '2026-01-27 13:40',
            status: '已处理',
            spu_list: 'SPU-2026-006 SPU-2026-007 SPU-2026-008 SPU-2026-009'
        },
        {
            id: '10',
            shop_name: '裂帛官方旗舰店',
            style_name: '民族风刺绣外套',
            image_url: 'https://picsum.photos/seed/style10/100',
            sub_type: '改图帮看',
            submit_time: '2026-01-28 14:30',
            status: '待处理',
            content: '刺绣细节图需要补拍，目前看不清楚花纹'
        },
        {
            id: '11',
            shop_name: '妖精的口袋',
            style_name: '学院风百褶裙',
            image_url: 'https://picsum.photos/seed/style11/100',
            sub_type: '打版帮看',
            submit_time: '2026-01-26 10:00',
            status: '已处理',
            content: '褶皱效果与预期有差异，请确认工艺'
        },
        {
            id: '12',
            shop_name: '诗凡黎女装店',
            style_name: '西装马甲套装',
            image_url: 'https://picsum.photos/seed/style12/100',
            sub_type: '上传SPU',
            submit_time: '2026-01-28 17:00',
            status: '待处理',
            spu_list: 'SPU-2026-010 SPU-2026-011'
        },
    ]);

    const [detailModal, setDetailModal] = useState<{ show: boolean; order: StyleOrder | null }>({ show: false, order: null });
    const [filter, setFilter] = useState<'all' | '改图帮看' | '打版帮看' | '上传SPU'>('all');

    const filteredOrders = orders.filter(o => filter === 'all' || o.sub_type === filter);

    const handleProcess = (id: string) => {
        setOrders(orders.map(o => o.id === id ? { ...o, status: '已处理' as const } : o));
        alert('已处理');
    };

    const handleReject = (id: string) => {
        if (!confirm('确定驳回该工单？')) return;
        setOrders(orders.map(o => o.id === id ? { ...o, status: '已驳回' as const } : o));
        alert('已驳回');
    };

    const getSubTypeColor = (subType: string) => {
        switch (subType) {
            case '改图帮看': return { bg: '#fef3c7', color: '#92400e' };
            case '打版帮看': return { bg: '#dbeafe', color: '#1e40af' };
            case '上传SPU': return { bg: '#d1fae5', color: '#065f46' };
            default: return { bg: '#f3f4f6', color: '#374151' };
        }
    };

    return (
        <div className="order-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">款式工单</h1>
                    <p className="page-subtitle">处理商家改图帮看、打版帮看、上传SPU请求</p>
                </div>
            </div>

            <div className="card">
                <div className="filter-bar">
                    <div className="tabs">
                        <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
                            全部 ({orders.length})
                        </button>
                        <button className={`tab ${filter === '改图帮看' ? 'active' : ''}`} onClick={() => setFilter('改图帮看')}>
                            改图帮看
                        </button>
                        <button className={`tab ${filter === '打版帮看' ? 'active' : ''}`} onClick={() => setFilter('打版帮看')}>
                            打版帮看
                        </button>
                        <button className={`tab ${filter === '上传SPU' ? 'active' : ''}`} onClick={() => setFilter('上传SPU')}>
                            上传SPU
                        </button>
                    </div>
                </div>

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>图片</th>
                            <th>款式名称</th>
                            <th>店铺</th>
                            <th>工单类型</th>
                            <th>提交时间</th>
                            <th>状态</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.map(order => (
                            <tr key={order.id}>
                                <td>
                                    <img src={order.image_url} alt="" className="style-image" />
                                </td>
                                <td style={{ fontWeight: 500 }}>{order.style_name}</td>
                                <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{order.shop_name}</td>
                                <td>
                                    <span style={{
                                        padding: '3px 8px',
                                        borderRadius: 4,
                                        fontSize: 11,
                                        ...getSubTypeColor(order.sub_type)
                                    }}>
                                        {order.sub_type}
                                    </span>
                                </td>
                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{order.submit_time}</td>
                                <td>
                                    <span className={`status-badge ${order.status === '已处理' ? 'completed' : order.status === '已驳回' ? 'rejected' : 'processing'}`}>
                                        {order.status}
                                    </span>
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        {order.status === '待处理' && (
                                            <>
                                                <button className="btn btn-sm btn-primary" onClick={() => handleProcess(order.id)}>
                                                    处理
                                                </button>
                                                <button className="btn btn-sm btn-danger" onClick={() => handleReject(order.id)}>
                                                    驳回
                                                </button>
                                            </>
                                        )}
                                        <button className="btn btn-sm btn-outline" onClick={() => setDetailModal({ show: true, order })}>
                                            详情
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 详情弹窗 */}
            {detailModal.show && detailModal.order && (
                <div className="modal-overlay" onClick={() => setDetailModal({ show: false, order: null })}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">工单详情</span>
                            <button className="btn-icon" onClick={() => setDetailModal({ show: false, order: null })}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                                <img src={detailModal.order.image_url} alt="" style={{ width: 100, height: 100, borderRadius: 8 }} />
                                <div>
                                    <h3 style={{ fontSize: 16, marginBottom: 8 }}>{detailModal.order.style_name}</h3>
                                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>店铺：{detailModal.order.shop_name}</p>
                                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>类型：{detailModal.order.sub_type}</p>
                                </div>
                            </div>

                            {detailModal.order.content && (
                                <div className="detail-section">
                                    <h4>申请内容</h4>
                                    <p>{detailModal.order.content}</p>
                                </div>
                            )}

                            {detailModal.order.spu_list && (
                                <div className="detail-section">
                                    <h4>SPU列表</h4>
                                    <div className="spu-tags">
                                        {detailModal.order.spu_list.split(' ').map((spu, idx) => (
                                            <span key={idx} className="spu-tag">{spu}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setDetailModal({ show: false, order: null })}>
                                关闭
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .order-page {
                    padding: 24px;
                }
                .detail-section {
                    margin-bottom: 16px;
                    padding: 12px;
                    background: var(--bg-secondary);
                    border-radius: 8px;
                }
                .detail-section h4 {
                    font-size: 13px;
                    color: var(--text-secondary);
                    margin-bottom: 8px;
                }
                .detail-section p {
                    font-size: 14px;
                    color: var(--text-primary);
                    margin: 0;
                }
                .spu-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }
                .spu-tag {
                    padding: 4px 8px;
                    background: var(--card-bg);
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    font-family: monospace;
                    font-size: 12px;
                }
            `}</style>
        </div>
    );
};

export default StyleOrderPage;
