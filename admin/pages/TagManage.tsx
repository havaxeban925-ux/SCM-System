import React, { useState } from 'react';

interface Tag {
    id: string;
    name: string;
    category: 'visual' | 'style';
}

const TagManage: React.FC = () => {
    const [tags, setTags] = useState<Tag[]>([
        // 视觉类
        { id: '1', name: '人模', category: 'visual' },
        { id: '2', name: '平铺', category: 'visual' },
        { id: '3', name: '挂拍', category: 'visual' },
        { id: '4', name: '细节图', category: 'visual' },
        // 风格类
        { id: '5', name: '优雅风', category: 'style' },
        { id: '6', name: '休闲风', category: 'style' },
        { id: '7', name: '通勤风', category: 'style' },
        { id: '8', name: '法式风', category: 'style' },
        { id: '9', name: '韩系风', category: 'style' },
        { id: '10', name: '复古风', category: 'style' },
        { id: '11', name: '甜美风', category: 'style' },
        { id: '12', name: '轻奢风', category: 'style' },
    ]);

    const [showAddModal, setShowAddModal] = useState(false);
    const [newTag, setNewTag] = useState({ name: '', category: 'style' as Tag['category'] });

    const visualTags = tags.filter(t => t.category === 'visual');
    const styleTags = tags.filter(t => t.category === 'style');

    const handleAdd = () => {
        if (!newTag.name.trim()) {
            alert('请输入标签名称');
            return;
        }
        setTags([...tags, {
            id: Date.now().toString(),
            name: newTag.name.trim(),
            category: newTag.category
        }]);
        setNewTag({ name: '', category: 'style' });
        setShowAddModal(false);
    };

    const handleRemove = (id: string) => {
        if (confirm('确定删除此标签？')) {
            setTags(tags.filter(t => t.id !== id));
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">风格管理</h1>
                <p className="page-subtitle">管理款式标签，用于分类和筛选</p>
            </div>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">📷 视觉类标签</span>
                </div>
                <div className="tag-list">
                    {visualTags.map(tag => (
                        <span key={tag.id} className="tag">
                            {tag.name}
                            <span className="tag-remove material-symbols-outlined" onClick={() => handleRemove(tag.id)}>
                                close
                            </span>
                        </span>
                    ))}
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <span className="card-title">✨ 风格类标签</span>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
                        <span className="material-symbols-outlined">add</span>
                        新增标签
                    </button>
                </div>
                <div className="tag-list">
                    {styleTags.map(tag => (
                        <span key={tag.id} className="tag">
                            {tag.name}
                            <span className="tag-remove material-symbols-outlined" onClick={() => handleRemove(tag.id)}>
                                close
                            </span>
                        </span>
                    ))}
                </div>
            </div>

            {/* 新增标签弹窗 */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">新增标签</span>
                            <button className="btn-icon" onClick={() => setShowAddModal(false)}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">标签名称</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="输入标签名称"
                                    value={newTag.name}
                                    onChange={e => setNewTag({ ...newTag, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">标签类别</label>
                                <select
                                    className="form-select"
                                    value={newTag.category}
                                    onChange={e => setNewTag({ ...newTag, category: e.target.value as Tag['category'] })}
                                >
                                    <option value="visual">视觉类</option>
                                    <option value="style">风格类</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={() => setShowAddModal(false)}>取消</button>
                            <button className="btn btn-primary" onClick={handleAdd}>确认添加</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TagManage;
