import React, { useState, useEffect } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { getHandlerAlias, getHandlerColor } from '../utils/handlerMapping';
// import { updateRequestUrgentStatus } from '../../services/requestService'; // Unused

interface PricingOrder {
    id: string;
    order_no?: string; // Add order_no
    shop_name: string;
    sub_type: '同款同价' | '申请涨价' | '毛织类核价' | '非毛织类核价';
    skc_codes: string[];
    submit_time: string;
    status: '未处理' | '处理中' | '待确认' | '待复核' | '已完成';
    applied_price?: number;
    initial_price?: number;  // 初核价格
    final_price?: number;    // 最终价格
    reason?: string;         // 商家拒绝原因
    is_urgent?: boolean;     // 是否加急
    pricing_details?: any[]; // Full details
    handler_name?: string;   // 处理人
}

const PricingOrderPage: React.FC = () => {
    const [orders, setOrders] = useState<PricingOrder[]>([]);

    // ✅ Phase 1 优化: 数据刷新函数
    const refreshOrders = async () => {
        try {
            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001';
            const res = await fetch(`${API_BASE}/api/requests?type=pricing&pageSize=100`);
            if (!res.ok) throw new Error('Failed to fetch pricing orders');
            const data = await res.json();

            const mappedOrders: PricingOrder[] = (data.data || []).map((item: any) => {
                const detail = item.pricing_details?.[0] || {};
                return {
                    id: item.id,
                    order_no: item.order_no,
                    shop_name: item.shop_name || '未知店铺',
                    sub_type: item.sub_type,
                    skc_codes: item.target_codes || [],
                    submit_time: item.submit_time ? new Date(item.submit_time).toLocaleString() : '',
                    // 状态映射
                    status: (
                        item.status === 'pending' ? '未处理' :
                            item.status === 'processing' ? '处理中' :
                                item.status === 'pending_confirm' ? '待确认' :
                                    item.status === 'pending_recheck' ? '待复核' :
                                        item.status === 'completed' ? '已完成' : '未处理'
                    ) as PricingOrder['status'],
                    applied_price: detail.appliedPrice || 0,
                    initial_price: item.initial_price,
                    final_price: item.final_price,
                    reason: item.reason,
                    is_urgent: item.is_urgent,
                    pricing_details: item.pricing_details || [],
                    handler_name: item.handler_name
                };
            });
            setOrders(mappedOrders);
        } catch (error) {
            console.error('Error refreshing pricing orders:', error);
        }
    };

    useEffect(() => {
        refreshOrders();
    }, []);

    const [statusFilter, setStatusFilter] = useState<'all' | '未处理' | '处理中' | '待确认' | '待复核' | '已完成'>('all');
    const [typeFilter, setTypeFilter] = useState<'all' | '同款同价' | '申请涨价' | '毛织类核价' | '非毛织类核价'>('all');
    const [detailModal, setDetailModal] = useState<{ show: boolean; order: PricingOrder | null }>({ show: false, order: null });
    const [reviewModal, setReviewModal] = useState<{ show: boolean; order: PricingOrder | null; type: 'initial' | 'force' }>({ show: false, order: null, type: 'initial' });
    const [reviewPrice, setReviewPrice] = useState('');
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

    const filteredOrders = orders.filter(o => {
        const statusMatch = statusFilter === 'all' || o.status === statusFilter;
        const typeMatch = typeFilter === 'all' || o.sub_type === typeFilter;
        return statusMatch && typeMatch;
    });
    // ...

    // Export Logic
    const handleExport = async () => {
        const pending = orders.filter(o => o.status === '未处理' || o.status === '处理中');
        if (pending.length === 0) {
            alert('没有待处理的工单');
            return;
        }

        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('核价工单');

            // 设置列
            worksheet.columns = [
                { header: '需申请skc', key: 'skc', width: 25 },
                { header: '目标价格', key: 'target_price', width: 15 },
                { header: '人民币/美元', key: 'currency', width: 15 },
                { header: '买手申诉内容', key: 'reason', width: 50 },
                { header: '核价师价格', key: 'auditor_price', width: 15 }, // Column E
                { header: 'Order ID', key: 'order_id', width: 0, hidden: true }, // Column F (Hidden key)
            ];

            // 设置表头样式
            worksheet.getRow(1).eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
                cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });

            // 添加数据行
            let currentRow = 2;

            pending.forEach(order => {
                // Determine items
                const items = order.pricing_details && order.pricing_details.length > 0
                    ? order.pricing_details
                    : order.skc_codes.map(code => ({
                        skc: code,
                        appliedPrice: order.applied_price,
                        buyerPrice: order.applied_price,
                        refCode: '', // Fallback
                    }));

                const startRow = currentRow;

                // Prepare "Appeal Content" summary string
                const firstItem = items[0] || {};
                const allSkcs = items.map((i: any) => i.skc).join(' ');
                const sysPrice = firstItem.appliedPrice || order.applied_price || 0;
                const refCode = firstItem.refCode || '未知';
                const refPrice = firstItem.buyerPrice || 0;
                const targetPrice = refPrice > 0 ? refPrice : sysPrice;

                const appealContent = `skc:${allSkcs}，系统建议价${sysPrice}元，同款同面料/复色skc:${refCode}，价格${refPrice}元，申请同款同价${targetPrice}元`;

                items.forEach((item: any) => {
                    const itemTargetPrice = item.buyerPrice || item.appliedPrice || 0;
                    worksheet.addRow({
                        skc: item.skc,
                        target_price: itemTargetPrice,
                        currency: '人民币',
                        reason: appealContent,
                        auditor_price: '', // Default Empty
                        order_id: order.id // Hidden ID for import matching
                    });
                    currentRow++;
                });

                const endRow = currentRow - 1;

                // Merge "买手申诉内容" (D) and "核价师价格" (E) columns
                if (endRow > startRow) {
                    worksheet.mergeCells(`D${startRow}:D${endRow}`);
                    worksheet.mergeCells(`E${startRow}:E${endRow}`);
                }

                // Vertical align center for all
                for (let r = startRow; r <= endRow; r++) {
                    worksheet.getRow(r).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                }
            });

            // 导出
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const date = new Date().toISOString().slice(0, 10);
            saveAs(blob, `核价工单-${date}.xlsx`);

            setOrders(orders.map(o => o.status === '未处理' ? { ...o, status: '处理中' as const } : o));
            // alert(`已导出 ${pending.length} 个工单，状态已变为"处理中"`);
        } catch (error) {
            console.error('Export error:', error);
            alert('导出失败，请重试');
        }
    };

    // 文件上传处理 (Real Import)
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const workbook = new ExcelJS.Workbook();
            const arrayBuffer = await file.arrayBuffer();
            await workbook.xlsx.load(arrayBuffer);
            const worksheet = workbook.getWorksheet(1);
            if (!worksheet) throw new Error('Invalid Excel file');

            const updates: Record<string, number> = {};
            const processIds: string[] = [];
            let debugInfo = '';

            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return; // Skip header

                // Column F (6) is Order ID, Column E (5) is Auditor Price
                const orderIdVal = row.getCell(6).value;
                const priceVal = row.getCell(5).value;

                if (!orderIdVal) return;

                const orderId = orderIdVal.toString().trim();

                // Try to parse price
                if (priceVal) {
                    // Handle cases where price might include "¥" or "," or text
                    // If it's a number object or string
                    let priceStr = priceVal.toString();
                    // Keep only numbers and dot
                    priceStr = priceStr.replace(/[^\d.]/g, '');

                    const price = parseFloat(priceStr);
                    if (!isNaN(price) && price > 0) {
                        updates[orderId] = price;
                        if (!processIds.includes(orderId)) processIds.push(orderId);
                    } else {
                        if (rowNumber < 5) debugInfo += `Row ${rowNumber}: Invalid Price '${priceVal}'\n`;
                    }
                } else {
                    if (rowNumber < 5) debugInfo += `Row ${rowNumber}: No Price\n`;
                }
            });

            if (Object.keys(updates).length === 0) {
                alert(`未找到有效的核价数据。\n请检查：\n1. 是否在E列填写了价格\n2. 是否使用了导出的完整文件(含F列隐藏ID)\n\n调试信息 (前5行):\n${debugInfo || '无数据'}`);
                return;
            }

            // Batch update
            let successCount = 0;
            // Show loading or optimistic UI? For now just blocking alert at end.

            for (const id of processIds) {
                const price = updates[id];
                try {
                    const res = await fetch(`${API_BASE}/api/requests/${id}/initial-review`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ initialPrice: price }), // Fix payload key
                    });
                    if (res.ok) successCount++;
                } catch (err) {
                    console.error(`Failed to update order ${id}`, err);
                }
            }

            if (successCount === 0) {
                alert('导入处理完成，但所有提交均失败。请检查网络或后端日志。');
            } else {
                alert(`成功导入并处理 ${successCount} 个工单`);
                await refreshOrders();
            }

        } catch (error) {
            console.error('Import error:', error);
            alert('导入失败，请检查文件格式');
        } finally {
            // Reset input
            e.target.value = '';
        }
    };

    // 一键导入核价师结果 (Trigger)
    const handleImportClick = () => {
        document.getElementById('import-input')?.click();
    };

    const getSubTypeColor = (subType: string) => {
        switch (subType) {
            case '毛织类核价': return { bg: '#fef3c7', color: '#92400e' };
            case '非毛织类核价': return { bg: '#dbeafe', color: '#1e40af' };
            case '同款同价': return { bg: '#d1fae5', color: '#065f46' };
            case '申请涨价': return { bg: '#fee2e2', color: '#991b1b' };
            default: return { bg: '#f3f4f6', color: '#374151' };
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case '未处理': return 'processing';
            case '处理中': return 'developing';
            case '待确认': return 'helping';      // 等待商家确认
            case '待复核': return 'processing';   // 商家拒绝，待复核
            case '已完成': return 'completed';
            default: return 'processing';
        }
    };

    // === Missing Handlers ===
    const handleProcess = async (id: string) => {
        try {
            await fetch(`${API_BASE}/api/requests/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'processing' }),
            });
            setOrders(orders.map(o => o.id === id ? { ...o, status: '处理中' as const } : o));
        } catch (err) {
            console.error('Failed to process:', err);
        }
    };

    const handleReject = async (id: string) => {
        if (!confirm('确定要驳回该工单吗？')) return;
        try {
            await fetch(`${API_BASE}/api/requests/${id}/audit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reject', feedback: '买手驳回' }),
            });
            setOrders(orders.filter(o => o.id !== id));
            alert('已驳回');
        } catch (err) {
            console.error('Failed to reject:', err);
        }
    };

    const handleOpenInitialReview = (order: PricingOrder) => {
        setReviewPrice(order.applied_price?.toString() || '');
        setReviewModal({ show: true, order, type: 'initial' });
    };

    const handleOpenForceComplete = (order: PricingOrder) => {
        setReviewPrice(order.initial_price?.toString() || '');
        setReviewModal({ show: true, order, type: 'force' });
    };

    const handleSubmitInitialReview = async () => {
        if (!reviewModal.order || !reviewPrice) return;
        try {
            const res = await fetch(`${API_BASE}/api/requests/${reviewModal.order.id}/initial-review`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initialPrice: parseFloat(reviewPrice) }),
            });
            if (!res.ok) throw new Error('提交失败');
            setOrders(orders.map(o => o.id === reviewModal.order!.id ? { ...o, status: '待确认' as const, initial_price: parseFloat(reviewPrice) } : o));
            setReviewModal({ show: false, order: null, type: 'initial' });
            alert('初核完成');
        } catch (err) {
            console.error('Initial review error:', err);
            alert('初核失败');
        }
    };

    const handleSubmitForceComplete = async () => {
        if (!reviewModal.order || !reviewPrice) return;
        try {
            const res = await fetch(`${API_BASE}/api/requests/${reviewModal.order.id}/force-complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ finalPrice: parseFloat(reviewPrice) }),
            });
            if (!res.ok) throw new Error('提交失败');
            setOrders(orders.map(o => o.id === reviewModal.order!.id ? { ...o, status: '已完成' as const, final_price: parseFloat(reviewPrice) } : o));
            setReviewModal({ show: false, order: null, type: 'initial' });
            alert('复核完成');
        } catch (err) {
            console.error('Force complete error:', err);
            alert('复核失败');
        }
    };

    const handleToggleUrgent = async (id: string, currentUrgent: boolean) => {
        try {
            await fetch(`${API_BASE}/api/requests/${id}/urgent`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isUrgent: !currentUrgent }),
            });
            setOrders(orders.map(o => o.id === id ? { ...o, is_urgent: !currentUrgent } : o));
        } catch (err) {
            console.error('Toggle urgent error:', err);
        }
    };

    // SKC display helper - show first 3, tooltip shows all
    const renderSkcCodes = (codes: string[]) => {
        if (codes.length === 0) return <span style={{ color: '#ccc', fontSize: 11 }}>无SKC</span>;

        const displayCodes = codes.slice(0, 3);
        const hasMore = codes.length > 3;

        return (
            <div
                style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}
                title={hasMore ? codes.join(', ') : undefined}
            >
                {displayCodes.map((code, idx) => (
                    <span key={idx} style={{
                        padding: '2px 6px',
                        background: 'var(--bg-secondary)',
                        borderRadius: 4,
                        fontSize: 11,
                        fontFamily: 'monospace',
                        whiteSpace: 'nowrap'
                    }}>
                        {code}
                    </span>
                ))}
                {hasMore && (
                    <span style={{
                        padding: '2px 6px',
                        background: 'var(--primary)',
                        color: '#fff',
                        borderRadius: 4,
                        fontSize: 10,
                        cursor: 'pointer'
                    }} title={codes.join(', ')}>
                        +{codes.length - 3}
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className="order-page">
            <input
                type="file"
                id="import-input"
                accept=".xlsx"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
            />
            <div className="page-header">
                <div>
                    <h1 className="page-title">核价工单</h1>
                    <p className="page-subtitle">处理同款同价、申请涨价、毛织类/非毛织类报价单</p>
                </div>
            </div>

            <div className="card">
                <div className="toolbar" style={{ marginBottom: 16 }}>
                    <button className="btn btn-primary" onClick={handleExport}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                        一键导出未处理工单
                    </button>
                    <button className="btn btn-success" onClick={handleImportClick}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>upload</span>
                        一键导入核价师结果
                    </button>
                </div>

                <div className="filter-bar" style={{ flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 8 }}>类型:</span>
                        <div className="tabs" style={{ display: 'inline-flex' }}>
                            <button className={`tab ${typeFilter === 'all' ? 'active' : ''}`} onClick={() => setTypeFilter('all')}>全部</button>
                            <button className={`tab ${typeFilter === '同款同价' ? 'active' : ''}`} onClick={() => setTypeFilter('同款同价')}>同款同价</button>
                            <button className={`tab ${typeFilter === '申请涨价' ? 'active' : ''}`} onClick={() => setTypeFilter('申请涨价')}>申请涨价</button>
                            <button className={`tab ${typeFilter === '毛织类核价' ? 'active' : ''}`} onClick={() => setTypeFilter('毛织类核价')}>毛织类核价</button>
                            <button className={`tab ${typeFilter === '非毛织类核价' ? 'active' : ''}`} onClick={() => setTypeFilter('非毛织类核价')}>非毛织类核价</button>
                        </div>
                    </div>
                    <div>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 8 }}>状态:</span>
                        <div className="tabs" style={{ display: 'inline-flex' }}>
                            <button className={`tab ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>全部</button>
                            <button className={`tab ${statusFilter === '未处理' ? 'active' : ''}`} onClick={() => setStatusFilter('未处理')}>未处理</button>
                            <button className={`tab ${statusFilter === '处理中' ? 'active' : ''}`} onClick={() => setStatusFilter('处理中')}>处理中</button>
                            <button className={`tab ${statusFilter === '待确认' ? 'active' : ''}`} onClick={() => setStatusFilter('待确认')}>待确认</button>
                            <button className={`tab ${statusFilter === '待复核' ? 'active' : ''}`} onClick={() => setStatusFilter('待复核')}>待复核</button>
                            <button className={`tab ${statusFilter === '已完成' ? 'active' : ''}`} onClick={() => setStatusFilter('已完成')}>已完成</button>
                        </div>
                    </div>
                </div>

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>店铺</th>
                            <th style={{ width: 60 }}>处理人</th>
                            <th>工单类型</th>
                            <th>SKC编码</th>
                            <th>申请价格</th>
                            <th>提交时间</th>
                            <th>状态</th>
                            <th style={{ width: 220, textAlign: 'right' }}>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.map(order => (
                            <tr key={order.id}>
                                <td style={{ fontWeight: 500 }}>
                                    {order.shop_name}
                                    {order.is_urgent && <span style={{
                                        color: '#fff',
                                        background: '#ef4444',
                                        fontSize: 10,
                                        padding: '1px 4px',
                                        borderRadius: 2,
                                        marginLeft: 6,
                                        fontWeight: 'bold'
                                    }}>加急</span>}
                                </td>
                                <td>
                                    {order.handler_name ? (
                                        <div style={{
                                            width: 32,
                                            height: 32,
                                            borderRadius: '50%',
                                            background: getHandlerColor(order.handler_name),
                                            color: '#fff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 13,
                                            fontWeight: 'bold',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                        }} title={order.handler_name}>
                                            {getHandlerAlias(order.handler_name)}
                                        </div>
                                    ) : (
                                        <span style={{ color: '#cbd5e1' }}>-</span>
                                    )}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <span style={{
                                            padding: '2px 6px',
                                            borderRadius: 4,
                                            fontSize: 11,
                                            width: 'fit-content',
                                            ...getSubTypeColor(order.sub_type)
                                        }}>
                                            {order.sub_type}
                                        </span>
                                        <span style={{ fontSize: 10, color: '#94a3b8' }}>{order.order_no || order.id.slice(0, 8)}</span>
                                    </div>
                                </td>
                                <td>
                                    {renderSkcCodes(order.skc_codes)}
                                </td>
                                <td style={{ fontWeight: 600, color: 'var(--primary)' }}>¥{order.applied_price}</td>
                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{order.submit_time}</td>
                                <td>
                                    <span className={`status-badge ${getStatusColor(order.status)}`}>
                                        {order.status}
                                    </span>
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        {(order.status === '未处理' || order.status === '处理中') && (
                                            <button className="btn btn-sm btn-success" onClick={() => handleOpenInitialReview(order)}>
                                                初核
                                            </button>
                                        )}
                                        {order.status === '待复核' && (
                                            <button className="btn btn-sm btn-warning" onClick={() => handleOpenForceComplete(order)}>
                                                复核
                                            </button>
                                        )}
                                        {order.status === '待确认' && (
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                等待商家确认...
                                            </span>
                                        )}
                                        <button className="btn btn-sm btn-outline" onClick={() => setDetailModal({ show: true, order })}>
                                            详情
                                        </button>
                                        <button
                                            className={`btn btn-sm ${order.is_urgent ? 'btn-danger' : 'btn-secondary'}`}
                                            style={{ minWidth: 60 }}
                                            onClick={() => handleToggleUrgent(order.id, !!order.is_urgent)}
                                        >
                                            {order.is_urgent ? '取消加急' : '加急'}
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
                            <span className="modal-title">核价工单详情</span>
                            <button className="btn-icon" onClick={() => setDetailModal({ show: false, order: null })}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-grid">
                                <div className="detail-item">
                                    <label>店铺名称</label>
                                    <span>{detailModal.order.shop_name}</span>
                                </div>
                                <div className="detail-item">
                                    <label>工单类型</label>
                                    <span>{detailModal.order.sub_type}</span>
                                </div>
                                <div className="detail-item">
                                    <label>申请价格</label>
                                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>¥{detailModal.order.applied_price}</span>
                                </div>
                                {detailModal.order.initial_price && (
                                    <div className="detail-item">
                                        <label>初核价格</label>
                                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>¥{detailModal.order.initial_price}</span>
                                    </div>
                                )}
                                {detailModal.order.final_price && (
                                    <div className="detail-item">
                                        <label>最终价格</label>
                                        <span style={{ color: 'var(--warning)', fontWeight: 600 }}>¥{detailModal.order.final_price}</span>
                                    </div>
                                )}
                            </div>
                            <div className="detail-section">
                                <h4>SKC编码</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {detailModal.order.skc_codes.map((code, idx) => (
                                        <span key={idx} className="spu-tag">{code}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setDetailModal({ show: false, order: null })}>
                                关闭
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 初核/复核弹窗 */}
            {reviewModal.show && reviewModal.order && (
                <div className="modal-overlay" onClick={() => setReviewModal({ show: false, order: null, type: 'initial' })}>
                    <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">
                                {reviewModal.type === 'initial' ? '初核定价' : '复核定价'}
                            </span>
                            <button className="btn-icon" onClick={() => setReviewModal({ show: false, order: null, type: 'initial' })}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">商家申请价格</label>
                                <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-muted)' }}>
                                    ¥{reviewModal.order.applied_price}
                                </div>
                            </div>
                            {reviewModal.type === 'force' && reviewModal.order.initial_price && (
                                <div className="form-group">
                                    <label className="form-label">初核价格</label>
                                    <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--warning)' }}>
                                        ¥{reviewModal.order.initial_price}
                                    </div>
                                </div>
                            )}
                            {reviewModal.type === 'force' && reviewModal.order.reason && (
                                <div className="form-group">
                                    <label className="form-label">商家拒绝原因</label>
                                    <div style={{ fontSize: 13, color: 'var(--danger)', padding: '8px', background: 'var(--bg-secondary)', borderRadius: 4 }}>
                                        {reviewModal.order.reason}
                                    </div>
                                </div>
                            )}
                            {reviewModal.type === 'force' && reviewModal.order.pricing_details?.[0]?.secondPrice && (
                                <div className="form-group">
                                    <label className="form-label">商家二次报价 (Counter Offer)</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '8px', background: '#fff7ed', borderRadius: 4, border: '1px solid #ffedd5' }}>
                                        <div style={{ fontSize: 15, fontWeight: 600, color: '#c2410c' }}>
                                            ¥{reviewModal.order.pricing_details[0].secondPrice}
                                        </div>
                                        {reviewModal.order.pricing_details[0].secondReason && (
                                            <div style={{ fontSize: 12, color: '#9a3412' }}>
                                                {reviewModal.order.pricing_details[0].secondReason}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="form-group">
                                <label className="form-label">
                                    {reviewModal.type === 'initial' ? '初核价格' : '最终价格'} <span style={{ color: 'red' }}>*</span>
                                </label>
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder={reviewModal.type === 'initial' ? '输入初核价格' : '输入最终价格'}
                                    value={reviewPrice}
                                    onChange={e => setReviewPrice(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setReviewModal({ show: false, order: null, type: 'initial' })}>
                                取消
                            </button>
                            <button
                                className={`btn ${reviewModal.type === 'initial' ? 'btn-success' : 'btn-warning'}`}
                                onClick={reviewModal.type === 'initial' ? handleSubmitInitialReview : handleSubmitForceComplete}
                            >
                                {reviewModal.type === 'initial' ? '确认初核' : '强制完成'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .order-page {
                    padding: 24px;
                }
                .detail-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                    margin-bottom: 16px;
                }
                .detail-item {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .detail-item label {
                    font-size: 12px;
                    color: var(--text-muted);
                }
                .detail-item span {
                    font-size: 14px;
                    color: var(--text-primary);
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

export default PricingOrderPage;
