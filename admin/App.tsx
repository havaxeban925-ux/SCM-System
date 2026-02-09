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
    const [refreshKey, setRefreshKey] = useState(0);
    const [styleMenuOpen, setStyleMenuOpen] = useState(true);
    const [requestMenuOpen, setRequestMenuOpen] = useState(true);
    const [requestTab, setRequestTab] = useState<any>('style'); // Using any to avoid import issues for now, or string

    const [isRegistering, setIsRegistering] = useState(false);
    const [registerForm, setRegisterForm] = useState({ username: '', password: '', confirmPassword: '' });

    const handleLogin = async () => {
        if (!loginForm.username || !loginForm.password) {
            setLoginError('请输入账号和密码');
            return;
        }

        try {
            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: loginForm.username,
                    password: loginForm.password
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setLoginError(data.error || '登录失败');
                return;
            }

            const username = data.user.username;
            const avatar = USER_AVATARS[username] || '👤';

            // OPT-1: 保存当前买手身份，用于API请求追溯操作人
            localStorage.setItem('current_buyer', username);
            setUser({ name: username, avatar });
            setLoginError('');
        } catch (err) {
            console.error('Login error:', err);
            setLoginError('登录请求失败，请检查网络');
        }
    };

    const handleRegister = async () => {
        if (!registerForm.username || !registerForm.password) {
            setLoginError('请输入用户名和密码');
            return;
        }
        if (registerForm.password !== registerForm.confirmPassword) {
            setLoginError('两次密码输入不一致');
            return;
        }

        try {
            const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
            const res = await fetch(`${API_BASE}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: registerForm.username,
                    password: registerForm.password
                })
            });

            const data = await res.json();
            if (!res.ok) {
                setLoginError(data.error || '注册失败');
                return;
            }

            // 注册成功后自动登录（这里简化为切换回登录页或直接登录，用户期望是后端接收到了）
            alert('注册成功！后端已接收。请登录。');
            setIsRegistering(false);
            setLoginForm({ username: registerForm.username, password: '' });
            setLoginError('');
        } catch (err) {
            setLoginError('请求失败，请检查后端服务是否启动');
        }
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

                    {!isRegistering ? (
                        <>
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
                        </>
                    ) : (
                        <>
                            <div className="form-group">
                                <label className="form-label">账号</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="设置账号"
                                    value={registerForm.username}
                                    onChange={e => setRegisterForm({ ...registerForm, username: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">密码</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    placeholder="设置密码"
                                    value={registerForm.password}
                                    onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">确认密码</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    placeholder="再次输入密码"
                                    value={registerForm.confirmPassword}
                                    onChange={e => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                                    onKeyDown={e => e.key === 'Enter' && handleRegister()}
                                />
                            </div>

                            <button
                                className="btn btn-success"
                                style={{ width: '100%', marginTop: 8, padding: '12px' }}
                                onClick={handleRegister}
                            >
                                注册
                            </button>
                        </>
                    )}

                    <div style={{ marginTop: 20, fontSize: 13, textAlign: 'center' }}>
                        {isRegistering ? (
                            <span className="link-text" onClick={() => setIsRegistering(false)} style={{ cursor: 'pointer', color: 'var(--primary-color)' }}>
                                返回登录
                            </span>
                        ) : (
                            <span className="link-text" onClick={() => setIsRegistering(true)} style={{ cursor: 'pointer', color: 'var(--primary-color)' }}>
                                注册新账号
                            </span>
                        )}
                    </div>

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
                <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* 刷新按钮 */}
                    <button
                        className="btn btn-sm btn-outline"
                        onClick={() => setRefreshKey(k => k + 1)}
                        style={{
                            padding: '6px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 13
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
                        刷新
                    </button>
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
                <div style={{ display: currentView === 'dashboard' ? 'block' : 'none' }}><Dashboard key={`dashboard-${refreshKey}`} /></div>
                <div style={{ display: currentView === 'push' ? 'block' : 'none' }}><PushManage key={`push-${refreshKey}`} /></div>
                <div style={{ display: currentView === 'tags' ? 'block' : 'none' }}><TagManage key={`tags-${refreshKey}`} /></div>
                <div style={{ display: currentView === 'spu' ? 'block' : 'none' }}><SpuLibrary key={`spu-${refreshKey}`} /></div>
                <div style={{ display: currentView === 'history' ? 'block' : 'none' }}><PushHistory key={`history-${refreshKey}`} /></div>
                <div style={{ display: currentView === 'styles' ? 'block' : 'none' }}><StyleManage key={`styles-${refreshKey}`} /></div>
                <div style={{ display: currentView === 'style_order' ? 'block' : 'none' }}><StyleOrderPage key={`style_order-${refreshKey}`} /></div>
                <div style={{ display: currentView === 'pricing_order' ? 'block' : 'none' }}><PricingOrderPage key={`pricing_order-${refreshKey}`} /></div>
                <div style={{ display: currentView === 'anomaly_order' ? 'block' : 'none' }}><AnomalyOrderPage key={`anomaly_order-${refreshKey}`} /></div>
                <div style={{ display: currentView === 'bulk_order' ? 'block' : 'none' }}><BulkOrderPage key={`bulk_order-${refreshKey}`} /></div>
                <div style={{ display: currentView === 'shops' ? 'block' : 'none' }}><ShopManage key={`shops-${refreshKey}`} /></div>
            </main>
        </div>
    );
};

export default App;
