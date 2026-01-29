import React, { useState } from 'react';

interface SpuItem {
    id: string;
    image_url: string;
    link: string;
    spus: string; // 空格分隔的SPU列表
}

const SpuLibrary: React.FC = () => {
    const [items, setItems] = useState<SpuItem[]>([
        { id: '1', image_url: 'https://picsum.photos/seed/spu1/100', link: 'https://item.taobao.com/item.htm?id=7654321001', spus: 'SPU-2026-001 SPU-2026-002' },
        { id: '2', image_url: 'https://picsum.photos/seed/spu2/100', link: 'https://item.taobao.com/item.htm?id=7654321002', spus: 'SPU-2026-003' },
        { id: '3', image_url: 'https://picsum.photos/seed/spu3/100', link: 'https://item.taobao.com/item.htm?id=7654321003', spus: 'SPU-2026-004 SPU-2026-005 SPU-2026-006' },
        { id: '4', image_url: 'https://picsum.photos/seed/spu4/100', link: 'https://item.taobao.com/item.htm?id=7654321004', spus: 'SPU-2026-007' },
        { id: '5', image_url: 'https://picsum.photos/seed/spu5/100', link: 'https://item.taobao.com/item.htm?id=7654321005', spus: 'SPU-2026-008 SPU-2026-009' },
        { id: '6', image_url: 'https://picsum.photos/seed/spu6/100', link: 'https://item.taobao.com/item.htm?id=7654321006', spus: 'SPU-2026-010' },
        { id: '7', image_url: 'https://picsum.photos/seed/spu7/100', link: 'https://item.taobao.com/item.htm?id=7654321007', spus: 'SPU-2026-011 SPU-2026-012 SPU-2026-013' },
        { id: '8', image_url: 'https://picsum.photos/seed/spu8/100', link: 'https://item.taobao.com/item.htm?id=7654321008', spus: 'SPU-2026-014' },
        { id: '9', image_url: 'https://picsum.photos/seed/spu9/100', link: 'https://item.taobao.com/item.htm?id=7654321009', spus: 'SPU-2026-015 SPU-2026-016' },
        { id: '10', image_url: 'https://picsum.photos/seed/spu10/100', link: 'https://item.taobao.com/item.htm?id=7654321010', spus: 'SPU-2026-017 SPU-2026-018 SPU-2026-019 SPU-2026-020' },
        { id: '11', image_url: 'https://picsum.photos/seed/spu11/100', link: 'https://detail.tmall.com/item.htm?id=8001234001', spus: 'SPU-2026-021' },
        { id: '12', image_url: 'https://picsum.photos/seed/spu12/100', link: 'https://detail.tmall.com/item.htm?id=8001234002', spus: 'SPU-2026-022 SPU-2026-023' },
        { id: '13', image_url: 'https://picsum.photos/seed/spu13/100', link: 'https://detail.tmall.com/item.htm?id=8001234003', spus: 'SPU-2026-024 SPU-2026-025 SPU-2026-026' },
        { id: '14', image_url: 'https://picsum.photos/seed/spu14/100', link: 'https://detail.tmall.com/item.htm?id=8001234004', spus: 'SPU-2026-027' },
        { id: '15', image_url: 'https://picsum.photos/seed/spu15/100', link: 'https://detail.tmall.com/item.htm?id=8001234005', spus: 'SPU-2026-028 SPU-2026-029' },
        { id: '16', image_url: 'https://picsum.photos/seed/spu16/100', link: 'https://item.jd.com/100056789001.html', spus: 'SPU-2026-030' },
        { id: '17', image_url: 'https://picsum.photos/seed/spu17/100', link: 'https://item.jd.com/100056789002.html', spus: 'SPU-2026-031 SPU-2026-032 SPU-2026-033' },
        { id: '18', image_url: 'https://picsum.photos/seed/spu18/100', link: 'https://item.jd.com/100056789003.html', spus: 'SPU-2026-034 SPU-2026-035' },
        { id: '19', image_url: 'https://picsum.photos/seed/spu19/100', link: 'https://item.jd.com/100056789004.html', spus: 'SPU-2026-036' },
        { id: '20', image_url: 'https://picsum.photos/seed/spu20/100', link: 'https://item.jd.com/100056789005.html', spus: 'SPU-2026-037 SPU-2026-038 SPU-2026-039 SPU-2026-040' },
    ]);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteInput, setDeleteInput] = useState('');
    const PAGE_SIZE = 500;

    const handleCopyAll = () => {
        const allSpus = items.map(i => i.spus).join(' ');
        navigator.clipboard.writeText(allSpus);
        alert(`已复制全部SPU`);
    };

    const handleCopyRow = (spus: string) => {
        navigator.clipboard.writeText(spus);
        alert('已复制SPU');
    };

    const handleDeleteSpu = () => {
        const target = items.find(i => i.spus.includes(deleteInput.trim()));
        if (!target) {
            alert('未找到匹配的SPU');
            return;
        }
        if (!confirm('⚠️ 此操作不可逆，确定删除？')) return;

        setItems(items.filter(i => i.id !== target.id));
        setShowDeleteModal(false);
        setDeleteInput('');
        alert('已删除');
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">SPU库</h1>
                    <p className="page-subtitle">商家上传SPU后的存储库 · 单页最多显示 {PAGE_SIZE} 条</p>
                </div>
            </div>

            <div className="card">
                {/* 工具栏 */}
                <div className="toolbar">
                    <button className="btn btn-primary" onClick={handleCopyAll}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>content_copy</span>
                        一键复制全部SPU ({items.length})
                    </button>
                    <button className="btn btn-danger" onClick={() => setShowDeleteModal(true)}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                        删除已上架SPU
                    </button>
                </div>

                {items.length === 0 ? (
                    <div className="empty-state">
                        <span className="material-symbols-outlined">inventory_2</span>
                        <p>暂无SPU数据</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ width: 80 }}>款式图片</th>
                                <th style={{ width: 200 }}>款式链接</th>
                                <th>SPU</th>
                                <th style={{ width: 100 }}>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.slice(0, PAGE_SIZE).map(item => (
                                <tr key={item.id}>
                                    <td>
                                        <img src={item.image_url} alt="" className="style-image" />
                                    </td>
                                    <td>
                                        <a
                                            href={item.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                color: 'var(--primary)',
                                                textDecoration: 'none',
                                                fontSize: 13,
                                                wordBreak: 'break-all'
                                            }}
                                        >
                                            {item.link}
                                        </a>
                                    </td>
                                    <td>
                                        <div className="spu-tags">
                                            {item.spus.split(' ').filter(Boolean).map((spu, idx) => (
                                                <span key={idx} className="spu-tag">
                                                    {spu}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-sm btn-outline"
                                            onClick={() => handleCopyRow(item.spus)}
                                            title="一键复制"
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>content_copy</span>
                                            复制
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                    显示 {Math.min(items.length, PAGE_SIZE)} / {items.length} 条
                </div>
            </div>

            {/* 删除弹窗 */}
            {showDeleteModal && (
                <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal" style={{ maxWidth: 450 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">删除已上架SPU</span>
                            <button className="btn-icon" onClick={() => setShowDeleteModal(false)}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="alert-banner warning">
                                <span className="material-symbols-outlined">warning</span>
                                <span>此操作不可逆，删除后无法恢复</span>
                            </div>

                            <div className="form-group">
                                <label className="form-label">输入已上架的SPU编号</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="输入SPU进行匹配删除"
                                    value={deleteInput}
                                    onChange={e => setDeleteInput(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowDeleteModal(false)}>取消</button>
                            <button className="btn btn-danger" onClick={handleDeleteSpu}>
                                确认删除
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .spu-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }
                .spu-tag {
                    display: inline-block;
                    padding: 4px 8px;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: 4px;
                    font-family: monospace;
                    font-size: 12px;
                    font-weight: 500;
                    color: var(--text-primary);
                }
            `}</style>
        </div>
    );
};

export default SpuLibrary;
