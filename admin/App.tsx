import React, { useState } from 'react';
import StyleManage from './pages/StyleManage';
import ShopManage from './pages/ShopManage';
import PushManage from './pages/PushManage';
import TagManage from './pages/TagManage';
import SpuLibrary from './pages/SpuLibrary';
import PushHistory from './pages/PushHistory';
import Dashboard from './pages/Dashboard';
import StyleOrderPage from './pages/StyleOrderPage';
import PricingOrderPage from './pages/PricingOrderPage';
import AnomalyOrderPage from './pages/AnomalyOrderPage';
import BulkOrderPage from './pages/BulkOrderPage';

type View = 'dashboard' | 'push' | 'tags' | 'spu' | 'history' | 'requests' | 'shops' | 'styles' | 'style_order' | 'pricing_order' | 'anomaly_order' | 'bulk_order';

interface User {
    name: string;
    avatar: string;
}

// 用户头像配置（密码从环境变量读取）
const USER_AVATARS: Record<string, string> = {
    '阿桃': '🍑',
    '阿允': '✨',
    '铃酱': '🔔',
    '阿秋': '🍂',
    'ceshimiziqiu': '🤖', // 测试账号
};

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loginForm, setLoginForm] = useState({ username: '', password: '' });
    const [loginError, setLoginError] = useState('');
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [styleMenuOpen, setStyleMenuOpen] = useState(true);
    const [requestMenuOpen, setRequestMenuOpen] = useState(true);
    const [requestTab, setRequestTab] = useState<any>('style'); // Using any to avoid import issues for now, or string

    const handleLogin = () => {
        const avatar = USER_AVATARS[loginForm.username];
        if (!avatar) {
            setLoginError('用户名不存在');
            return;
        }
        // 密码从环境变量读取
        const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || '';
        if (loginForm.password !== adminPassword) {
            setLoginError('密码错误');
            return;
        }
        setUser({ name: loginForm.username, avatar });
        setLoginError('');
    };

    const handleLogout = () => {
        setUser(null);
        setLoginForm({ username: '', password: '' });
    };

    // 登录页
    if (!user) {
        return (
            <div className="login-page">
                <div className="login-card">
                    <h1 className="login-title">📊 SCM 管理后台</h1>
                    <p className="login-subtitle">买手工作台</p>

                    {loginError && <div className="login-error">{loginError}</div>}

                    <div className="form-group">
                        <label className="form-label">账号</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="输入角色名称"
                            value={loginForm.username}
                            onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">密码</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="输入密码"
                            value={loginForm.password}
                            onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                            onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        />
                    </div>

                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: 8, padding: '12px' }}
                        onClick={handleLogin}
                    >
                        登录
                    </button>

                    <div style={{ marginTop: 20, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                        可用账号：阿桃 / 阿允 / 铃酱 / 阿秋
                    </div>
                </div>
            </div>
        );
    }


    // 获取当前视图的标题
    const getViewTitle = () => {
        const titles: Record<View, string> = {
            dashboard: '首页看板',
            push: '推款管理',
            tags: '风格管理',
            spu: 'SPU库',
            history: '推款历史',
            requests: '申请审批',
            shops: '商家管理',
            styles: '款式管理',
            style_order: '款式工单',
            pricing_order: '核价工单',
            anomaly_order: '异常工单',
            bulk_order: '大货工单',
        };
        return titles[currentView] || '首页';
    };

    // 获取父级菜单
    const getParentMenu = () => {
        if (['push', 'tags', 'spu', 'history'].includes(currentView)) return '款式管理';
        if (['style_order', 'pricing_order', 'anomaly_order', 'bulk_order'].includes(currentView)) return '申请审批';
        return null;
    };

    return (
        <div className="admin-layout">
            {/* 顶部通栏 */}
            <header className="header">
                <div className="header-left">
                    <div className="breadcrumb">
                        <span className="breadcrumb-item" onClick={() => setCurrentView('dashboard')} style={{ cursor: 'pointer' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle' }}>home</span>
                        </span>
                        {getParentMenu() && (
                            <>
                                <span className="breadcrumb-separator">/</span>
                                <span className="breadcrumb-item">{getParentMenu()}</span>
                            </>
                        )}
                        <span className="breadcrumb-separator">/</span>
                        <span className="breadcrumb-item active">{getViewTitle()}</span>
                    </div>
                </div>
                <div className="header-right">
                    <button className="header-icon-btn" title="搜索">
                        <span className="material-symbols-outlined">search</span>
                    </button>
                    <button className="header-icon-btn" title="通知">
                        <span className="material-symbols-outlined">notifications</span>
                        <span className="notification-badge"></span>
                    </button>
                    <div className="header-avatar" title={user.name}>
                        {user.avatar}
                    </div>
                </div>
            </header>

            <aside className="sidebar">
                <div className="sidebar-header" onClick={() => setCurrentView('dashboard')} style={{ cursor: 'pointer' }}>
                    <span className="sidebar-logo">📊 SCM 管理后台</span>
                </div>
                <nav className="sidebar-menu">
                    <button
                        className={`menu-item ${currentView === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setCurrentView('dashboard')}
                    >
                        <span className="material-symbols-outlined">dashboard</span>
                        首页&看板
                    </button>

                    {/* 款式管理 */}
                    <div>
                        <button
                            className="menu-item"
                            onClick={() => setStyleMenuOpen(!styleMenuOpen)}
                            style={{ fontWeight: 500 }}
                        >
                            <span className="material-symbols-outlined">checkroom</span>
                            款式管理
                            <span className="material-symbols-outlined" style={{ marginLeft: 'auto', fontSize: 16 }}>
                                {styleMenuOpen ? 'expand_less' : 'expand_more'}
                            </span>
                        </button>
                        {styleMenuOpen && (
                            <div className="submenu">
                                <button
                                    className={`menu-item ${currentView === 'push' ? 'active' : ''}`}
                                    onClick={() => setCurrentView('push')}
                                >
                                    推款管理
                                </button>
                                <button
                                    className={`menu-item ${currentView === 'tags' ? 'active' : ''}`}
                                    onClick={() => setCurrentView('tags')}
                                >
                                    风格管理
                                </button>
                                <button
                                    className={`menu-item ${currentView === 'spu' ? 'active' : ''}`}
                                    onClick={() => setCurrentView('spu')}
                                >
                                    SPU库
                                </button>
                                <button
                                    className={`menu-item ${currentView === 'history' ? 'active' : ''}`}
                                    onClick={() => setCurrentView('history')}
                                >
                                    推款历史
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 申请审批 - 独立工单页面 */}
                    <div>
                        <button
                            className="menu-item"
                            onClick={() => setRequestMenuOpen(!requestMenuOpen)}
                            style={{ fontWeight: 500 }}
                        >
                            <span className="material-symbols-outlined">approval</span>
                            申请审批
                            <span className="material-symbols-outlined" style={{ marginLeft: 'auto', fontSize: 16 }}>
                                {requestMenuOpen ? 'expand_less' : 'expand_more'}
                            </span>
                        </button>
                        {requestMenuOpen && (
                            <div className="submenu">
                                <button
                                    className={`menu-item ${currentView === 'style_order' ? 'active' : ''}`}
                                    onClick={() => setCurrentView('style_order')}
                                >
                                    款式工单
                                </button>
                                <button
                                    className={`menu-item ${currentView === 'pricing_order' ? 'active' : ''}`}
                                    onClick={() => setCurrentView('pricing_order')}
                                >
                                    核价工单
                                </button>
                                <button
                                    className={`menu-item ${currentView === 'anomaly_order' ? 'active' : ''}`}
                                    onClick={() => setCurrentView('anomaly_order')}
                                >
                                    异常工单
                                </button>
                                <button
                                    className={`menu-item ${currentView === 'bulk_order' ? 'active' : ''}`}
                                    onClick={() => setCurrentView('bulk_order')}
                                >
                                    大货工单
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        className={`menu-item ${currentView === 'shops' ? 'active' : ''}`}
                        onClick={() => setCurrentView('shops')}
                    >
                        <span className="material-symbols-outlined">store</span>
                        商家管理
                    </button>
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">{user.avatar}</div>
                        <span>{user.name}</span>
                        <button
                            className="btn-icon"
                            style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.6)' }}
                            onClick={handleLogout}
                            title="退出登录"
                        >
                            <span className="material-symbols-outlined">logout</span>
                        </button>
                    </div>
                </div>
            </aside>

            <main className="main-content">
                <div style={{ display: currentView === 'dashboard' ? 'block' : 'none' }}><Dashboard /></div>
                <div style={{ display: currentView === 'push' ? 'block' : 'none' }}><PushManage /></div>
                <div style={{ display: currentView === 'tags' ? 'block' : 'none' }}><TagManage /></div>
                <div style={{ display: currentView === 'spu' ? 'block' : 'none' }}><SpuLibrary /></div>
                <div style={{ display: currentView === 'history' ? 'block' : 'none' }}><PushHistory /></div>
                <div style={{ display: currentView === 'styles' ? 'block' : 'none' }}><StyleManage /></div>
                <div style={{ display: currentView === 'style_order' ? 'block' : 'none' }}><StyleOrderPage /></div>
                <div style={{ display: currentView === 'pricing_order' ? 'block' : 'none' }}><PricingOrderPage /></div>
                <div style={{ display: currentView === 'anomaly_order' ? 'block' : 'none' }}><AnomalyOrderPage /></div>
                <div style={{ display: currentView === 'bulk_order' ? 'block' : 'none' }}><BulkOrderPage /></div>
                <div style={{ display: currentView === 'shops' ? 'block' : 'none' }}><ShopManage /></div>
            </main>
        </div>
    );
};

export default App;
