
import React, { useState, useEffect } from 'react';
import { AppView, StyleItem } from './types';
import StyleWorkbench from './pages/StyleWorkbench';
import { getQuotaStats } from './services/styleService';
import RequestWorkbench from './pages/RequestWorkbench';
import ReplenishmentSynergy from './pages/ReplenishmentSynergy';
import DevelopmentProgress from './pages/DevelopmentProgress';
import QuotationDrawer from './components/QuotationDrawer';
import { PRIVATE_STYLES, MOCK_DEVELOPMENT_STYLES } from './constants';
import ErrorBoundary from './components/ErrorBoundary';

// 模拟消息
const MOCK_MESSAGES = [
  { id: '1', title: '款式进入开发环节', content: 'S20060 已进入开发环节', time: '10分钟前', read: false, targetView: AppView.DEVELOPMENT_PROGRESS },
  { id: '2', title: '补货单待处理', content: 'SKC-202401-001 待确认接单', time: '1小时前', read: false, targetView: AppView.REPLENISHMENT },
  { id: '3', title: '核价申请已通过', content: '您的报价单申请已通过审核', time: '2小时前', read: true, targetView: AppView.REQUEST_WORKBENCH },
];

// 登录视图组件（支持登录和注册）
const LoginView: React.FC<{ onLogin: (user: any) => void }> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [registerStatus, setRegisterStatus] = useState<'idle' | 'pending' | 'rejected'>('idle');
  const [rejectReason, setRejectReason] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      alert('请输入用户名和密码');
      return;
    }

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || '登录失败');
        return;
      }

      // 登录成功
      alert(`欢迎回来，${data.user.shop_name || data.user.username}`);
      onLogin(data.user);

    } catch (err) {
      alert('请求失败，请检查网络或后端服务');
      console.error(err);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !shopName) {
      alert('请填写完整信息');
      return;
    }

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          shop_name: shopName
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(`注册失败：${data.error || '未知错误'}`);
        return;
      }

      // 注册成功
      setRegisterStatus('pending');
      alert('注册申请已提交，请等待买手审核。\n\n审核通过后您将收到通知。');
      setMode('login');
    } catch (err) {
      alert('请求失败，请检查后端服务是否启动');
      console.error('Register error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001529] via-[#003366] to-[#004d80] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-xl mb-4">
              <span className="material-symbols-outlined text-primary text-3xl">style</span>
            </div>
            <h1 className="text-2xl font-black text-navy-700">小铃子组业务协同系统</h1>
            <p className="text-sm text-slate-500 mt-2">SCM - Supply Chain Management</p>
          </div>

          {/* 选项卡切换 */}
          <div className="flex border-b border-slate-200 mb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 pb-3 text-sm font-bold transition-colors ${mode === 'login'
                ? 'text-primary border-b-2 border-primary'
                : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 pb-3 text-sm font-bold transition-colors ${mode === 'register'
                ? 'text-primary border-b-2 border-primary'
                : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              注册
            </button>
          </div>

          {/* 待审核提示 */}
          {registerStatus === 'pending' && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500">schedule</span>
              您的注册申请正在审核中...
            </div>
          )}

          {/* 驳回提示 */}
          {registerStatus === 'rejected' && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500">error</span>
              店铺不存在：{rejectReason}
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">账号</label>
                <input
                  type="text"
                  className="w-full h-12 px-4 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="请输入账号"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">密码</label>
                <input
                  type="password"
                  className="w-full h-12 px-4 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="请输入密码"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="w-full h-12 bg-primary text-white rounded-lg text-sm font-bold hover:bg-blue-600 transition-colors shadow-lg shadow-primary/30"
              >
                登 录
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">账号</label>
                <input
                  type="text"
                  className="w-full h-12 px-4 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="请设置登录账号"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">密码</label>
                <input
                  type="password"
                  className="w-full h-12 px-4 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="请设置登录密码"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">店铺名称</label>
                <input
                  type="text"
                  className="w-full h-12 px-4 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="请输入店铺名称（用于审核）"
                  value={shopName}
                  onChange={e => setShopName(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="w-full h-12 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-600/30"
              >
                申请注册
              </button>
            </form>
          )}

          <p className="text-center text-xs text-slate-400 mt-6">© 2024 SCM System. All Rights Reserved.</p>
        </div>
      </div>
    </div>
  );
};

interface Shop {
  id: string;
  shop_name: string;
  level: string;
  key_id: string;
  shop_code?: string;
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myShops, setMyShops] = useState<Shop[]>([]);
  const [currentShopId, setCurrentShopId] = useState<string | undefined>(undefined);

  const [currentView, setCurrentView] = useState<AppView>(AppView.STYLE_WORKBENCH);
  const [showQuotationDrawer, setShowQuotationDrawer] = useState(false);

  // 消息通知 Popover 状态
  const [showNotifications, setShowNotifications] = useState(false);
  const [messages, setMessages] = useState(MOCK_MESSAGES);

  // 用户菜单 Popover 状态
  const [showUserMenu, setShowUserMenu] = useState(false);

  // 店铺信息管理 Modal 状态
  const [showShopModal, setShowShopModal] = useState(false);

  const [stylesInDevelopment, setStylesInDevelopment] = useState<StyleItem[]>(MOCK_DEVELOPMENT_STYLES);
  const [availableStyles, setAvailableStyles] = useState<StyleItem[]>(PRIVATE_STYLES);

  const handleLoginSuccess = async (user: any) => {
    setCurrentUser(user);
    // Fetch associated shops based on user.shop_name or username
    // Here we assume mapping by shop_name for simplicity as per user intent
    if (user.shop_name) {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
        const res = await fetch(`${API_BASE}/api/admin/shops?search=${encodeURIComponent(user.shop_name)}`);
        if (res.ok) {
          const json = await res.json();
          const shops = json.data || [];
          setMyShops(shops);
          if (shops.length > 0) {
            setCurrentShopId(shops[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch user shops', err);
      }
    }
  };

  // OPT-4: 浏览器通知轮询
  useEffect(() => {
    if (!currentUser || currentUser.status !== 'approved') return;

    let lastCheckTime = Date.now();

    const checkUpdates = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
        const shopName = currentUser.shop_name || '';
        const res = await fetch(
          `${API_BASE}/api/notifications?shop_name=${encodeURIComponent(shopName)}&since=${lastCheckTime}`
        );
        const data = await res.json();

        if (data.updates && data.updates.length > 0) {
          data.updates.forEach((update: any) => {
            // 浏览器通知
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(update.title, { body: update.message });
            }
            // 更新UI消息列表
            setMessages(prev => [{
              id: Date.now().toString(),
              title: update.title,
              content: update.message,
              time: '刚刚',
              read: false,
              targetView: AppView.STYLE_WORKBENCH
            }, ...prev]);
          });
          lastCheckTime = Date.now();
        }
      } catch (error) {
        console.error('通知轮询失败:', error);
      }
    };

    // 请求通知权限
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // 每分钟轮询
    const interval = setInterval(checkUpdates, 60000);

    // 初次检查
    checkUpdates();

    return () => clearInterval(interval);
  }, [currentUser]);

  const handleConfirmStyle = (style: StyleItem) => {
    setAvailableStyles(prev => prev.filter(s => s.id !== style.id));
    setStylesInDevelopment(prev => [
      ...prev,
      { ...style, status: 'developing', developmentStatus: 'drafting' }
    ]);
    setCurrentView(AppView.DEVELOPMENT_PROGRESS);
  };

  const handleUpdateDevStatus = (id: string, newStatus: StyleItem['developmentStatus']) => {
    setStylesInDevelopment(prev => prev.map(s => s.id === id ? { ...s, developmentStatus: newStatus } : s));
    if (newStatus === 'success') {
      setTimeout(() => {
        setStylesInDevelopment(prev => prev.filter(s => s.id !== id));
      }, 5000);
    }
  };

  const handleAbandonDevelopment = (id: string) => {
    const styleToReturn = stylesInDevelopment.find(s => s.id === id);
    if (styleToReturn) {
      setStylesInDevelopment(prev => prev.filter(s => s.id !== id));
      setAvailableStyles(prev => [...prev, { ...styleToReturn, status: 'new' }]);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setShowUserMenu(false);
    setMyShops([]);
  };

  const unreadCount = messages.filter(m => !m.read).length;

  const markAllAsRead = () => {
    setMessages(messages.map(m => ({ ...m, read: true })));
  };

  // 如果未登录，显示登录页
  if (!currentUser) {
    return <LoginView onLogin={handleLoginSuccess} />;
  }

  const Header: React.FC = () => (
    <header className="sticky top-0 z-[60] bg-[#001529] border-b border-slate-700 px-6 lg:px-12 py-3">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-1.5 rounded text-white">
              <span className="material-symbols-outlined text-2xl">style</span>
            </div>
            <h1 className="text-white text-lg font-bold tracking-tight">小铃子组业务协同系统</h1>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => setCurrentView(AppView.STYLE_WORKBENCH)}
              className={`text-sm transition-colors ${currentView === AppView.STYLE_WORKBENCH ? 'text-primary border-b-2 border-primary pb-3 -mb-3.5 font-bold' : 'text-slate-400 hover:text-white font-medium'}`}
            >
              接款开发
            </button>
            <button
              onClick={() => setCurrentView(AppView.DEVELOPMENT_PROGRESS)}
              className={`text-sm transition-colors ${currentView === AppView.DEVELOPMENT_PROGRESS ? 'text-primary border-b-2 border-primary pb-3 -mb-3.5 font-bold' : 'text-slate-400 hover:text-white font-medium'}`}
            >
              开发进度
            </button>
            <button
              onClick={() => setCurrentView(AppView.REQUEST_WORKBENCH)}
              className={`text-sm transition-colors ${currentView === AppView.REQUEST_WORKBENCH ? 'text-primary border-b-2 border-primary pb-3 -mb-3.5 font-bold' : 'text-slate-400 hover:text-white font-medium'}`}
            >
              发起申请
            </button>
            <button
              onClick={() => setCurrentView(AppView.REPLENISHMENT)}
              className={`text-sm transition-colors ${currentView === AppView.REPLENISHMENT ? 'text-primary border-b-2 border-primary pb-3 -mb-3.5 font-bold' : 'text-slate-400 hover:text-white font-medium'}`}
            >
              补货协同
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 border-l border-white/20 pl-6">
            {/* 刷新按钮 */}
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>refresh</span>
              刷新
            </button>
            {/* 消息通知小铃铛 */}
            <div className="relative">
              <button
                onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
                className="material-symbols-outlined text-slate-400 cursor-pointer hover:text-white transition-colors p-2 hover:bg-white/10 rounded-full relative"
              >
                notifications
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {/* 消息 Popover */}
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                    <span className="font-bold text-sm text-navy-700">系统消息</span>
                    <button onClick={markAllAsRead} className="text-[10px] text-primary hover:underline font-bold">全部已读</button>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`px-4 py-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${!msg.read ? 'bg-blue-50/50' : ''}`}
                        onClick={() => {
                          // 标记已读
                          setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m));
                          // 跳转到对应板块
                          if (msg.targetView) {
                            setCurrentView(msg.targetView);
                            setShowNotifications(false);
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`material-symbols-outlined text-lg mt-0.5 ${!msg.read ? 'text-primary' : 'text-slate-400'}`}>
                            {msg.title.includes('开发') ? 'design_services' : msg.title.includes('补货') ? 'inventory' : 'check_circle'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-700 truncate">{msg.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{msg.content}</p>
                            <p className="text-[10px] text-slate-400 mt-1">{msg.time}</p>
                          </div>
                          {!msg.read && <span className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0"></span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t border-slate-200 bg-slate-50">
                    <button className="w-full text-center text-xs text-primary font-bold hover:underline">查看全部消息</button>
                  </div>
                </div>
              )}
            </div>

            {/* 用户菜单 */}
            <div className="relative">
              <div
                onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
                className="flex items-center gap-2 cursor-pointer hover:bg-white/10 px-3 py-1.5 rounded transition-colors group"
              >
                <div className="flex flex-col items-end">
                  <span className="text-sm text-white font-bold">{currentUser.shop_name}</span>
                  <span className="text-[10px] text-slate-400">{currentUser.username}</span>
                </div>
                <span className="material-symbols-outlined text-slate-400 group-hover:text-white text-xl">account_circle</span>
                <span className="material-symbols-outlined text-slate-400 text-sm">expand_more</span>
              </div>
              {/* 用户菜单 Popover */}
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <p className="font-bold text-sm text-navy-700">{currentUser.shop_name}</p>
                    <p className="text-xs text-slate-500">{currentUser.username}</p>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={() => { setShowShopModal(true); setShowUserMenu(false); }}
                      className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3"
                    >
                      <span className="material-symbols-outlined text-lg text-slate-400">store</span>
                      店铺信息管理
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                    >
                      <span className="material-symbols-outlined text-lg text-red-400">logout</span>
                      退出登录
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );

  return (
    <div className="flex flex-col min-h-screen" onClick={() => { setShowNotifications(false); setShowUserMenu(false); }}>
      <div onClick={e => e.stopPropagation()}>
        <Header />
      </div>
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 lg:px-12 py-8">
        <ErrorBoundary name="MainView">
          <div style={{ display: currentView === AppView.STYLE_WORKBENCH ? 'block' : 'none' }}>
            <StyleWorkbench
              availableStyles={availableStyles}
              onConfirmStyle={handleConfirmStyle}
              shopId={currentShopId}
            />
          </div>
          <div style={{ display: currentView === AppView.DEVELOPMENT_PROGRESS ? 'block' : 'none' }}>
            <DevelopmentProgress
              styles={stylesInDevelopment}
              onAbandon={handleAbandonDevelopment}
              onUpdateStatus={handleUpdateDevStatus}
            />
          </div>
          <div style={{ display: currentView === AppView.REQUEST_WORKBENCH ? 'block' : 'none' }}>
            <RequestWorkbench onNewRequest={() => setShowQuotationDrawer(true)} />
          </div>
          <div style={{ display: currentView === AppView.REPLENISHMENT ? 'block' : 'none' }}>
            <ReplenishmentSynergy />
          </div>
        </ErrorBoundary>
      </main>
      <footer className="mt-auto border-t border-slate-200 bg-white px-6 lg:px-12 py-6">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-xs text-slate-400">© 2024 小铃子组业务协同系统 (SCM).</span>
          <div className="flex items-center gap-6">
            <a className="text-xs text-slate-500 hover:text-primary transition-colors" href="#">操作指南</a>
            <a className="text-xs text-slate-500 hover:text-primary transition-colors" href="#">意见反馈</a>
          </div>
        </div>
      </footer>
      {showQuotationDrawer && <QuotationDrawer onClose={() => setShowQuotationDrawer(false)} />}

      {/* 店铺信息管理 Modal */}
      {showShopModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowShopModal(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-lg text-navy-700">店铺信息管理</h3>
              <button onClick={() => setShowShopModal(false)} className="material-symbols-outlined text-slate-400 hover:text-slate-600">close</button>
            </div>
            <div className="p-6 space-y-6">

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">商家昵称</label>
                  <div className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center text-sm font-medium">
                    {currentUser.shop_name || '未设置'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">联系方式</label>
                  <div className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center text-sm font-medium">
                    {currentUser.username}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">店铺列表</label>
                {myShops.length > 0 ? (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2 text-left text-slate-500 font-bold">店铺ID</th>
                          <th className="px-3 py-2 text-left text-slate-500 font-bold">店铺名称</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myShops.map((shop, idx) => (
                          <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                            <td className="px-3 py-2 font-mono text-slate-600">{shop.shop_code || shop.id.slice(0, 8)}</td>
                            <td className="px-3 py-2 font-medium text-navy-700">{shop.shop_name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-center text-slate-500 text-sm">
                    暂无店铺信息，请联系管理员关联店铺
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setShowShopModal(false)} className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-blue-600">关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
