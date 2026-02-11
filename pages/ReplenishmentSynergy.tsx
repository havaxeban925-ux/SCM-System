
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { ReplenishmentItem } from '../types';
import { getRestockOrders, updateQuantity, confirmOrder, shipOrder, confirmArrival } from '../services/restockService';
import { RestockOrder } from '../lib/supabase';
import { API_BASE } from '../lib/api';

// 转换数据库格式到前端格式

function toReplenishmentItem(r: RestockOrder): ReplenishmentItem {
  let status: ReplenishmentItem['status'] = '待商家接单';

  // Map DB status to UI status
  const dbStatus = String(r.status);
  switch (dbStatus) {
    case 'pending': status = '待商家接单'; break;
    case 'reviewing': status = '待买手复核'; break;
    case 'producing': status = '生产中'; break;
    case 'shipped': status = '待买手确认入仓'; break;
    case 'completed': status = '已确认入仓'; break;
    case 'cancelled': status = '已取消' as any; break;
    case 'rejected': status = '已拒绝' as any; break;
    default: status = '待商家接单';
  }

  return {
    id: r.skc_code,
    name: r.name || '',
    image: r.image_url || '',
    planQty: r.plan_quantity,
    acceptedQty: r.actual_quantity ?? r.plan_quantity,
    status: status,
    expiryDate: r.created_at ? new Date(r.created_at).toLocaleString() : '',
    reductionReason: r.reduction_reason,
    // _dbId NOT included here, handled by caller
  };
}

// 扩展类型以包含数据库ID和加急状态
interface ExtendedReplenishmentItem extends ReplenishmentItem {
  _dbId?: string;
  reductionReason?: string;
  is_urgent?: boolean;
  shopId?: string;
}

const ReplenishmentSynergy: React.FC = () => {
  const [items, setItems] = useState<ExtendedReplenishmentItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('全部状态');
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载数据
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await getRestockOrders();
        setItems(data.map(r => ({
          ...toReplenishmentItem(r),
          _dbId: r.id,
          is_urgent: (r as any).is_urgent || false,
          shopId: (r as any).shop_code || (r as any).shop_id || '' // Prioritize shop_code
        })));
      } catch (err) {
        console.error('Error loading restock orders:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredItems = useMemo(() => {
    let filtered = activeTab === '全部状态' ? items : items.filter(item => item.status === activeTab);
    // 加急置顶
    return filtered.sort((a, b) => (b.is_urgent ? 1 : 0) - (a.is_urgent ? 1 : 0));
  }, [items, activeTab]);

  const handleUpdateQty = (id: string, qty: number) => {
    setItems(items.map(i => i.id === id ? { ...i, acceptedQty: qty } : i));
  };

  const handleReductionSubmit = async (item: ExtendedReplenishmentItem) => {
    if (!item._dbId) return;
    if (item.acceptedQty < item.planQty && !item.reductionReason) {
      alert('请填写砍量理由。');
      return;
    }

    // 先更新数量
    await updateQuantity(item._dbId, item.acceptedQty, item.reductionReason);
    // 再确认接单
    const success = await confirmOrder(item._dbId);
    if (success) {
      const newStatus = item.acceptedQty < item.planQty ? '待买手复核' : '生产中';
      setItems(items.map(i => i.id === item.id ? { ...i, status: newStatus as ReplenishmentItem['status'] } : i));
      alert('提交成功！');
    }
  };

  // 一键导出待提交清单
  const handleExportPendingList = async () => {
    const pendingItems = items.filter(item => item.status === '待商家接单');
    if (pendingItems.length === 0) {
      alert('暂无待提交的订单');
      return;
    }
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('待提交清单');
    sheet.columns = [
      { header: '店铺ID', key: 'shopId', width: 32 },
      { header: 'SKC编码', key: 'skc', width: 20 },
      { header: '计划数量', key: 'planQty', width: 12 },
      { header: '接单数量', key: 'acceptedQty', width: 12 },
      { header: '砍量理由', key: 'reductionReason', width: 30 },
    ];

    pendingItems.forEach(item => {
      sheet.addRow({
        shopId: item.shopId || '',
        skc: item.id,
        planQty: item.planQty,
        acceptedQty: item.acceptedQty,
        reductionReason: item.reductionReason || ''
      });
    });

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `待提交清单_${new Date().toLocaleDateString()}.xlsx`);
  };

  // 一键导入待提交清单
  const handleImportPendingList = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const sheet = workbook.worksheets[0];

    let imported = 0;
    sheet.eachRow((row, rowNum) => {
      if (rowNum === 1) return; // Skip header
      // Index shifted by 1 because of ShopId column
      const skc = String(row.getCell(2).value || '').trim();
      const planQty = parseInt(String(row.getCell(3).value || '0'));
      const acceptedQty = parseInt(String(row.getCell(4).value || '0'));
      const reason = String(row.getCell(5).value || '').trim();

      if (skc) {
        // 校验：如果接单数量小于计划数量，必须有砍量理由
        if (acceptedQty < planQty && !reason) {
          alert(`导入失败：第 ${rowNum} 行 (SKC: ${skc}) 接单数量小于计划数量，必须填写砍量理由。`);
          throw new Error('Validation failed'); // Stop iteration
        }

        // 更新对应SKC
        setItems(prev => prev.map(item =>
          item.id === skc ? { ...item, acceptedQty, reductionReason: reason } : item
        ));
        imported++;
      }
    });

    alert(`导入完成！更新了 ${imported} 条记录。`);
    e.target.value = '';
  };

  const handleShip = async (item: ExtendedReplenishmentItem) => {
    if (!item._dbId) return;
    const wbNumber = prompt('请输入物流单号(WB号)：');
    if (!wbNumber) return;

    const success = await shipOrder(item._dbId, wbNumber);
    if (success) {
      setItems(items.map(i => i.id === item.id ? { ...i, status: '待买手确认入仓' as ReplenishmentItem['status'] } : i));
      alert('已发货。');
    }
  };

  // Removed: handleBuyerConfirm is now performed by buyer on their page

  const statusCount = (status: string) => items.filter(i => i.status === status).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        <span className="ml-3 text-slate-500">加载中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in zoom-in-95 duration-500">
      <div className="flex flex-wrap justify-between items-end gap-6 mb-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-navy-700 text-3xl font-black leading-tight tracking-tight">大货生产-补货协同</h1>
          <p className="text-slate-500 text-sm">监控补货进度，处理砍量并跟踪物流。</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 rounded-lg h-10 px-5 bg-white border border-slate-200 text-sm font-bold hover:bg-slate-50 transition-colors">
            <span className="material-symbols-outlined text-lg">upload</span>
            <span>一键导入待提交清单</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleImportPendingList}
          />
          <button onClick={handleExportPendingList} className="flex items-center gap-2 rounded-lg h-10 px-5 bg-white border border-slate-200 text-sm font-bold hover:bg-slate-50 transition-colors">
            <span className="material-symbols-outlined text-lg">download</span>
            <span>一键导出待提交清单</span>
          </button>
        </div>
      </div>

      {/* Classic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex flex-col gap-3 rounded-xl p-6 bg-white border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium">待备货清单</p>
          <p className="text-navy-700 text-4xl font-black">{statusCount('待商家接单') + statusCount('待买手复核')}</p>
        </div>
        <div className="flex flex-col gap-3 rounded-xl p-6 bg-white border-l-4 border-l-primary border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium">砍量协商中</p>
          <p className="text-navy-700 text-4xl font-black">{statusCount('待买手复核')}</p>
        </div>
        <div className="flex flex-col gap-3 rounded-xl p-6 bg-white border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium">待买手确认入仓</p>
          <p className="text-navy-700 text-4xl font-black">{statusCount('待买手确认入仓')}</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        {['全部状态', '待商家接单', '待买手复核', '生产中', '待买手确认入仓', '已确认入仓', '已拒绝', '已取消'].map(status => (
          <button
            key={status}
            onClick={() => setActiveTab(status)}
            className={`flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-all ${activeTab === status ? 'bg-primary text-white shadow-sm font-bold' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <span>{status}</span>
            {statusCount(status) > 0 && status !== '全部状态' && (
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${activeTab === status ? 'bg-white text-primary' : 'bg-slate-100 text-slate-500'}`}>
                {statusCount(status)}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[280px]">SKC 信息</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">计划数</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">商家接单数</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">当前状态</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">下单时间</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-bold text-slate-700">{item.id}</div>
                      <div className="text-xs text-slate-500 mt-1">店铺: <span className="font-mono">{item.shopId || '-'}</span></div>

                      {item.is_urgent && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 mt-1">
                          加急
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm font-bold align-top">{item.planQty}</td>
                  <td className="px-6 py-5 align-top">
                    {item.status === '待商家接单' ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            className="w-20 h-8 border border-slate-200 rounded text-xs px-2 font-bold focus:ring-1 focus:ring-primary"
                            type="number"
                            value={item.acceptedQty}
                            onChange={(e) => handleUpdateQty(item.id, parseInt(e.target.value) || 0)}
                          />
                          <button onClick={() => handleUpdateQty(item.id, item.planQty)} className="text-[10px] text-primary hover:underline font-bold">一键应用计划数</button>
                        </div>
                        {item.acceptedQty < item.planQty && (
                          <textarea
                            className="w-full text-[10px] border-amber-200 bg-amber-50 rounded p-1.5 min-h-[50px] focus:ring-0"
                            placeholder="请填写砍量理由..."
                            value={item.reductionReason || ''}
                            onChange={(e) => setItems(items.map(i => i.id === item.id ? { ...i, reductionReason: e.target.value } : i))}
                          />
                        )}
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-slate-600">{item.acceptedQty}</span>
                    )}
                  </td>
                  <td className="px-6 py-5 align-top">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border ${item.status === '待商家接单' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        item.status === '待买手复核' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          item.status === '已确认入仓' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            (item.status === '已拒绝' || item.status === '已取消') ? 'bg-red-50 text-red-700 border-red-200' :
                              'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                        {item.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-[11px] text-slate-500 align-top">{item.expiryDate}</td>
                  <td className="px-6 py-5 text-right align-top">
                    <div className="flex flex-col items-end gap-2">
                      {item.status === '待商家接单' && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleReductionSubmit(item)} className="bg-primary text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-600 transition-all shadow-sm">提交接单/申请</button>
                          <button
                            onClick={async () => {
                              const reason = prompt('请输入拒绝理由：');
                              if (reason !== null) {
                                // const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001';
                                const res = await fetch(`${API_BASE}/api/restock/${item._dbId}/reject`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ reason })
                                });
                                if (res.ok) {
                                  setItems(items.map(i => i.id === item.id ? { ...i, status: '已拒绝' as any } : i));
                                  alert('已拒绝接单');
                                }
                              }
                            }}
                            className="bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                          >
                            拒绝接单
                          </button>
                        </div>
                      )}
                      {item.status === '生产中' && (
                        <button onClick={() => handleShip(item)} className="text-primary hover:text-blue-700 text-sm font-bold flex items-center gap-1 group">
                          <span>发货</span>
                          <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">local_shipping</span>
                        </button>
                      )}
                      {item.status === '待买手确认入仓' && (
                        <span className="text-[10px] text-blue-500 font-bold italic">✈️ 已发货，等待买手确认入仓</span>
                      )}
                      {item.status === '已确认入仓' && <span className="text-[10px] text-emerald-600 font-bold italic">✅ 入仓成功</span>}
                      {item.status === '待买手复核' && <span className="text-[10px] text-amber-500 font-bold italic">买手审阅中...</span>}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    暂无补货订单
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReplenishmentSynergy;
