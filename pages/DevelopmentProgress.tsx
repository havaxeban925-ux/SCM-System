
import React, { useState, useEffect, useMemo } from 'react';
import { StyleItem } from '../types';
import { getDevelopingStyles, updateDevStatus, requestHelping, uploadSpu, abandonDevelopment, confirmHelpingOk } from '../services/developmentService';
import { StyleDemand } from '../lib/supabase';

interface Props {
  styles: StyleItem[];
  onAbandon: (id: string, reason: string) => void;
  onUpdateStatus: (id: string, status: StyleItem['developmentStatus']) => void;
}

// 方案图片结构
interface DesignScheme {
  name: string;
  images: string[];
}

// 扩展 StyleItem 添加 confirmTime
interface ExtendedStyleItem extends StyleItem {
  confirmTime?: string;
}

// 转换数据库格式到前端格式
function toStyleItem(s: StyleDemand): ExtendedStyleItem {
  return {
    id: s.id,
    name: s.name,
    image: s.image_url || '',
    shopId: s.shop_id || '',
    shopName: s.shop_name || '',
    remark: s.remark || '',
    timestamp: s.timestamp_label || '',
    status: s.status as StyleItem['status'],
    daysLeft: s.days_left,
    developmentStatus: s.development_status as StyleItem['developmentStatus'],
    confirmTime: s.confirm_time,
  };
}

// 计算接款天数
function getDaysSinceConfirm(confirmTime?: string): number {
  if (!confirmTime) return 0;
  const confirmed = new Date(confirmTime);
  const now = new Date();
  return Math.floor((now.getTime() - confirmed.getTime()) / (1000 * 60 * 60 * 24));
}

// 状态显示映射
const statusLabels: Record<string, string> = {
  drafting: '打样中',
  pattern: '打版帮看中',
  helping: '改图帮看中',
  ok: '待上传SPU',
  success: '开发成功'
};

const statusColors: Record<string, string> = {
  drafting: 'bg-slate-50 text-slate-700 border-slate-200',
  pattern: 'bg-purple-50 text-purple-700 border-purple-200',
  helping: 'bg-blue-50 text-blue-700 border-blue-200',
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  success: 'bg-indigo-50 text-indigo-700 border-indigo-200'
};

const DevelopmentProgress: React.FC<Props> = ({ styles: propStyles, onAbandon, onUpdateStatus }) => {
  const [activePopup, setActivePopup] = useState<{ id: string, type: 'helping' | 'pattern' | 'spu' | 'abandon' } | null>(null);
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(true);
  const [styles, setStyles] = useState<ExtendedStyleItem[]>([]);

  // 分页状态 (10款/页)
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // 多方案上传状态
  const [schemes, setSchemes] = useState<DesignScheme[]>([{ name: '方案1', images: [] }]);

  // 加载数据
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await getDevelopingStyles();
        setStyles(data.map(toStyleItem));
      } catch (err) {
        console.error('Error loading developing styles:', err);
        setStyles(propStyles as ExtendedStyleItem[]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // 状态统计
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { drafting: 0, pattern: 0, helping: 0, ok: 0, success: 0 };
    styles.forEach(s => {
      const status = s.developmentStatus || 'drafting';
      if (counts[status] !== undefined) counts[status]++;
    });
    return counts;
  }, [styles]);

  // 分页计算
  const allStyles = styles.length > 0 ? styles : (propStyles as ExtendedStyleItem[]);
  const totalPages = Math.ceil(allStyles.length / PAGE_SIZE) || 1;
  const displayStyles = allStyles.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // 添加方案
  const addScheme = () => {
    if (schemes.length >= 3) return;
    setSchemes([...schemes, { name: `方案${schemes.length + 1}`, images: [] }]);
  };

  // 模拟添加图片
  const addImageToScheme = (schemeIndex: number) => {
    if (schemes[schemeIndex].images.length >= 3) return;
    const newSchemes = [...schemes];
    newSchemes[schemeIndex].images.push(`https://picsum.photos/seed/${Date.now()}/200`);
    setSchemes(newSchemes);
  };

  // 移除图片
  const removeImageFromScheme = (schemeIndex: number, imageIndex: number) => {
    const newSchemes = [...schemes];
    newSchemes[schemeIndex].images.splice(imageIndex, 1);
    setSchemes(newSchemes);
  };

  const resetPopup = () => {
    setActivePopup(null);
    setRemark('');
    setSchemes([{ name: '方案1', images: [] }]);
  };

  // 改图帮看提交
  const handleHelpingSubmit = async () => {
    if (!activePopup) return;
    const hasImages = schemes.some(s => s.images.length > 0);
    if (!hasImages) {
      alert('请至少上传一张图片');
      return;
    }
    const success = await requestHelping(activePopup.id);
    if (success) {
      setStyles(prev => prev.map(s => s.id === activePopup.id ? { ...s, developmentStatus: 'helping' as const } : s));
      onUpdateStatus(activePopup.id, 'helping');
      resetPopup();

      // 模拟3秒后买手确认通过
      setTimeout(async () => {
        await confirmHelpingOk(activePopup.id);
        setStyles(prev => prev.map(s => s.id === activePopup.id ? { ...s, developmentStatus: 'ok' as const } : s));
        onUpdateStatus(activePopup.id, 'ok');
      }, 3000);
    }
  };

  // 打版帮看提交：先显示"打版帮看中"，买手确认后显示"待上传SPU"
  const handlePatternSubmit = async () => {
    if (!activePopup) return;
    const hasImages = schemes.some(s => s.images.length > 0);
    if (!hasImages) {
      alert('请至少上传一张图片');
      return;
    }
    // 更新状态为 pattern（打版帮看中）
    const success = await updateDevStatus(activePopup.id, 'pattern');
    if (success) {
      setStyles(prev => prev.map(s => s.id === activePopup.id ? { ...s, developmentStatus: 'pattern' as const } : s));
      onUpdateStatus(activePopup.id, 'pattern');
      resetPopup();

      // 模拟3秒后买手确认 -> 待上传SPU
      setTimeout(async () => {
        await confirmHelpingOk(activePopup.id);
        setStyles(prev => prev.map(s => s.id === activePopup.id ? { ...s, developmentStatus: 'ok' as const } : s));
        onUpdateStatus(activePopup.id, 'ok');
      }, 3000);
    }
  };

  const handleSpuSubmit = async () => {
    if (!activePopup) return;
    if (!remark.trim()) return alert('请填写 SPU 编码');
    if (confirm('确认提交吗？此操作不可撤回，提交后将进入待审版环节。')) {
      const success = await uploadSpu(activePopup.id, remark);
      if (success) {
        // 问题11修复：提交后保留记录，不再自动移除
        setStyles(prev => prev.map(s => s.id === activePopup.id ? { ...s, developmentStatus: 'success' as const } : s));
        onUpdateStatus(activePopup.id, 'success');
        resetPopup();
        // 已删除自动移除逻辑，SPU上传后记录保留在商家端
      }
    }
  };

  const handleAbandonSubmit = async () => {
    if (!activePopup) return;
    if (!remark.trim()) return alert('请填写放弃原因');
    if (confirm('确认放弃吗？此操作不可撤回，款式将退回后端处理。')) {
      const success = await abandonDevelopment(activePopup.id, remark);
      if (success) {
        setStyles(prev => prev.filter(s => s.id !== activePopup.id));
        onAbandon(activePopup.id, remark);
        resetPopup();
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        <span className="ml-3 text-slate-500">加载中...</span>
      </div>
    );
  }

  // 图片上传组件
  const ImageUploadArea = () => (
    <div className="space-y-4">
      {schemes.map((scheme, sIndex) => (
        <div key={sIndex} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-600">{scheme.name}</span>
            <span className="text-[10px] text-slate-400">{scheme.images.length}/3 张</span>
          </div>
          <div className="flex gap-2">
            {scheme.images.map((img, iIndex) => (
              <div key={iIndex} className="relative w-16 h-16 rounded border border-slate-200 overflow-hidden group">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImageFromScheme(sIndex, iIndex)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-white text-sm">close</span>
                </button>
              </div>
            ))}
            {scheme.images.length < 3 && (
              <button
                onClick={() => addImageToScheme(sIndex)}
                className="w-16 h-16 border-2 border-dashed border-slate-300 rounded flex flex-col items-center justify-center text-slate-400 hover:border-primary hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                <span className="text-[9px]">添加</span>
              </button>
            )}
          </div>
        </div>
      ))}
      {schemes.length < 3 && (
        <button
          onClick={addScheme}
          className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-xs text-slate-500 hover:border-primary hover:text-primary transition-colors"
        >
          + 添加方案 (最多3个)
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-8 animate-in zoom-in-95 duration-500">
      <div className="flex flex-col gap-1 mb-6">
        <h1 className="text-navy-700 text-3xl font-black leading-tight tracking-tight">开发进度</h1>
        <p className="text-slate-500 text-sm">跟踪接款样衣打版进度。上传 SPU 后视为开发成功。</p>
      </div>

      {/* 状态统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="flex flex-col gap-2 rounded-xl p-4 bg-white border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-xs font-medium">打样中</p>
          <p className="text-navy-700 text-3xl font-black">{statusCounts.drafting}</p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl p-4 bg-white border-l-4 border-l-purple-500 border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-xs font-medium">打版帮看中</p>
          <p className="text-navy-700 text-3xl font-black">{statusCounts.pattern}</p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl p-4 bg-white border-l-4 border-l-blue-500 border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-xs font-medium">改图帮看中</p>
          <p className="text-navy-700 text-3xl font-black">{statusCounts.helping}</p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl p-4 bg-white border-l-4 border-l-emerald-500 border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-xs font-medium">待上传SPU</p>
          <p className="text-navy-700 text-3xl font-black">{statusCounts.ok}</p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl p-4 bg-white border-l-4 border-l-indigo-500 border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-xs font-medium">开发成功</p>
          <p className="text-navy-700 text-3xl font-black">{statusCounts.success}</p>
        </div>
      </div>

      {allStyles.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-20 flex flex-col items-center justify-center text-slate-400">
          <span className="material-symbols-outlined text-5xl mb-4">inventory_2</span>
          <p className="font-bold text-slate-500">暂无正在开发的款式</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">款式信息</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">当前阶段</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">买手备注</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">买手反馈</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayStyles.map(style => {
                  const days = getDaysSinceConfirm(style.confirmTime);
                  const isOverdue = days > 7;
                  return (
                    <tr key={style.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="size-16 rounded bg-slate-100 bg-cover bg-center border border-slate-200" style={{ backgroundImage: `url(${style.image})` }}></div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-navy-700">{style.name}</span>
                            <span className="text-[10px] text-slate-500 uppercase font-mono mt-0.5">{style.id.slice(0, 8)}</span>
                            {/* 接款时间（天数） */}
                            <span className={`text-[10px] mt-1 font-medium ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
                              接款 {days} 天
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border ${statusColors[style.developmentStatus || 'drafting']}`}>
                          {statusLabels[style.developmentStatus || 'drafting']}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-xs text-slate-500 max-w-[200px] line-clamp-2">{style.remark}</p>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-xs text-slate-400 italic">
                          {style.developmentStatus === 'ok' ? '买手反馈：已确认，请尽快上传 SPU。' : '暂无最新留言'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex gap-2 flex-wrap justify-end">
                            <button onClick={() => setActivePopup({ id: style.id, type: 'helping' })} className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded text-[11px] font-bold border border-blue-200 hover:bg-blue-100">改图帮看</button>
                            <button onClick={() => setActivePopup({ id: style.id, type: 'pattern' })} className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded text-[11px] font-bold border border-purple-200 hover:bg-purple-100">打版帮看</button>
                            <button onClick={() => setActivePopup({ id: style.id, type: 'spu' })} className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded text-[11px] font-bold border border-emerald-200 hover:bg-emerald-100">上传SPU</button>
                          </div>
                          <button onClick={() => setActivePopup({ id: style.id, type: 'abandon' })} className="text-red-500 hover:text-red-700 text-[11px] font-bold underline">放弃开发</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* 分页控件 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 py-4 border-t border-slate-200">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded text-xs font-bold border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
              >
                上一页
              </button>
              <span className="text-sm text-slate-500">
                第 <span className="font-bold text-navy-700">{currentPage}</span> / {totalPages} 页
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded text-xs font-bold border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
              >
                下一页
              </button>
            </div>
          )}
        </div>
      )}

      {/* 弹窗 */}
      {activePopup && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={resetPopup}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-navy-700 mb-2">
              {activePopup.type === 'helping' ? '改图帮看申请' :
                activePopup.type === 'pattern' ? '打版帮看申请' :
                  activePopup.type === 'spu' ? '上传 SPU 信息' : '放弃开发申请'}
            </h3>
            {activePopup.type === 'abandon' && <p className="text-[10px] text-red-500 font-bold mb-4 uppercase tracking-tighter">* 此操作不可撤回，款式将退回后端处理</p>}
            {activePopup.type === 'spu' && <p className="text-[10px] text-amber-500 font-bold mb-4">* 提交后将进入待审版环节</p>}

            <div className="space-y-4">
              {/* 改图/打版帮看：多方案图片上传 */}
              {(activePopup.type === 'helping' || activePopup.type === 'pattern') && (
                <>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">上传图片 (1-3个方案，每方案1-3张图)</label>
                  <ImageUploadArea />
                </>
              )}

              {/* SPU 或 放弃原因 */}
              {(activePopup.type === 'spu' || activePopup.type === 'abandon') && (
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                    {activePopup.type === 'spu' ? '填写 SPU 编码 (多个请用空格分割)' : '备注/原因说明'}
                  </label>
                  <textarea
                    className="w-full border-slate-200 rounded-lg text-sm p-3 min-h-[100px] focus:ring-primary"
                    placeholder={activePopup.type === 'spu' ? 'SPU001 SPU002...' : '请详细填写理由...'}
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="flex gap-4 mt-8">
              <button
                onClick={
                  activePopup.type === 'helping' ? handleHelpingSubmit :
                    activePopup.type === 'pattern' ? handlePatternSubmit :
                      activePopup.type === 'spu' ? handleSpuSubmit : handleAbandonSubmit
                }
                className={`flex-[2] py-2.5 text-white rounded-xl text-sm font-bold shadow-lg transition-all active:scale-[0.98] ${activePopup.type === 'abandon' ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-blue-600'}`}
              >
                确认提交
              </button>
              <button onClick={resetPopup} className="flex-1 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevelopmentProgress;
