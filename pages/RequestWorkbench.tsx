
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

  // 搜索状态
  const [searchModule, setSearchModule] = useState('');
  const [searchSubType, setSearchSubType] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const [searchStatus, setSearchStatus] = useState('');

  // 加载数据
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await getRequestRecords();
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
      if (searchModule && (r.type === 'pricing' ? '核价类' : '异常类').indexOf(searchModule) === -1) return false;
      if (searchSubType && !r.subType.includes(searchSubType)) return false;
      if (searchCode && !r.targetCodes.some(c => c.includes(searchCode))) return false;
      if (searchStatus) {
        const statusMap: Record<string, string> = { processing: '处理中', completed: '已完成', rejected: '已驳回' };
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
    const success = await submitSecondaryReview(recordId, skc, price, reason);
    if (success) {
      setSubmittedSKCs(prev => new Set(prev).add(skc));
      // 刷新数据
      const data = await getRequestRecords();
      setRecords(data.map(toRequestRecord));
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, string> = {
      processing: 'bg-amber-50 text-amber-600 border-amber-200',
      completed: 'bg-emerald-50 text-emerald-600 border-emerald-200',
      rejected: 'bg-red-50 text-red-600 border-red-200',
      applying: 'bg-blue-50 text-blue-600 border-blue-200',
      reviewing: 'bg-purple-50 text-purple-600 border-purple-200',
    };
    const labels: Record<string, string> = {
      processing: '处理中',
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

  // 获取关联代码 Label
  const getCodeLabel = (record: RequestRecord) => {
    if (record.type === 'pricing') return 'SKC';
    return anomalyCodeLabels[record.subType] || 'SKC';
  };

  const CodeTags = ({ codes, label }: { codes: string[]; label: string }) => {
    const displayCount = 2;
    return (
      <div className="relative group cursor-help">
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] text-slate-400">{label}</span>
          <div className="flex gap-1">
            {codes.slice(0, displayCount).map(c => (
              <span key={c} className="bg-slate-100 text-[10px] px-1.5 py-0.5 rounded font-mono border border-slate-200">{c}</span>
            ))}
            {codes.length > displayCount && <span className="text-[10px] text-slate-400">+{codes.length - displayCount}</span>}
          </div>
        </div>
        {codes.length > displayCount && (
          <div className="absolute left-0 top-full mt-2 hidden group-hover:block z-50 bg-white border border-slate-200 p-2 rounded shadow-xl min-w-[120px]">
            <div className="flex flex-col gap-1">
              {codes.map(c => <span key={c} className="text-[10px] font-mono text-slate-600">{c}</span>)}
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
            <option value="已完成">已完成</option>
            <option value="已驳回">已驳回</option>
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
                <th className="px-6 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map(record => (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-navy-700 font-bold">{record.id.slice(0, 12)}</td>
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
                    {record.type === 'pricing' && (
                      <button onClick={() => setSelectedRequest(record)} className="text-accent hover:underline font-bold text-xs">查看详情</button>
                    )}
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
                                  className="bg-navy-700 text-white px-3 py-1 rounded font-bold hover:bg-navy-800"
                                >
                                  提交
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
    </div>
  );
};

export default RequestWorkbench;
