
import React, { useState, useEffect, useMemo } from 'react';
import { StyleItem } from '../types';
import { getPrivateStyles, getPublicStyles, confirmStyle, createAndConfirmPublicStyle, expressIntent, abandonStyle, getQuotaStats } from '../services/styleService';
import { StyleDemand, PublicStyle } from '../lib/supabase';

interface Props {
  availableStyles: StyleItem[];
  onConfirmStyle: (style: StyleItem) => void;
  shopId?: string;
}

// 转换数据库格式到前端格式
function toStyleItem(s: StyleDemand): StyleItem {
  return {
    id: s.id,
    name: s.name,
    image: s.image_url || '',
    shopId: s.sys_shop?.shop_code || s.shop_id || '',
    shopName: s.shop_name || '',
    remark: s.remark || '',
    timestamp: s.timestamp_label || '',
    status: s.status as StyleItem['status'],
    daysLeft: s.days_left,
    developmentStatus: s.development_status as StyleItem['developmentStatus'],
    refLink: s.ref_link || '',
    attachments: s.image_url ? [s.image_url] : [],
  };
}

// 计算款式发布天数
function getDaysFromCreate(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

const StyleWorkbench: React.FC<Props> = ({ availableStyles: propStyles, onConfirmStyle, shopId }) => {
  const [loading, setLoading] = useState(true);
  const [privateStyles, setPrivateStyles] = useState<StyleItem[]>([]);
  const [publicStyles, setPublicStyles] = useState<PublicStyle[]>([]);
  const [quota, setQuota] = useState<{ current: number; limit: number }>({ current: 0, limit: 5 });

  // 弹窗状态
  const [linkPopup, setLinkPopup] = useState<{ open: boolean; link: string }>({ open: false, link: '' });
  const [attachPopup, setAttachPopup] = useState<{ open: boolean; images: string[] }>({ open: false, images: [] });
  const [abandonModal, setAbandonModal] = useState<{ open: boolean; styleId: string; reason: string }>({ open: false, styleId: '', reason: '' });

  // 私推分页状态（5款/页）
  const [privatePage, setPrivatePage] = useState(1);
  const PRIVATE_PAGE_SIZE = 5;
  const [publicDrawer, setPublicDrawer] = useState(false);

  // 加载数据
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [privateData, publicData] = await Promise.all([
          getPrivateStyles(shopId),
          getPublicStyles()
        ]);
        setPrivateStyles(privateData.map(toStyleItem));
        setPublicStyles(publicData);

        if (shopId) {
          const stats = await getQuotaStats(shopId);
          if (stats) setQuota(stats);
        }
      } catch (err) {
        console.error('Error loading styles:', err);
        setPrivateStyles(propStyles);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [shopId]);

  // 公池过滤 + 排序：排除 2/2，优先 1/2，其次老款(10天+)，其他
  const sortedPublicStyles = useMemo(() => {
    const filtered = publicStyles.filter(s => s.intent_count < s.max_intents);
    return filtered.sort((a, b) => {
      // 优先级1: 有意向 (1/2)
      if (a.intent_count > 0 && b.intent_count === 0) return -1;
      if (b.intent_count > 0 && a.intent_count === 0) return 1;
      // 优先级2: 老款 (10天+)
      const aDays = getDaysFromCreate(a.created_at);
      const bDays = getDaysFromCreate(b.created_at);
      if (aDays >= 10 && bDays < 10) return -1;
      if (bDays >= 10 && aDays < 10) return 1;
      return 0;
    });
  }, [publicStyles]);

  // 默认显示最多 8 个（一行4，两行）
  const displayPublicStyles = sortedPublicStyles.slice(0, 8);

  const handleConfirmStyle = async (style: StyleItem) => {
    const success = await confirmStyle(style.id);
    if (success) {
      setPrivateStyles(prev => prev.filter(s => s.id !== style.id));
      onConfirmStyle(style);
    }
  };

  const handleAbandonStyle = async () => {
    if (!abandonModal.reason.trim()) {
      alert('请输入放弃接款原因');
      return;
    }
    const success = await abandonStyle(abandonModal.styleId);
    if (success) {
      setPrivateStyles(prev => prev.filter(s => s.id !== abandonModal.styleId));
      setAbandonModal({ open: false, styleId: '', reason: '' });
    }
  };

  // 处理中的款式ID（防抖）
  const [processingId, setProcessingId] = useState<string | null>(null);

  // ... (existing code)

  const handleConfirmPublicStyle = async (style: PublicStyle) => {
    if (processingId === style.id) return;
    setProcessingId(style.id);

    try {
      const userData = localStorage.getItem('merchantUser');
      const user = userData ? JSON.parse(userData) : null;
      const currentShopName = user?.shop_name || user?.shops?.[0]?.shop_name || '未知店铺';

      // 如果没有 shopId (prop)，尝试从 user 中获取
      const currentShopId = shopId || user?.shop_id || user?.shops?.[0]?.id;

      if (!currentShopId) {
        alert('无法获取当前店铺信息，请重新登录');
        return;
      }

      const newStyle = await createAndConfirmPublicStyle(style, currentShopId, currentShopName);
      if (newStyle) {
        const styleItem = toStyleItem(newStyle);
        onConfirmStyle(styleItem);
        alert('接款成功！已创建私推需求');
      } else {
        alert('接款失败，请重试');
      }
    } catch (err) {
      console.error('Confirm public style error:', err);
      alert('接款失败，发生错误');
    } finally {
      setProcessingId(null);
    }
  };

  const handleExpressIntent = async (style: PublicStyle) => {
    if (processingId === style.id) return;
    setProcessingId(style.id);

    try {
      const userData = localStorage.getItem('merchantUser');
      const user = userData ? JSON.parse(userData) : null;
      const currentShopName = user?.shop_name || user?.shops?.[0]?.shop_name || '未知店铺';

      const success = await expressIntent(style.id, shopId, currentShopName);
      if (success) {
        alert('意向表达成功！已添加到私推列表');
        // 更新公池款式的意向计数
        setPublicStyles(prev => prev.map(s =>
          s.id === style.id ? { ...s, intent_count: s.intent_count + 1 } : s
        ));
        // 问题3修复：重新加载私推列表
        try {
          const privateData = await getPrivateStyles(shopId);
          setPrivateStyles(privateData.map(toStyleItem));
        } catch (err) {
          console.error('Failed to reload private styles:', err);
        }
        // 问题4修复：重新加载名额统计
        if (shopId) {
          try {
            const stats = await getQuotaStats(shopId);
            if (stats) setQuota(stats);
          } catch (err) {
            console.error('Failed to reload quota stats:', err);
          }
        }
      }
    } catch (err) {
      console.error('Express intent error:', err);
    } finally {
      setProcessingId(null);
    }
  };



  const allStyles = privateStyles.length > 0 ? privateStyles : propStyles;
  const privateTotalPages = Math.ceil(allStyles.length / PRIVATE_PAGE_SIZE) || 1;
  const displayStyles = allStyles.slice((privatePage - 1) * PRIVATE_PAGE_SIZE, privatePage * PRIVATE_PAGE_SIZE);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        <span className="ml-3 text-slate-500">加载中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-navy-700">款式协作工作台</h2>
          <p className="text-slate-500 text-sm mt-1">管理私推款式并从公海池表达开发意向</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center px-3 py-1 bg-amber-50 border border-amber-200 rounded text-amber-700 text-xs font-medium">
            当前意向名额：<span className="font-bold mx-1 text-sm">{quota.current}/{quota.limit}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* 私推列表 */}
        <section className="xl:col-span-6 flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">assignment_ind</span>
              <h3 className="font-bold text-lg text-navy-700">私推列表 <span className="text-sm font-normal text-slate-400 ml-1">({displayStyles.length})</span></h3>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {displayStyles.map(style => (
              <div key={style.id} className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md transition-all group">
                <div className="flex gap-4">
                  <div className="w-20 h-32 rounded-lg bg-slate-100 bg-cover bg-center shrink-0 border border-slate-100" style={{ backgroundImage: `url(${style.image})` }}></div>
                  <div className="flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-1">
                      {style.daysLeft && <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded font-medium">意向锁定中 ({style.daysLeft}天)</span>}
                      <span className="text-[10px] text-slate-400">{style.timestamp}</span>
                    </div>
                    <h4 className="font-bold text-base text-navy-700 truncate group-hover:text-primary transition-colors">{style.name}</h4>
                    {/* 店铺显示：ID + 名称 */}
                    <p className="text-[11px] text-slate-500 mt-1">
                      <span className="text-slate-400">店铺ID：</span>{style.shopId || '-'}
                      <span className="mx-2 text-slate-300">|</span>
                      <span className="text-slate-400">店铺名：</span>{style.shopName}
                    </p>
                    <div className="mt-2">
                      <p className="text-xs text-slate-400 line-clamp-2">
                        <span className="font-bold text-slate-500">买手备注：</span>{style.remark}
                      </p>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center gap-3">
                        {/* 查看链接 */}
                        <button
                          onClick={() => setLinkPopup({ open: true, link: style.refLink || '暂无链接' })}
                          className="flex items-center gap-1 text-slate-500 hover:text-primary text-[11px] font-medium transition-colors"
                        >
                          <span className="material-symbols-outlined text-base">visibility</span> 查看链接
                        </button>
                        {/* 附件 */}
                        <button
                          onClick={() => setAttachPopup({ open: true, images: style.attachments || [] })}
                          className="flex items-center gap-1 text-slate-500 hover:text-primary text-[11px] font-medium transition-colors"
                        >
                          <span className="material-symbols-outlined text-base">attach_file</span> 附件
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setAbandonModal({ open: true, styleId: style.id, reason: '' })}
                          className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded text-xs font-bold hover:bg-slate-200 transition-colors"
                        >
                          放弃接款
                        </button>
                        <button
                          onClick={() => handleConfirmStyle(style)}
                          className="bg-primary text-white px-4 py-1.5 rounded text-xs font-bold shadow-sm hover:bg-blue-600 transition-colors"
                        >
                          确认接款
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* 私推分页控件 */}
          {privateTotalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                onClick={() => setPrivatePage(p => Math.max(1, p - 1))}
                disabled={privatePage === 1}
                className="px-3 py-1 rounded text-xs font-bold border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
              >
                上一页
              </button>
              <span className="text-sm text-slate-500">
                第 <span className="font-bold text-navy-700">{privatePage}</span> / {privateTotalPages} 页
              </span>
              <button
                onClick={() => setPrivatePage(p => Math.min(privateTotalPages, p + 1))}
                disabled={privatePage === privateTotalPages}
                className="px-3 py-1 rounded text-xs font-bold border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
              >
                下一页
              </button>
            </div>
          )}
        </section>

        {/* 公池 */}
        <section className="xl:col-span-6 flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">public</span>
              <h3 className="font-bold text-lg text-navy-700">公池 <span className="text-sm font-normal text-slate-400 ml-1">({sortedPublicStyles.length})</span></h3>
            </div>
          </div>

          {/* 一行4个卡片 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {displayPublicStyles.map(style => (
              <div key={style.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col group">
                <div className="relative aspect-[3/4] bg-slate-100 overflow-hidden">
                  <img src={style.image_url || ''} alt={style.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
                <div className="p-2 flex flex-col flex-1">
                  <h4 className="font-bold text-navy-700 text-xs truncate">{style.name}</h4>
                  <div className="flex items-center gap-1 mt-1 mb-2">
                    <span className="text-[10px] font-bold text-primary">{style.intent_count}/{style.max_intents}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 mt-auto">
                    <button
                      onClick={() => handleExpressIntent(style)}
                      disabled={style.intent_count >= style.max_intents || processingId === style.id}
                      className={`border border-primary/30 text-primary hover:bg-primary/5 py-1 rounded text-[9px] font-bold transition-colors disabled:opacity-50 ${processingId === style.id ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      {processingId === style.id ? '提交中...' : '意向'}
                    </button>
                    <button
                      onClick={() => handleConfirmPublicStyle(style)}
                      disabled={processingId === style.id}
                      className={`bg-primary text-white py-1 rounded font-bold text-[9px] hover:bg-blue-600 shadow-sm transition-colors ${processingId === style.id ? 'bg-slate-400 cursor-not-allowed hover:bg-slate-400' : ''}`}
                    >
                      {processingId === style.id ? '接款中...' : '接款'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {sortedPublicStyles.length > 8 && (
            <div className="flex justify-center mt-2">
              <button
                onClick={() => setPublicDrawer(true)}
                className="flex items-center gap-2 text-slate-400 hover:text-primary transition-colors text-xs font-medium group"
              >
                <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
                <span>查看更多 ({sortedPublicStyles.length - 8})</span>
              </button>
            </div>
          )}
        </section>
      </div>

      {/* 链接弹窗 */}
      {linkPopup.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setLinkPopup({ open: false, link: '' })}></div>
          <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-md w-full animate-in zoom-in-95">
            <h3 className="font-bold text-lg text-navy-700 mb-4">链接</h3>
            <div className="bg-slate-50 p-3 rounded border border-slate-200 break-all text-sm text-slate-600">
              {linkPopup.link.startsWith('http') ? (
                <a href={linkPopup.link} target="_blank" rel="noopener noreferrer" className="text-primary underline">{linkPopup.link}</a>
              ) : linkPopup.link}
            </div>
            <button onClick={() => setLinkPopup({ open: false, link: '' })} className="mt-4 w-full py-2 bg-slate-100 rounded font-bold text-sm">关闭</button>
          </div>
        </div>
      )}

      {/* 附件图片弹窗 */}
      {attachPopup.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAttachPopup({ open: false, images: [] })}></div>
          <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full animate-in zoom-in-95">
            <h3 className="font-bold text-lg text-navy-700 mb-4">附件图片</h3>
            <div className="grid grid-cols-5 gap-3">
              {(attachPopup.images.length > 0 ? attachPopup.images : ['placeholder']).map((img, i) => (
                <div key={i} className="aspect-square bg-slate-100 rounded border border-slate-200 flex items-center justify-center overflow-hidden">
                  {img === 'placeholder' ? (
                    <span className="text-slate-300 text-xs">无图片</span>
                  ) : (
                    <img src={img} alt={`附件${i + 1}`} className="w-full h-full object-cover" />
                  )}
                </div>
              ))}
              {/* 补齐到5格 */}
              {attachPopup.images.length > 0 && attachPopup.images.length < 5 && Array.from({ length: 5 - attachPopup.images.length }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square bg-slate-50 rounded border border-dashed border-slate-200 flex items-center justify-center">
                  <span className="text-slate-300 text-[10px]">图片{attachPopup.images.length + i + 1}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setAttachPopup({ open: false, images: [] })} className="mt-4 w-full py-2 bg-slate-100 rounded font-bold text-sm">关闭</button>
          </div>
        </div>
      )}

      {/* 放弃接款原因弹窗 */}
      {abandonModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAbandonModal({ open: false, styleId: '', reason: '' })}></div>
          <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-md w-full animate-in zoom-in-95">
            <h3 className="font-bold text-lg text-navy-700 mb-4">放弃接款</h3>
            <p className="text-sm text-slate-500 mb-3">请输入放弃原因（必填）：</p>
            <textarea
              className="w-full border border-slate-300 rounded-lg p-3 text-sm min-h-[100px] focus:outline-none focus:border-primary"
              placeholder="请说明放弃接款的原因..."
              value={abandonModal.reason}
              onChange={e => setAbandonModal(prev => ({ ...prev, reason: e.target.value }))}
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setAbandonModal({ open: false, styleId: '', reason: '' })} className="flex-1 py-2 bg-slate-100 rounded font-bold text-sm">取消</button>
              <button onClick={handleAbandonStyle} className="flex-1 py-2 bg-red-500 text-white rounded font-bold text-sm hover:bg-red-600">确认放弃</button>
            </div>
          </div>
        </div>
      )}

      {/* 公池抽屉 */}
      {publicDrawer && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPublicDrawer(false)}></div>
          <div className="relative w-full max-w-2xl h-full bg-white shadow-2xl animate-in slide-in-from-right">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-lg text-navy-700">公池款式 ({sortedPublicStyles.length})</h3>
              <button onClick={() => setPublicDrawer(false)} className="material-symbols-outlined text-slate-400 hover:text-slate-600">close</button>
            </div>
            <div className="p-4 overflow-y-auto h-[calc(100%-60px)]">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {sortedPublicStyles.map(style => (
                  <div key={style.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col group">
                    <div className="relative aspect-[3/4] bg-slate-100 overflow-hidden">
                      <img src={style.image_url || ''} alt={style.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                    <div className="p-2 flex flex-col flex-1">
                      <h4 className="font-bold text-navy-700 text-xs truncate">{style.name}</h4>
                      <div className="flex items-center gap-1 mt-1 mb-2">
                        <span className="text-[10px] font-bold text-primary">{style.intent_count}/{style.max_intents}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 mt-auto">
                        <button
                          onClick={() => handleExpressIntent(style)}
                          disabled={style.intent_count >= style.max_intents || processingId === style.id}
                          className={`border border-primary/30 text-primary hover:bg-primary/5 py-1 rounded text-[9px] font-bold transition-colors disabled:opacity-50 ${processingId === style.id ? 'cursor-not-allowed opacity-50' : ''}`}
                        >
                          {processingId === style.id ? '提交中...' : '意向'}
                        </button>
                        <button
                          onClick={() => handleConfirmPublicStyle(style)}
                          disabled={processingId === style.id}
                          className={`bg-primary text-white py-1 rounded font-bold text-[9px] hover:bg-blue-600 shadow-sm transition-colors ${processingId === style.id ? 'bg-slate-400 cursor-not-allowed hover:bg-slate-400' : ''}`}
                        >
                          {processingId === style.id ? '接款中...' : '接款'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StyleWorkbench;
