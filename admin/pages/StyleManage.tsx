import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface StyleItem {
    id: string;
    name: string;
    image_url?: string;
    shop_name?: string;
    status: string;
    development_status?: string;
    push_type: string;
    created_at: string;
}

const StyleManage: React.FC = () => {
    const [styles, setStyles] = useState<StyleItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        loadStyles();
    }, []);

    const loadStyles = async () => {
        setLoading(true);
        try {
            const [privateRes, devRes] = await Promise.all([
                api.get<{ data?: StyleItem[] } | StyleItem[]>('/api/styles/private').catch(() => []),
                api.get<{ data?: StyleItem[] } | StyleItem[]>('/api/development').catch(() => []),
            ]);

            const privateStyles = Array.isArray(privateRes) ? privateRes : (privateRes?.data || []);
            const devStyles = Array.isArray(devRes) ? devRes : (devRes?.data || []);

            setStyles([...privateStyles, ...devStyles]);
        } catch (err) {
            console.error('Failed to load styles:', err);
        }
        setLoading(false);
    };

    const handleConfirmSpu = async (id: string) => {
        if (!confirm('确认审核通过并录入SPU库吗？')) return;
        try {
            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001';
            const res = await fetch(`${API_BASE}/api/development/${id}/spu-confirm`, {
                method: 'POST'
            });
            if (!res.ok) throw new Error('Failed');
            alert('审核通过，已录入SPU库');
            loadStyles();
        } catch (err) {
            alert('操作失败');
        }
    };

    const filteredStyles = styles.filter(s => {
        if (filter === 'all') return true;
        // spu_verify 在 development_status 中，其他在 status 中
        if (filter === 'spu_verify') return s.development_status === 'spu_verify';
        return s.status === filter;
    });

    const getStatusBadge = (status: string) => {
        const map: Record<string, string> = {
            new: '待处理',
            locked: '已锁定',
            developing: '开发中',
            spu_verify: 'SPU待审核',
            completed: '已完成',
            abandoned: '已放弃',
        };
        return map[status] || status;
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">款式管理</h1>
                <p className="page-subtitle">管理私推款式和公池款式</p>
            </div>

            <div className="card">
                <div className="filter-bar">
                    <select
                        className="filter-select"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                    >
                        <option value="all">全部状态</option>
                        <option value="new">待处理</option>
                        <option value="locked">已锁定</option>
                        <option value="developing">开发中</option>
                        <option value="spu_verify">SPU待审核</option>
                        <option value="completed">已完成</option>
                    </select>
                    <button className="btn btn-outline" onClick={loadStyles}>
                        <span className="material-symbols-outlined">refresh</span>
                        刷新
                    </button>
                </div>

                {loading ? (
                    <div className="empty-state">加载中...</div>
                ) : filteredStyles.length === 0 ? (
                    <div className="empty-state">
                        <span className="material-symbols-outlined">inbox</span>
                        <p>暂无款式数据</p>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>图片</th>
                                <th>款式名称</th>
                                <th>商家</th>
                                <th>类型</th>
                                <th>状态</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStyles.map(style => (
                                <tr key={style.id}>
                                    <td>
                                        <img
                                            src={style.image_url || 'https://via.placeholder.com/48'}
                                            alt=""
                                            className="style-image"
                                        />
                                    </td>
                                    <td>{style.name}</td>
                                    <td>{style.shop_name || '-'}</td>
                                    <td>{style.push_type === 'POOL' ? '公池' : '私推'}</td>
                                    <td>
                                        <span className={`status-badge ${style.development_status === 'spu_verify' ? 'spu_verify' : style.status}`}>
                                            {style.development_status === 'spu_verify' ? 'SPU待审核' : getStatusBadge(style.status)}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            {style.development_status === 'spu_verify' && (
                                                <button
                                                    className="btn btn-sm btn-success"
                                                    onClick={() => handleConfirmSpu(style.id)}
                                                    style={{ marginRight: 8 }}
                                                >
                                                    提交
                                                </button>
                                            )}
                                            <button className="btn btn-sm btn-outline">编辑</button>
                                            <button className="btn btn-sm btn-danger">删除</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default StyleManage;
