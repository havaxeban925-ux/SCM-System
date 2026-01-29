import React, { useState, useEffect } from 'react';

interface Shop {
    id: string;
    shop_name: string;
    key_id?: string;
    private_push_count: number; // 模拟私推接款进度 (0-3)
}

interface PushRecord {
    id: string;
    image: string;
    type: 'private' | 'public';
    shops: { shop_name: string; status: 'pending' | 'interested' | 'uploaded' }[];
    upload_time: string;
    tags: string[];
    is_top?: boolean; // 置顶
}

const PushManage: React.FC = () => {
    // Form States - Private
    const [privateImage, setPrivateImage] = useState('');
    const [privateLink, setPrivateLink] = useState('');
    const [privateRemark, setPrivateRemark] = useState('');
    const [privateVisual, setPrivateVisual] = useState('');
    const [privateStyle, setPrivateStyle] = useState('');

    // Form States - Public
    const [publicImage, setPublicImage] = useState('');
    const [publicLink, setPublicLink] = useState('');
    const [publicRemark, setPublicRemark] = useState('');
    const [publicVisual, setPublicVisual] = useState('');
    const [publicStyle, setPublicStyle] = useState('');

    // Shop Selection
    const [shops, setShops] = useState<Shop[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedShops, setSelectedShops] = useState<string[]>([]);
    const [showShopOptions, setShowShopOptions] = useState(false);

    // Public Pool List
    const [publicStyles, setPublicStyles] = useState<PushRecord[]>([]);

    const visuals = ['人模', '平铺', '挂拍'];
    const styles = ['优雅风', '休闲风', '通勤风', '法式风', '韩系风', '甜酷风', '极简风'];

    useEffect(() => {
        // Mock Shops
        setShops([
            { id: '1', shop_name: '示例官方旗舰店', key_id: 'KEY-001', private_push_count: 1 },
            { id: '2', shop_name: '示例品牌专营店', key_id: 'KEY-001', private_push_count: 3 },
            { id: '3', shop_name: '名品潮流馆', key_id: 'KEY-002', private_push_count: 0 },
            { id: '4', shop_name: '新店测试', key_id: 'KEY-003', private_push_count: 2 },
            { id: '5', shop_name: '赫本工作室', key_id: 'KEY-004', private_push_count: 0 },
            { id: '6', shop_name: '意式精品馆', key_id: 'KEY-005', private_push_count: 1 },
        ]);

        // Mock Public Styles
        setPublicStyles([
            {
                id: '201',
                image: 'https://images.unsplash.com/photo-1572804013307-a9a11198427e?auto=format&fit=crop&q=80&w=200',
                type: 'public',
                upload_time: '2024-01-15 10:00',
                tags: ['人模', '优雅风'],
                is_top: true,
                shops: [
                    { shop_name: '示例官方旗舰店', status: 'interested' },
                    { shop_name: '名品潮流馆', status: 'pending' }
                ]
            },
            {
                id: '202',
                image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=200',
                type: 'public',
                upload_time: '2024-01-14 15:30',
                tags: ['平铺', '休闲风'],
                is_top: false,
                shops: [
                    { shop_name: '新店测试', status: 'interested' }
                ]
            },
            {
                id: '203',
                image: 'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?auto=format&fit=crop&q=80&w=200',
                type: 'public',
                upload_time: '2024-01-13 09:00',
                tags: ['挂拍', '法式风'],
                is_top: false,
                shops: []
            }
        ]);
    }, []);

    const filteredShops = shops.filter(s =>
        s.shop_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.key_id?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handlePrivatePush = () => {
        if (!privateImage) return alert('请上传图片');
        if (!privateVisual) return alert('请选择视觉');
        if (!privateStyle) return alert('请选择风格');
        if (selectedShops.length === 0) return alert('请选择推送店铺');

        alert(`私推成功！\n店铺: ${selectedShops.length}家`);

        // Clear form
        setPrivateImage('');
        setPrivateLink('');
        setPrivateRemark('');
        setPrivateVisual('');
        setPrivateStyle('');
        setSelectedShops([]);
    };

    const handlePublicPush = () => {
        if (!publicImage) return alert('请上传图片');
        if (!publicVisual) return alert('请选择视觉');
        if (!publicStyle) return alert('请选择风格');

        alert('已发布至公池！');

        // Clear form
        setPublicImage('');
        setPublicLink('');
        setPublicRemark('');
        setPublicVisual('');
        setPublicStyle('');
    };

    const toggleShop = (id: string) => {
        const shop = shops.find(s => s.id === id);
        if (shop && shop.private_push_count >= 3) {
            alert('该店铺私推接款进度已满 (3/3)，无法新增私推');
            return;
        }
        setSelectedShops(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    };

    const handlePinTop = (id: string) => {
        setPublicStyles(prev => prev.map(item => item.id === id ? { ...item, is_top: !item.is_top } : item));
    };

    // Sort public styles - pinned first
    const sortedPublicStyles = [...publicStyles].sort((a, b) => {
        if (a.is_top && !b.is_top) return -1;
        if (!a.is_top && b.is_top) return 1;
        return 0;
    });

    return (
        <div className="push-manage-page">
            <div className="page-header" style={{ textAlign: 'center', marginBottom: 24 }}>
                <h1 className="page-title">推款管理</h1>
                <p className="page-subtitle">向商家推送新款式需求</p>
            </div>

            {/* 并列展示：私推管理 | 公池管理 */}
            <div className="push-manage-grid">
                {/* 左侧：私推管理 */}
                <div className="card push-card">
                    <div className="card-header">
                        <span className="card-title">🔒 私推管理</span>
                    </div>
                    <div className="push-form">
                        <div className="form-group">
                            <label className="form-label">款式图片 <span style={{ color: 'red' }}>*</span></label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="输入图片URL"
                                value={privateImage}
                                onChange={e => setPrivateImage(e.target.value)}
                            />
                            {privateImage && <img src={privateImage} alt="Preview" className="image-preview" />}
                        </div>

                        <div className="form-group">
                            <label className="form-label">参考链接</label>
                            <input type="text" className="form-input" placeholder="输入链接" value={privateLink} onChange={e => setPrivateLink(e.target.value)} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">选择视觉 <span style={{ color: 'red' }}>*</span></label>
                            <div className="tag-list">
                                {visuals.map(v => (
                                    <span key={v} className={`tag ${privateVisual === v ? 'selected' : ''}`} onClick={() => setPrivateVisual(v)}>
                                        {v}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {privateVisual && (
                            <div className="form-group">
                                <label className="form-label">选择风格 <span style={{ color: 'red' }}>*</span></label>
                                <div className="tag-list">
                                    {styles.map(s => (
                                        <span key={s} className={`tag ${privateStyle === s ? 'selected' : ''}`} onClick={() => setPrivateStyle(s)}>
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">选择推送店铺 <span style={{ color: 'red' }}>*</span></label>
                            <div className="search-box" onClick={() => setShowShopOptions(true)}>
                                <span className="material-symbols-outlined">search</span>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="搜索店铺..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    onFocus={() => setShowShopOptions(true)}
                                />
                                <span className="selected-count">已选: {selectedShops.length}</span>
                            </div>

                            {showShopOptions && (
                                <div className="shop-select-list">
                                    {filteredShops.map(shop => {
                                        const isFull = shop.private_push_count >= 3;
                                        return (
                                            <label
                                                key={shop.id}
                                                className={`shop-select-item ${selectedShops.includes(shop.id) ? 'selected' : ''}`}
                                                style={{ opacity: isFull ? 0.5 : 1, cursor: isFull ? 'not-allowed' : 'pointer' }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedShops.includes(shop.id)}
                                                    onChange={() => toggleShop(shop.id)}
                                                    disabled={isFull}
                                                />
                                                <span style={{ flex: 1 }}>{shop.shop_name}</span>
                                                <span className="status-badge drafting" style={{ fontSize: 10 }}>{shop.key_id}</span>
                                                <span style={{ fontSize: 11, marginLeft: 8, color: isFull ? 'red' : '#999' }}>
                                                    {shop.private_push_count}/3
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">备注</label>
                            <textarea className="form-textarea" placeholder="备注信息" value={privateRemark} onChange={e => setPrivateRemark(e.target.value)} />
                        </div>

                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handlePrivatePush}>
                            确认私推
                        </button>
                    </div>
                </div>

                {/* 右侧：公池管理 */}
                <div className="card push-card">
                    <div className="card-header">
                        <span className="card-title">🌐 公池管理</span>
                    </div>
                    <div className="push-form">
                        <div className="form-group">
                            <label className="form-label">款式图片 <span style={{ color: 'red' }}>*</span></label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="输入图片URL"
                                value={publicImage}
                                onChange={e => setPublicImage(e.target.value)}
                            />
                            {publicImage && <img src={publicImage} alt="Preview" className="image-preview" />}
                        </div>

                        <div className="form-group">
                            <label className="form-label">参考链接</label>
                            <input type="text" className="form-input" placeholder="输入链接" value={publicLink} onChange={e => setPublicLink(e.target.value)} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">选择视觉 <span style={{ color: 'red' }}>*</span></label>
                            <div className="tag-list">
                                {visuals.map(v => (
                                    <span key={v} className={`tag ${publicVisual === v ? 'selected' : ''}`} onClick={() => setPublicVisual(v)}>
                                        {v}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {publicVisual && (
                            <div className="form-group">
                                <label className="form-label">选择风格 <span style={{ color: 'red' }}>*</span></label>
                                <div className="tag-list">
                                    {styles.map(s => (
                                        <span key={s} className={`tag ${publicStyle === s ? 'selected' : ''}`} onClick={() => setPublicStyle(s)}>
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">备注</label>
                            <textarea className="form-textarea" placeholder="备注信息" value={publicRemark} onChange={e => setPublicRemark(e.target.value)} />
                        </div>

                        <button className="btn btn-success" style={{ width: '100%' }} onClick={handlePublicPush}>
                            发布至公池
                        </button>
                    </div>

                    {/* 公池款式列表 */}
                    <div style={{ marginTop: 24, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                        <h3 style={{ fontSize: 14, marginBottom: 12, color: 'var(--text-secondary)' }}>📋 公池款式列表</h3>
                        <div className="public-style-list">
                            {sortedPublicStyles.map(item => (
                                <div key={item.id} className={`public-style-item ${item.is_top ? 'is-top' : ''}`}>
                                    <img src={item.image} alt="" className="public-style-image" />
                                    <div className="public-style-info">
                                        <div className="tag-list" style={{ marginBottom: 4 }}>
                                            {item.tags.map(t => <span key={t} className="tag" style={{ fontSize: 10 }}>{t}</span>)}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                            意向: {item.shops.length}/3
                                        </div>
                                    </div>
                                    <button
                                        className={`btn btn-sm ${item.is_top ? 'btn-warning' : 'btn-outline'}`}
                                        onClick={() => handlePinTop(item.id)}
                                        title={item.is_top ? '取消置顶' : '款式置顶'}
                                    >
                                        {item.is_top ? '📌 已置顶' : '📌 置顶'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .push-manage-page {
                    padding: 24px;
                    max-width: 1400px;
                    margin: 0 auto;
                }
                .push-manage-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 24px;
                }
                @media (max-width: 1000px) {
                    .push-manage-grid {
                        grid-template-columns: 1fr;
                    }
                }
                .push-card {
                    height: fit-content;
                }
                .push-form {
                    padding: 16px;
                }
                .image-preview {
                    width: 100%;
                    margin-top: 8px;
                    border-radius: 8px;
                    max-height: 150px;
                    object-fit: cover;
                }
                .search-box {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 12px;
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    background: var(--bg-secondary);
                }
                .search-box .form-input {
                    border: none;
                    background: transparent;
                    flex: 1;
                }
                .selected-count {
                    font-size: 12px;
                    color: var(--text-muted);
                    white-space: nowrap;
                }
                .shop-select-list {
                    margin-top: 8px;
                    max-height: 180px;
                    overflow-y: auto;
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    background: var(--card-bg);
                }
                .shop-select-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 12px;
                    cursor: pointer;
                    transition: background 0.15s;
                }
                .shop-select-item:hover {
                    background: var(--bg-secondary);
                }
                .shop-select-item.selected {
                    background: rgba(99, 102, 241, 0.1);
                }
                .public-style-list {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .public-style-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 8px;
                    border-radius: 8px;
                    background: var(--bg-secondary);
                    transition: background 0.15s;
                }
                .public-style-item.is-top {
                    background: rgba(250, 204, 21, 0.15);
                    border: 1px solid rgba(250, 204, 21, 0.3);
                }
                .public-style-image {
                    width: 48px;
                    height: 48px;
                    border-radius: 6px;
                    object-fit: cover;
                }
                .public-style-info {
                    flex: 1;
                }
                .btn-warning {
                    background: #F59E0B;
                    color: white;
                    border: none;
                }
                .btn-warning:hover {
                    background: #D97706;
                }
            `}</style>
        </div>
    );
};

export default PushManage;
