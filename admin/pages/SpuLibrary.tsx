import React, { useState, useEffect } from 'react';

interface SpuItem {
    id: string;
    image_url: string;
    link: string;
    spus: string; // 空格分隔的SPU列表
}

const SpuLibrary: React.FC = () => {
    // SPU 数据来自后端
    const [items, setItems] = useState<SpuItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteInput, setDeleteInput] = useState('');
    const PAGE_SIZE = 500;

    const handleCopyAll = () => {
        const allSpus = items.map(i => i.spus).join(' ');
        navigator.clipboard.writeText(allSpus);
        alert(`已复制全部SPU`);
    };

    useEffect(() => {
        fetchSpus();
    }, []);

    const fetchSpus = async () => {
        setLoading(true);
        try {
            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001';
            const res = await fetch(`${API_BASE}/api/spu?pageSize=500`);
            const json = await res.json();

            // Map backend data to frontend interface
            const mapped = (json.data || []).map((d: any) => ({
                id: d.id,
                image_url: d.image_url,
                link: d.link,
                spus: d.spu_code // 后端返回的是 spu_code
            }));

            setItems(mapped);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
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
