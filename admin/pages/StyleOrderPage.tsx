import React, { useState, useEffect } from 'react';
import { getHandlerAlias, getHandlerColor } from '../utils/handlerMapping';
import ImageUpload from '../components/ImageUpload';

interface StyleOrder {
    id: string;
    shop_name: string;
    key_id?: string; // 新增：店铺ID
    shop_code?: string; // Add shop_code
    style_name: string;
    image_url: string;
    sub_type: '改图帮看' | '打版帮看' | '上传SPU' | '商家要款'; // 商家上传SPU后待买手确认
    submit_time: string;
    status: '待处理' | '已处理' | '已驳回' | 'SPU待审核';
    content?: string;
    spu_list?: string;
    source?: 'style_demand' | 'request'; // 来源
    handler_name?: string;
    pattern_schemes?: any[]; // 新增：打版/改图方案
}

const StyleOrderPage: React.FC = () => {
    const [orders, setOrders] = useState<StyleOrder[]>([]);

    const [detailModal, setDetailModal] = useState<{ show: boolean; order: StyleOrder | null }>({ show: false, order: null });
    const [filter, setFilter] = useState<'all' | '改图帮看' | '打版帮看' | '上传SPU' | '商家要款'>('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
                // Delay slightly to show loading state (optional, for better UX perception)
                // await new Promise(r => setTimeout(r, 300));

                // Fetch style demands
                const res = await fetch(`${API_BASE}/api/admin/styles?pageSize=500&status=all`);
                const data = await res.json();

                if (data.error) {
                    console.error('Error fetching style orders:', data.error);
                    return;
                }

                // Map data... (只生成帮看请求和SPU上传的工单)
                let mappedOrders: StyleOrder[] = (data.data || [])
                    .filter((item: any) => ['helping', 'pattern', 'success', 'spu_verify'].includes(item.development_status)) // 只生成帮看/打版/SPU工单
                    .map((item: any) => {
                        let subType = '改图帮看';
                        if (item.development_status === 'pattern') subType = '打版帮看';
                        if (item.development_status === 'success' || item.development_status === 'spu_verify') subType = '上传SPU';

                        // 状态逻辑：未处理=待处理，已处理=已处理
                        const displayStatus = item.status === 'completed' ? '已处理' : (item.development_status === 'spu_verify' ? 'SPU待审核' : '待处理');

                        return {
                            id: item.id,
                            shop_name: item.shop_name || '未知店铺',
                            key_id: item.key_id || '',
                            shop_code: item.shop_code || '',
                            style_name: item.name || '未命名款式',
                            image_url: item.image_url || 'https://via.placeholder.com/100',
                            sub_type: subType as StyleOrder['sub_type'],
                            submit_time: item.created_at ? new Date(item.created_at).toLocaleString() : '',
                            status: displayStatus,
                            content: item.remark,
                            spu_list: item.back_spu,
                            source: 'style_demand' as const,
                            handler_name: item.handler_name,
                            pattern_schemes: item.pattern_schemes
                        };
                    });

                // Fetch Merchant Requests (Pricing/Money requests)
                try {
                    const res2 = await fetch(`${API_BASE}/api/requests?type=style&pageSize=100`);
                    if (res2.ok) {
                        const data2 = await res2.json();
                        if (data2.data) {
                            const styleRequests = data2.data.map((item: any) => ({
                                id: item.id,
                                shop_name: item.shop_name || '未知店铺',
                                key_id: '', // Request API currently doesn't join shop info
                                shop_code: '', // Request API currently doesn't join shop info
                                style_name: item.order_no || '商家要款',
                                image_url: item.pricing_details?.[0]?.images?.[0] || 'https://via.placeholder.com/100', // Adapt to pricing_details structure
                                sub_type: (item.sub_type || '商家要款') as StyleOrder['sub_type'],
                                submit_time: item.created_at ? new Date(item.created_at).toLocaleString() : '',
                                status: item.status === 'processing' ? '待处理' :
                                    item.status === 'rejected' ? '已驳回' : '已处理',
                                content: item.pricing_details?.[0]?.remark,
                                source: 'request' as const,
                                handler_name: item.handler_name
                            }));
                            mappedOrders.push(...styleRequests);
                        }
                    }
                } catch (e) {
                    console.error("Error fetching merchant requests", e);
                }

                setOrders(mappedOrders);
            } catch (error) {
                console.error('Error fetching style orders:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);


    const [buyerRemark, setBuyerRemark] = useState(''); // 新需求2：买手备注

    // Reply State
    const [replyImage, setReplyImage] = useState('');
    const [replyContent, setReplyContent] = useState('');

    // Handle Reply Submit
    const handleReply = async () => {
        if (!detailModal.order) return;
        if (!replyImage && !replyContent) {
            alert('请上传图片或填写回复内容');
            return;
        }

        try {
            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
            const res = await fetch(`${API_BASE}/api/admin/styles/${detailModal.order.id}/reply`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-buyer-name': encodeURIComponent(localStorage.getItem('current_buyer') || 'Admin')
                },
                body: JSON.stringify({
                    replyImage,
                    replyContent
                })
            });

            if (!res.ok) throw new Error('回复失败');

            alert('回复成功，已退回商家开发中');
            // Update local state: remove from list or update status
            setOrders(orders.map(o => o.id === detailModal.order!.id ? { ...o, status: '已处理' as const } : o));
            setDetailModal({ show: false, order: null });
            setReplyImage('');
            setReplyContent('');
        } catch (err: any) {
            console.error(err);
            alert('回复失败，请重试');
        }
    };

    // 新需求2：提交买手备注
    const handleSubmitRemark = async () => {
        if (!detailModal.order) return;
        try {
            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
            const res = await fetch(`${API_BASE}/api/requests/${detailModal.order.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ buyer_remark: buyerRemark })
            });
            if (!res.ok) throw new Error('提交失败');
            alert('备注已提交');
            setDetailModal({ show: false, order: null });
            setBuyerRemark('');
        } catch (err) {
            alert('提交失败，请重试');
        }
    };

    const filteredOrders = orders.filter(o => filter === 'all' || o.sub_type === filter);

    // 问题12修复：处理工单时调用API更新状态
    const handleProcess = async (id: string) => {
        try {
            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
            // Delay slightly to show loading state (optional, for better UX perception)
            // await new Promise(r => setTimeout(r, 300));
            const res = await fetch(`${API_BASE}/api/admin/styles/${id}/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!res.ok) throw new Error('确认失败');
            setOrders(orders.map(o => o.id === id ? { ...o, status: '已处理' as const } : o));
            alert('已确认，SPU已归入库');
        } catch (err: any) {
            console.error('Confirm error:', err);
            alert('处理失败，请重试');
        }
    };



    const getSubTypeColor = (subType: string) => {
        switch (subType) {
            case '改图帮看': return { bg: '#fef3c7', color: '#92400e' };
            case '打版帮看': return { bg: '#dbeafe', color: '#1e40af' };
            case '上传SPU': return { bg: '#d1fae5', color: '#065f46' };
            case '商家要款': return { bg: '#fce7f3', color: '#9d174d' }; // 问题8：新增
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
                        {/* 问题8：新增商家要款 Tab */}
                        <button className={`tab ${filter === '商家要款' ? 'active' : ''}`} onClick={() => setFilter('商家要款')}>
                            商家要款 ({orders.filter(o => o.sub_type === '商家要款').length})
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <div className="spinner" style={{
                            width: 24, height: 24, border: '3px solid #eee',
                            borderTop: '3px solid var(--primary)', borderRadius: '50%',
                            margin: '0 auto 12px', animation: 'spin 1s linear infinite'
                        }}></div>
                        <span>加载款式数据中...</span>
                        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>图片</th>
                                <th>款式名称</th>
                                <th>KEY</th>
                                <th>店铺ID</th>
                                <th>工单类型</th>
                                <th>提交时间</th>
                                <th>处理人</th>
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
                                    <td style={{ color: 'var(--text-secondary)', fontSize: 13, fontFamily: 'monospace' }}>
                                        {order.key_id || order.shop_name}
                                    </td>
                                    <td style={{ fontFamily: 'monospace' }}>{order.shop_code || '-'}</td>
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
                                        {order.handler_name ? (
                                            <div style={{
                                                ...getHandlerColor(order.handler_name),
                                                width: 24,
                                                height: 24,
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: 11,
                                                fontWeight: 600
                                            }} title={order.handler_name}>
                                                {getHandlerAlias(order.handler_name)}
                                            </div>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>-</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`status-badge ${order.status === '已处理' ? 'completed' : order.status === '已驳回' ? 'rejected' : 'processing'}`}>
                                            {/* 新需求1：根据sub_type显示状态 */}
                                            {order.status === '待处理' && order.sub_type === '改图帮看' ? '改图帮看中' :
                                                order.status === '待处理' && order.sub_type === '打版帮看' ? '打版帮看中' :
                                                    order.status === 'SPU待审核' ? 'SPU待审核' :
                                                        order.status === '待处理' && order.spu_list ? '已上传SPU' :
                                                            order.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="btn btn-sm btn-outline" onClick={() => setDetailModal({ show: true, order })}>
                                                查看
                                            </button>
                                            {/* 仅改图/打版帮看显示处理按钮（实际上已合并到查看详情中处理） */}
                                            {/* 其他类型保留原有逻辑 -> 已修改：所有操作移入详情弹窗 */}
                                            {/* 商家要款仅查看 Reply */}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
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
                                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                        店铺：{detailModal.order.key_id} ({detailModal.order.shop_name})
                                    </p>
                                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>类型：{detailModal.order.sub_type}</p>
                                </div>
                            </div>

                            {detailModal.order.content && (
                                <div className="detail-section">
                                    <h4>申请内容</h4>
                                    <p>{detailModal.order.content}</p>
                                </div>
                            )}

                            {/* 显示改图/打版方案图片 */}
                            {detailModal.order.pattern_schemes && detailModal.order.pattern_schemes.length > 0 && (
                                <div className="detail-section">
                                    <h4>方案图片 ({detailModal.order.sub_type})</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {detailModal.order.pattern_schemes.map((scheme: any, idx: number) => (
                                            <div key={idx} style={{ background: '#fff', padding: 8, borderRadius: 6 }}>
                                                <h5 style={{ fontSize: 13, marginBottom: 6, fontWeight: 600 }}>{scheme.name}</h5>
                                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                    {scheme.images?.map((img: string, i: number) => (
                                                        <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                                                            <img src={img} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4, border: '1px solid #eee' }} />
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
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

                            {/* 新需求：回复/处理帮看请求 */}
                            {['改图帮看', '打版帮看'].includes(detailModal.order.sub_type) && detailModal.order.status === '待处理' && (
                                <div className="detail-section" style={{ border: '1px solid #e5e7eb', background: '#fff' }}>
                                    <h4 style={{ color: '#2563eb', marginBottom: 16 }}>处理回复</h4>

                                    <div className="form-group" style={{ marginBottom: 16 }}>
                                        <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, display: 'block' }}>上传反馈图片</label>
                                        <ImageUpload
                                            value={replyImage}
                                            onChange={setReplyImage}
                                            placeholder="上传改图结果或打版图片"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, display: 'block' }}>回复内容</label>
                                        <textarea
                                            value={replyContent}
                                            onChange={(e) => setReplyContent(e.target.value)}
                                            placeholder="输入修改意见或备注..."
                                            style={{
                                                width: '100%',
                                                minHeight: '80px',
                                                padding: '8px',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '6px',
                                                fontSize: '14px',
                                                resize: 'vertical'
                                            }}
                                        />
                                    </div>
                                    <button className="btn btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={handleReply}>
                                        提交回复并完成
                                    </button>
                                </div>
                            )}

                            {/* 买手备注输入 (仅对非帮看请求和SPU确认显示) */}
                            {!(['改图帮看', '打版帮看', '上传SPU'].includes(detailModal.order.sub_type)) && (
                                <div className="detail-section">
                                    <h4>买手备注</h4>
                                    <textarea
                                        value={buyerRemark}
                                        onChange={(e) => setBuyerRemark(e.target.value)}
                                        placeholder="请输入买手备注..."
                                        style={{
                                            width: '100%',
                                            minHeight: '80px',
                                            padding: '8px',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '6px',
                                            fontSize: '14px',
                                            resize: 'vertical'
                                        }}
                                    />
                                    <div style={{ marginTop: 8, textAlign: 'right' }}>
                                        <button className="btn btn-sm btn-primary" onClick={handleSubmitRemark}>保存备注</button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            {/* 底部按钮根据类型调整 */}
                            {detailModal.order.sub_type === '上传SPU' && (detailModal.order.status === '待处理' || detailModal.order.status === 'SPU待审核') && (
                                <>
                                    <button className="btn btn-primary" onClick={() => { handleProcess(detailModal.order!.id); setDetailModal({ show: false, order: null }); }}>
                                        确认
                                    </button>
                                    <button className="btn btn-outline" onClick={() => setDetailModal({ show: false, order: null })}>
                                        取消
                                    </button>
                                </>
                            )}
                            {!(['改图帮看', '打版帮看', '上传SPU'].includes(detailModal.order.sub_type)) && (
                                <button className="btn btn-primary" onClick={handleSubmitRemark}>
                                    提交备注
                                </button>
                            )}
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
