
import React, { useState, useEffect, useMemo } from 'react';
import { RequestRecord, PricingDetail } from '../types';
import { getRequestRecords, submitSecondaryReview } from '../services/requestService';
import { RequestRecord as DBRequestRecord } from '../lib/supabase';

interface Props {
  onNewRequest: () => void;
}

// 转换数据库格式到前端格式
function toRequestRecord(r: DBRequestRecord): RequestRecord {
  return {
    id: r.id,
    type: r.type,
    subType: r.sub_type || '',
    targetCodes: r.target_codes || [],
    submitTime: new Date(r.submit_time).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }).replace(/\//g, '-'),
    status: r.status,
    pricingDetails: r.pricing_details as PricingDetail[] | undefined,
    isUrgent: r.is_urgent
  };
}

// 异常类型映射：用于显示关联代码 Label
const anomalyCodeLabels: Record<string, string> = {
  '尺码问题': '商品SPU',
  '申请下架': '商品SKC',
  '图片异常': '商品SKC',
  '大货异常': 'WB单号',
};

const RequestWorkbench: React.FC<Props> = ({ onNewRequest }) => {
  const [selectedRequest, setSelectedRequest] = useState<RequestRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<RequestRecord[]>([]);
  const [secondPrices, setSecondPrices] = useState<Record<string, string>>({});
  const [secondReasons, setSecondReasons] = useState<Record<string, string>>({});
  const [submittedSKCs, setSubmittedSKCs] = useState<Set<string>>(new Set());
  const [processingSKCs, setProcessingSKCs] = useState<Set<string>>(new Set()); // 正在处理中的 SKC

  // 搜索状态
  const [searchModule, setSearchModule] = useState('');
  const [searchSubType, setSearchSubType] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const [searchStatus, setSearchStatus] = useState('');

  // 确认/拒绝弹窗状态
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; record: RequestRecord | null; action: 'accept' | 'reject' }>({ show: false, record: null, action: 'accept' });
  const [rejectReason, setRejectReason] = useState('');

  // 加载数据
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // 获取当前商家店铺名称
        const userData = localStorage.getItem('merchantUser');
        const user = userData ? JSON.parse(userData) : null;
        // 优先取 shop_name，其次取 shops[0].shop_name，最后取 name (测试账号)
        const shopName = user?.shop_name || user?.shops?.[0]?.shop_name || user?.name;

        const data = await getRequestRecords(shopName);
        setRecords(data.map(toRequestRecord));
      } catch (err) {
        console.error('Error loading request records:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // 过滤记录
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // 支持款式类筛选
      const typeLabel = r.type === 'pricing' ? '核价类' : r.type === 'style' ? '款式类' : '异常类';
      if (searchModule && typeLabel.indexOf(searchModule) === -1) return false;
      if (searchSubType && !r.subType.includes(searchSubType)) return false;
      if (searchCode && !r.targetCodes.some(c => c.includes(searchCode))) return false;
      if (searchStatus) {
        // 支持新状态筛选
        const statusMap: Record<string, string> = {
          processing: '处理中',
          pending_confirm: '待确认',
          pending_recheck: '待复核',
          completed: '已完成',
          rejected: '已驳回',
          viewed: '已查看'
        };
        if (statusMap[r.status] !== searchStatus) return false;
      }
      return true;
    });
  }, [records, searchModule, searchSubType, searchCode, searchStatus]);

  const handleSecondarySubmit = async (recordId: string, skc: string) => {
    const price = parseFloat(secondPrices[skc] || '0');
    const reason = secondReasons[skc] || '';
    if (!price || !reason) {
      alert('请填写二次申请价格和理由');
      return;
    }

    setProcessingSKCs(prev => new Set(prev).add(skc));
    try {
      const success = await submitSecondaryReview(recordId, skc, price, reason);
      if (success) {
        setSubmittedSKCs(prev => new Set(prev).add(skc));
        // 局部更新：不再重新拉取 getRequestRecords()，直接修改本地 records 状态
        setRecords(prev => prev.map(rec => {
          if (rec.id !== recordId) return rec;
          return {
            ...rec,
            pricingDetails: rec.pricingDetails?.map(d =>
              d.skc === skc ? { ...d, status: '复核中' as const, secondPrice: price, secondReason: reason } : d
            )
          };
        }));
      }
    } catch (err) {
      console.error('Submit failed:', err);
      alert('提交失败，请重试');
    } finally {
      setProcessingSKCs(prev => {
        const next = new Set(prev);
        next.delete(skc);
        return next;
      });
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      processing: 'bg-amber-50 text-amber-600 border-amber-200',
      pending_confirm: 'bg-blue-50 text-blue-600 border-blue-200',  // 待确认
      pending_recheck: 'bg-orange-50 text-orange-600 border-orange-200',  // 待复核
      completed: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      rejected: 'bg-red-50 text-red-600 border-red-200',
      applying: 'bg-blue-50 text-blue-600 border-blue-200',
      reviewing: 'bg-purple-50 text-purple-600 border-purple-200',
    };
    const labels: Record<string, string> = {
      processing: '处理中',
      pending_confirm: '待确认',  // 买手初核完成，等待商家确认
      pending_recheck: '待复核',  // 商家拒绝，等待买手复核
      completed: '已完成',
      rejected: '已驳回',
      applying: '申请中',
      reviewing: '复核中'
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${colors[status] || colors.processing}`}>
        {labels[status] || status}
      </span>
    );
  };

  // 商家确认/拒绝初核价格
  const handleMerchantConfirm = async () => {
    if (!confirmModal.record) return;

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001';

    try {
      const res = await fetch(`${API_BASE}/api/requests/${confirmModal.record.id}/merchant-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: confirmModal.action,
          rejectReason: confirmModal.action === 'reject' ? rejectReason : undefined
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`操作失败: ${err.error}`);
        return;
      }

      // 更新本地状态
      const newStatus = confirmModal.action === 'accept' ? 'completed' : 'pending_recheck';
      setRecords(prev => prev.map(r =>
        r.id === confirmModal.record!.id ? { ...r, status: newStatus } : r
      ));

      setConfirmModal({ show: false, record: null, action: 'accept' });
      setRejectReason('');
      alert(confirmModal.action === 'accept' ? '已接受核价结果' : '已拒绝，等待买手复核');
    } catch (err: any) {
      alert(`请求失败: ${err.message}`);
    }
  };

  // 获取关联代码 Label
  const getCodeLabel = (record: RequestRecord) => {
    if (record.type === 'pricing') return 'SKC';
    return anomalyCodeLabels[record.subType] || 'SKC';
  };

  const CodeTags = ({ codes, label }: { codes: string[]; label: string }) => {
    const displayCount = 3;
    const hasMore = codes.length > displayCount;
    return (
      <div className="relative group cursor-pointer max-w-[240px]">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-slate-400 font-bold">{label}</span>
          <div className="flex flex-wrap gap-1.5">
            {codes.slice(0, displayCount).map(c => (
              <span key={c} className="bg-slate-100 text-[11px] px-1.5 py-0.5 rounded font-mono border border-slate-200 shadow-sm">{c}</span>
            ))}
            {hasMore && (
              <span className="bg-blue-50 text-blue-600 text-[10px] px-1.5 py-0.5 rounded font-bold border border-blue-100 hover:bg-blue-100 transition-colors">
                +{codes.length - displayCount}
              </span>
            )}
          </div>
        </div>
        {hasMore && (
          <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-50 bg-white border border-slate-200 p-3 rounded-xl shadow-xl min-w-[200px] max-w-[300px] max-h-[240px] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="text-[10px] font-bold text-slate-400 mb-2 pb-2 border-b border-slate-100 sticky top-0 bg-white">
              全部关联代码 ({codes.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {codes.map(c => (
                <span key={c} className="bg-slate-50 border border-slate-100 text-[11px] font-mono text-slate-600 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors">
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        <span className="ml-3 text-slate-500">加载中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 bg-accent rounded-full"></div>
          <div>
            <h1 className="text-xl font-bold text-navy-700">业务申请工作台</h1>
            <p className="text-xs text-slate-500">核价申请、异常反馈及进度查询</p>
          </div>
        </div>
        <button onClick={onNewRequest} className="bg-accent text-white px-5 py-2 rounded shadow-sm text-sm font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">add_circle</span>
          发起新申请
        </button>
      </div>

      {/* 搜索框 */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 font-bold">反馈模块</label>
          <select
            className="border border-slate-200 rounded px-2 py-1.5 text-xs min-w-[100px]"
            value={searchModule}
            onChange={e => setSearchModule(e.target.value)}
          >
            <option value="">全部</option>
            <option value="核价类">核价类</option>
            <option value="异常类">异常类</option>
            <option value="款式类">款式类</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 font-bold">二级模块</label>
          <select
            className="border border-slate-200 rounded px-2 py-1.5 text-xs min-w-[120px]"
            value={searchSubType}
            onChange={e => setSearchSubType(e.target.value)}
          >
            <option value="">全部</option>
            {searchModule === '核价类' && (
              <>
                <option value="报价单 (毛织)">报价单 (毛织)</option>
                <option value="报价单 (非毛织)">报价单 (非毛织)</option>
                <option value="同款同价">同款同价</option>
                <option value="申请涨价">申请涨价</option>
              </>
            )}
            {searchModule === '异常类' && (
              <>
                <option value="尺码问题">尺码问题</option>
                <option value="申请下架">申请下架</option>
                <option value="图片异常">图片异常</option>
                <option value="大货异常">大货异常</option>
              </>
            )}
            {!searchModule && (
              <>
                <option value="报价单 (毛织)">报价单 (毛织)</option>
                <option value="报价单 (非毛织)">报价单 (非毛织)</option>
                <option value="同款同价">同款同价</option>
                <option value="申请涨价">申请涨价</option>
                <option value="尺码问题">尺码问题</option>
                <option value="申请下架">申请下架</option>
                <option value="图片异常">图片异常</option>
                <option value="大货异常">大货异常</option>
                <option value="申请发款">申请发款</option>
              </>
            )}
            {searchModule === '款式类' && (
              <>
                <option value="申请发款">申请发款</option>
              </>
            )}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 font-bold">关联代码</label>
          <input
            type="text"
            className="border border-slate-200 rounded px-2 py-1.5 text-xs min-w-[120px]"
            placeholder="SKC/SPU/WB..."
            value={searchCode}
            onChange={e => setSearchCode(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-slate-500 font-bold">状态</label>
          <select
            className="border border-slate-200 rounded px-2 py-1.5 text-xs min-w-[100px]"
            value={searchStatus}
            onChange={e => setSearchStatus(e.target.value)}
          >
            <option value="">全部</option>
            <option value="处理中">处理中</option>
            <option value="待确认">待确认</option>
            <option value="待复核">待复核</option>
            <option value="已完成">已完成</option>
            <option value="已驳回">已驳回</option>
            <option value="已查看">已查看</option>
          </select>
        </div>
        <button
          onClick={() => { setSearchModule(''); setSearchSubType(''); setSearchCode(''); setSearchStatus(''); }}
          className="px-3 py-1.5 text-xs text-slate-500 hover:text-primary border border-slate-200 rounded"
        >
          重置
        </button>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase font-bold">
              <tr>
                <th className="px-6 py-4">申请编号</th>
                <th className="px-6 py-4">反馈模块</th>
                <th className="px-6 py-4">二级模块</th>
                <th className="px-6 py-4">关联代码</th>
                <th className="px-6 py-4">提交时间</th>
                <th className="px-6 py-4">状态</th>
                <th className="px-6 py-4 text-right w-[160px]">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map(record => (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-navy-700 font-bold">
                    {record.id.slice(0, 12)}
                    {record.isUrgent && <span className="ml-2 text-white bg-red-500 px-1 py-0.5 rounded text-[10px]">加急</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${record.type === 'pricing' ? 'text-blue-700 bg-blue-50' : 'text-purple-700 bg-purple-50'}`}>
                      {record.type === 'pricing' ? '核价类' : '异常类'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-700 font-medium">{record.subType}</td>
                  <td className="px-6 py-4"><CodeTags codes={record.targetCodes} label={getCodeLabel(record)} /></td>
                  <td className="px-6 py-4 text-slate-500 text-xs">{record.submitTime}</td>
                  <td className="px-6 py-4"><StatusBadge status={record.status} /></td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-2 justify-end">
                      {record.type === 'pricing' && (
                        <button onClick={() => setSelectedRequest(record)} className="text-accent hover:underline font-bold text-xs">查看详情</button>
                      )}
                      {/* 待确认状态：显示确认/拒绝按钮 */}
                      {record.status === 'pending_confirm' && (
                        <>
                          <button
                            onClick={() => setConfirmModal({ show: true, record, action: 'accept' })}
                            className="bg-emerald-500 text-white px-2 py-1 rounded text-xs font-bold hover:bg-emerald-600"
                          >
                            接受
                          </button>
                          <button
                            onClick={() => setConfirmModal({ show: true, record, action: 'reject' })}
                            className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold hover:bg-red-600"
                          >
                            拒绝
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    暂无申请记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pricing Detail Modal */}
      {selectedRequest && selectedRequest.type === 'pricing' && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm" onClick={() => setSelectedRequest(null)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-lg text-navy-700">核价详情: {selectedRequest.id.slice(0, 12)}</h3>
              <button onClick={() => setSelectedRequest(null)} className="material-symbols-outlined text-slate-400">close</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-10 custom-scrollbar">
              {/* Primary Results */}
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-l-4 border-blue-500 pl-3">初次核价结果</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500">
                      <tr>
                        <th className="px-4 py-3">SKC</th>
                        <th className="px-4 py-3">申请价格</th>
                        <th className="px-4 py-3">核价师价格</th>
                        <th className="px-4 py-3">申请情况</th>
                        <th className="px-4 py-3">最终时间</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedRequest.pricingDetails?.map(d => (
                        <tr key={d.skc}>
                          <td className="px-4 py-3 font-mono font-bold">{d.skc}</td>
                          <td className="px-4 py-3">¥ {d.appliedPrice}</td>
                          <td className="px-4 py-3">¥ {d.buyerPrice || '-'}</td>
                          <td className="px-4 py-3 font-bold">
                            <span className={d.status === '成功' ? 'text-emerald-600' : d.status === '失败' ? 'text-red-500' : 'text-amber-500'}>{d.status}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-400">{d.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Secondary Review */}
              {selectedRequest.pricingDetails?.some(d => d.status === '失败') && (
                <div>
                  <h4 className="text-xs font-black text-red-500 uppercase tracking-widest mb-4 border-l-4 border-red-500 pl-3">失败复核 (二次申请)</h4>
                  <div className="border border-red-100 rounded-xl overflow-hidden bg-red-50/20">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-red-50 border-b border-red-100 font-bold text-slate-600">
                        <tr>
                          <th className="px-4 py-3">SKC</th>
                          <th className="px-4 py-3">二次申请价格</th>
                          <th className="px-4 py-3">申请理由</th>
                          <th className="px-4 py-3 text-center">操作</th>
                          <th className="px-4 py-3">申请状态</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-50">
                        {selectedRequest.pricingDetails?.filter(d => d.status === '失败').map(d => (
                          <tr key={d.skc}>
                            <td className="px-4 py-3 font-mono font-bold">{d.skc}</td>
                            <td className="px-4 py-3">
                              {submittedSKCs.has(d.skc) ? (
                                <span className="text-slate-500">¥ {secondPrices[d.skc] || '-'}</span>
                              ) : (
                                <input
                                  type="number"
                                  className="w-20 border-slate-200 rounded text-xs p-1"
                                  placeholder="¥"
                                  value={secondPrices[d.skc] || ''}
                                  onChange={e => setSecondPrices(prev => ({ ...prev, [d.skc]: e.target.value }))}
                                />
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {submittedSKCs.has(d.skc) ? (
                                <span className="text-slate-500">{secondReasons[d.skc] || '-'}</span>
                              ) : (
                                <input
                                  type="text"
                                  className="w-full border-slate-200 rounded text-xs p-1"
                                  placeholder="请详细填写理由..."
                                  value={secondReasons[d.skc] || ''}
                                  onChange={e => setSecondReasons(prev => ({ ...prev, [d.skc]: e.target.value }))}
                                />
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {submittedSKCs.has(d.skc) ? (
                                <span className="text-emerald-600 font-bold text-[10px]">已提交</span>
                              ) : (
                                <button
                                  onClick={() => handleSecondarySubmit(selectedRequest.id, d.skc)}
                                  disabled={processingSKCs.has(d.skc)}
                                  className="bg-navy-700 text-white px-3 py-1 rounded font-bold hover:bg-navy-800 disabled:opacity-50 flex items-center gap-1 justify-center min-w-[50px]"
                                >
                                  {processingSKCs.has(d.skc) ? (
                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                  ) : '提交'}
                                </button>
                              )}
                            </td>
                            <td className="px-4 py-3 font-bold text-purple-600 italic">
                              {submittedSKCs.has(d.skc) ? '复核中' : '待提交'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button onClick={() => setSelectedRequest(null)} className="px-6 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold">关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* Style Application Detail Modal */}
      {selectedRequest && selectedRequest.type === 'style' && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm" onClick={() => setSelectedRequest(null)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-lg text-navy-700">款式申请详情: {selectedRequest.id.slice(0, 12)}</h3>
              <button onClick={() => setSelectedRequest(null)} className="material-symbols-outlined text-slate-400">close</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* 基本信息 */}
              <div>
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 border-l-4 border-purple-500 pl-3">基本信息</h4>
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
                  <div>
                    <span className="text-xs text-slate-500">店铺名称</span>
                    <p className="font-bold text-navy-700 mt-1">{selectedRequest.targetCodes[0] || '未知店铺'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">提交时间</span>
                    <p className="font-mono text-sm text-slate-600 mt-1">{selectedRequest.submitTime}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">状态</span>
                    <p className="mt-1">
                      <span className={`px-2 py-1 text-xs font-bold rounded ${selectedRequest.status === 'viewed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                        {selectedRequest.status === 'viewed' ? '已查看' : '待查看'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* 款式图片 */}
              {selectedRequest.pricingDetails && selectedRequest.pricingDetails[0]?.images && (
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 border-l-4 border-purple-500 pl-3">款式图片</h4>
                  <div className="grid grid-cols-5 gap-3">
                    {selectedRequest.pricingDetails[0].images.filter((img: string) => img).map((img: string, idx: number) => (
                      <div key={idx} className="aspect-square rounded-lg overflow-hidden border-2 border-slate-200 hover:border-purple-400 transition-colors">
                        <img src={img} alt={`款式图${idx + 1}`} className="w-full h-full object-cover cursor-pointer" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 价格信息 */}
              <div className="bg-slate-50 p-4 rounded-lg mt-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 border-l-4 border-purple-500 pl-3">价格详情</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="detail-item">
                    <label className="text-xs text-slate-500">申请价格</label>
                    <p className="font-bold text-navy-700 mt-1">¥{selectedRequest.pricingDetails[0]?.appliedPrice}</p>
                  </div>
                  {selectedRequest.initial_price && (
                    <div className="detail-item">
                      <label className="text-xs text-slate-500">初核价格</label>
                      <p className="font-bold text-emerald-600 mt-1">¥{selectedRequest.initial_price}</p>
                    </div>
                  )}
                  {selectedRequest.final_price && (
                    <div className="detail-item">
                      <label className="text-xs text-slate-500">最终价格</label>
                      <p className="font-bold text-red-600 mt-1">¥{selectedRequest.final_price}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 备注信息 */}
              {selectedRequest.pricingDetails && selectedRequest.pricingDetails[0]?.remark && (
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 border-l-4 border-purple-500 pl-3">备注信息</h4>
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedRequest.pricingDetails[0].remark}</p>
                  </div>
                </div>
              )}
            </div>

            {/* 操作按钮 */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-600 hover:bg-white transition-colors"
              >
                关闭
              </button>
              {selectedRequest.status !== 'viewed' && (
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch(`/api/requests/${selectedRequest.id}/status`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'viewed' })
                      });
                      if (response.ok) {
                        // 更新本地状态
                        setRecords(prev => prev.map(r =>
                          r.id === selectedRequest.id ? { ...r, status: 'viewed' } : r
                        ));
                        setSelectedRequest({ ...selectedRequest, status: 'viewed' });
                        alert('已确认查看');
                      }
                    } catch (err) {
                      console.error('确认失败:', err);
                      alert('确认失败，请重试');
                    }
                  }}
                  className="px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 transition-colors shadow-sm"
                >
                  确认
                </button>
              )}
            </div>
          </div>
        </div >
      )}

      {/* 确认/拒绝核价弹窗 */}
      {
        confirmModal.show && confirmModal.record && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm" onClick={() => setConfirmModal({ show: false, record: null, action: 'accept' })}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-lg text-navy-700">
                  {confirmModal.action === 'accept' ? '确认接受核价结果' : '拒绝核价结果'}
                </h3>
                <button onClick={() => setConfirmModal({ show: false, record: null, action: 'accept' })} className="material-symbols-outlined text-slate-400">close</button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-600">工单编号: <span className="font-mono font-bold">{confirmModal.record.id.slice(0, 12)}</span></p>
                </div>

                {confirmModal.action === 'accept' ? (
                  <p className="text-sm text-slate-600">确认接受此核价结果？接受后工单将标记为已完成。</p>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">请填写拒绝原因，买手将进行复核：</p>
                    <textarea
                      className="w-full border border-slate-200 rounded-lg p-3 text-sm"
                      rows={3}
                      placeholder="请详细说明拒绝原因..."
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                <button
                  onClick={() => setConfirmModal({ show: false, record: null, action: 'accept' })}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-600"
                >
                  取消
                </button>
                <button
                  onClick={handleMerchantConfirm}
                  className={`px-5 py-2 rounded-lg text-sm font-bold text-white ${confirmModal.action === 'accept' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  {confirmModal.action === 'accept' ? '确认接受' : '确认拒绝'}
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default RequestWorkbench;
